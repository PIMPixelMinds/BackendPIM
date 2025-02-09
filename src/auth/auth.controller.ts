import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res, UnauthorizedException, Put, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verifyCode.dto';

@Controller('auth')
export class AuthController {
  jwtService: any;
  constructor(private readonly authService: AuthService) { }

  @Post('/signup')
  signUp(@Body() SignUpDto: SignUpDto) {
    return this.authService.signUp(SignUpDto);
  }

  @Post('/login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('/refresh-token')
  async refreshToken(@Req() request, @Res() response) {
    const oldToken = request.headers['authorization']?.split(' ')[1]; // Extract token

    if (!oldToken) {
      throw new UnauthorizedException('Token missing');
    }

    try {
      const decoded = this.jwtService.verify(oldToken);
      const newToken = this.jwtService.sign({ userId: decoded.userId }, { expiresIn: '5m' });

      response.setHeader('Authorization', `Bearer ${newToken}`);
      return response.json({ token: newToken });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post('/forgot-password')
  forgotPassword(@Body() forgotPassword: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPassword.email)
  }

  @Post('/get-reset-code/:email')
  async getResetCode(@Param('email') email: string) {
    const resetCode = await this.authService.getResetCodeByEmail(email);
    if (!resetCode) {
      throw new NotFoundException('Code not found');
    }
    return { codeNumber: resetCode.codeNumber.toString() };
  }

  @Post('/verify-reset-code')
  async verifyResetCode(@Body() verifyCodeDto: VerifyCodeDto) {
    const { email, resetCode } = verifyCodeDto;
    const validCode = await this.authService.verifyResetCode(email, resetCode);
    if (!validCode) throw new NotFoundException('Invalid or expired code');
    return { message: 'Code verified successfully' };
  }

  @Put('reset-password/:email')
  async resetPassword(@Param('email') email: string, @Body() changePasswordDto: ResetPasswordDto): Promise<void> {
    return this.authService.changePassword(email, changePasswordDto);
  }

}
