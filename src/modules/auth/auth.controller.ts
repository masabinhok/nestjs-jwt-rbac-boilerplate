import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Post('/login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({passthrough: true}) res: Response) {
    const data = await this.authService.login(loginDto);
    res.cookie('accessToken', data.accessToken,{
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 60*60*1000, // 1 hour
    });

    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 30*24*60*60*1000, // 30 days
    });

    return {
      user: data.user,
    };
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('/refresh')
  async refreshToken(@GetUser('sub') userId: string, @Req() req: Request, @Res({passthrough: true}) res: Response) {
    const rt = req.cookies['refreshToken'];
    const {accessToken, refreshToken} =await this.authService.refreshToken(userId, rt);

    res.cookie('accessToken', accessToken,{
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 60*60*1000, // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
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
    @Res({passthrough: true}) res: Response
  ) {
    await this.authService.logout(userId);

    res.clearCookie('accessToken', {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    })

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    })

    return {
      message: 'Logged out successfully',
    };
  }

  @Get('/me')
  async getMe(@GetUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }

}
