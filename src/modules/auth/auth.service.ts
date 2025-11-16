import { Injectable, ConflictException, ForbiddenException, UnauthorizedException, NotFoundException } from '@nestjs/common';

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

  async signup(signupDto: SignupDto){
    const {email, password, fullName} = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if(existingUser){
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

    this.logger.log(`New user registered: ${newUser.id} - ${newUser.email}`);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
      message: 'User registered successfully',
    }
  }

  async login(loginDto: LoginDto){
    const {email, password} = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if(!user){
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(
      password, user.passwordHash
    );

    if(!passwordMatches){
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    const hashedRt = await this.hashData(tokens.refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRt,
      }
    })

    this.logger.log(`User logged in: ${user.id} - ${user.email} at ${new Date().toISOString()}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      ...tokens,
    }
  }

  async refreshToken(userId: string, rt: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if(!user || !user.refreshToken) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const matches = await bcrypt.compare(
      rt, user.refreshToken
    )

    if(!matches){
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    const hashedRt = await this.hashData(tokens.refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRt,
      }
    })

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      }
    });
    return {
      message: 'Logged out successfully',
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if(!user) {
      throw new NotFoundException('User not found');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    }
    
    return safeUser;
  }

  // Helper Methods

  async hashData(data: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(data, salt);
  }

  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, role: user.role, email: user.email };
       const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
       payload,
        {
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '60m',
        },
      ),
      this.jwtService.signAsync(
       payload,
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '30d',
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken
    };
  }
}