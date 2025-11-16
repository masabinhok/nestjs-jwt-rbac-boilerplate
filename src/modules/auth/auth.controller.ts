import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { Throttle, SkipThrottle } from '@nestjs/throttler';


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
    @Res({passthrough: true}) res: Response) {
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'Unknown IP';
    
    const data = await this.authService.login(loginDto, deviceInfo, ipAddress);
    res.cookie('accessToken', data.accessToken,{
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60*60*1000, // 1 hour
    });

    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30*24*60*60*1000, // 30 days
    });

    return {
      user: data.user,
    };
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('/refresh')
  async refreshToken(@GetUser('sub') userId: string, @Req() req: Request, @Res({passthrough: true}) res: Response) {
    const rt = req.cookies['refreshToken'];
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'Unknown IP';
    
    const {accessToken, refreshToken} =await this.authService.refreshToken(userId, rt, deviceInfo, ipAddress);

    res.cookie('accessToken', accessToken,{
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60*60*1000, // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30*24*60*60*1000, // 30 days
    });

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
    @Res({passthrough: true}) res: Response
  ) {
    const rt = req.cookies['refreshToken'];
    await this.authService.logout(userId, rt);

    res.clearCookie('accessToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    })

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    })

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
