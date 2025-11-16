import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { COOKIE_CONFIG } from 'src/common/constants/cookie.config';
import { CookieOptions } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ strict: { ttl: 60000, limit: 3 } })
  @Public()
  @Post('/signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @Public()
  @Post('/login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      'Unknown IP';

    const data = await this.authService.login(loginDto, deviceInfo, ipAddress);

    res.cookie(
      COOKIE_CONFIG.ACCESS_TOKEN.name,
      data.accessToken,
      COOKIE_CONFIG.ACCESS_TOKEN.options as CookieOptions,
    );
    res.cookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      data.refreshToken,
      COOKIE_CONFIG.REFRESH_TOKEN.options as CookieOptions,
    );

    return {
      user: data.user,
    };
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('/refresh')
  async refreshToken(
    @GetUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rt = req.cookies['refreshToken'] as string;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      'Unknown IP';

    const { accessToken, refreshToken } = await this.authService.refreshToken(
      userId,
      rt,
      deviceInfo,
      ipAddress,
    );

    res.cookie(
      COOKIE_CONFIG.ACCESS_TOKEN.name,
      accessToken,
      COOKIE_CONFIG.ACCESS_TOKEN.options as CookieOptions,
    );
    res.cookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      refreshToken,
      COOKIE_CONFIG.REFRESH_TOKEN.options as CookieOptions,
    );

    return {
      message: 'Tokens refreshed successfully',
    };
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('/logout')
  async logout(
    @GetUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rt = req.cookies['refreshToken'] as string | undefined;
    await this.authService.logout(userId, rt);

    res.clearCookie(
      COOKIE_CONFIG.ACCESS_TOKEN.name,
      COOKIE_CONFIG.ACCESS_TOKEN.options as CookieOptions | undefined,
    );
    res.clearCookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      COOKIE_CONFIG.REFRESH_TOKEN.options as CookieOptions | undefined,
    );

    return {
      message: 'Logged out successfully',
    };
  }

  @SkipThrottle()
  @Get('/me')
  async getMe(@GetUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }
}
