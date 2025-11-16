import {
  Injectable,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from 'generated/prisma/client';
import { Logger } from 'nestjs-pino';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private logger: Logger,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, fullName } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await this.hashData(password);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
      },
    });

    // Log without PII (email address)
    this.logger.log({
      message: 'New user registered',
      userId: newUser.id,
      role: newUser.role,
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
      message: 'User registered successfully',
    };
  }

  async login(loginDto: LoginDto, deviceInfo?: string, ipAddress?: string) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Prevent timing attacks by always hashing, even if user doesn't exist
    const passwordHash =
      user?.passwordHash ||
      (await this.hashData('dummy-password-to-prevent-timing-attack'));
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    // Use consistent error message to prevent account enumeration
    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);
    const hashedRt = await this.hashData(tokens.refreshToken);

    // Store refresh token with device info for multi-device support
    const refreshExpiry =
      this.config.get<string>('JWT_REFRESH_EXPIRY') || '30d';
    const expiryMs = this.parseExpiryToMilliseconds(refreshExpiry);
    const expiresAt = new Date(Date.now() + expiryMs);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedRt,
        userId: user.id,
        deviceInfo: deviceInfo || 'Unknown Device',
        ipAddress: ipAddress || 'Unknown IP',
        expiresAt,
      },
    });

    // Clean up expired tokens for this user
    await this.cleanupExpiredTokens(user.id);

    this.logger.log({
      message: 'User logged in',
      userId: user.id,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(
    userId: string,
    rt: string,
    deviceInfo?: string,
    ipAddress?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException('Invalid refresh token');
    }

    // Find matching refresh token in database
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: user.id,
        expiresAt: { gte: new Date() },
      },
    });

    let isValidToken = false;
    let validTokenId: string | null = null;

    // Check if provided token matches any stored token
    for (const storedToken of storedTokens) {
      const matches = await bcrypt.compare(rt, storedToken.token);
      if (matches) {
        isValidToken = true;
        validTokenId = storedToken.id;
        break;
      }
    }

    if (!isValidToken || !validTokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user);
    const hashedRt = await this.hashData(tokens.refreshToken);

    // Update the refresh token (rotation)
    const refreshExpiry =
      this.config.get<string>('JWT_REFRESH_EXPIRY') || '30d';
    const expiryMs = this.parseExpiryToMilliseconds(refreshExpiry);
    const expiresAt = new Date(Date.now() + expiryMs);

    await this.prisma.refreshToken.update({
      where: { id: validTokenId },
      data: {
        token: hashedRt,
        deviceInfo: deviceInfo || 'Unknown Device',
        ipAddress: ipAddress || 'Unknown IP',
        expiresAt,
        updatedAt: new Date(),
      },
    });

    return tokens;
  }

  async logout(userId: string, rt?: string) {
    if (rt) {
      // Find and delete the specific refresh token
      const storedTokens = await this.prisma.refreshToken.findMany({
        where: { userId },
      });

      for (const storedToken of storedTokens) {
        const matches = await bcrypt.compare(rt, storedToken.token);
        if (matches) {
          await this.prisma.refreshToken.delete({
            where: { id: storedToken.id },
          });
          break;
        }
      }
    } else {
      // Logout from all devices
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return {
      message: 'Logged out successfully',
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    return safeUser;
  }

  // Helper Methods

  async hashData(data: string): Promise<string> {
    const salt = await bcrypt.genSalt(12); // Use 12 rounds for 2025 security standards
    return bcrypt.hash(data, salt);
  }

  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY') || '15m';
    const refreshExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      // @ts-expect-error - JWT library type definition issue with expiresIn accepting string
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiry,
      }),
      // @ts-expect-error - JWT library type definition issue with expiresIn accepting string
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiry,
      }),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }

  private async cleanupExpiredTokens(userId: string) {
    // Remove expired refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });

    // Optional: Limit to 5 most recent tokens per user
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 5,
    });

    if (tokens.length > 0) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          id: { in: tokens.map((t) => t.id) },
        },
      });
    }
  }

  private parseExpiryToMilliseconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const units: { [key: string]: number } = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * units[unit];
  }
}
