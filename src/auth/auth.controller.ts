import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res, UnauthorizedException, Put, NotFoundException, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verifyCode.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { EditProfileDto } from './dto/edit-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileUploadService } from './fileUpload.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('auth')
export class AuthController {
  jwtService: any;
  constructor(
    private readonly authService: AuthService
  ) { }

  
  @Post('/signup')
  @UseInterceptors(FileInterceptor('contentFile', FileUploadService.multerOptions))
  signUp(@Body() SignUpDto: SignUpDto, @UploadedFile() file?: Express.Multer.File) {

    if (file) {
      let filePath = '';
      if (file.mimetype.startsWith('image/')) {
        filePath = `uploads/images/${file.filename}`;
      } else {
        filePath = `uploads/documents/${file.filename}`;
      }
      SignUpDto.medicalReport = filePath;
    } else {
      SignUpDto.medicalReport = "";
    }

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

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update-profile')
  @UseInterceptors(FileInterceptor('newMedicalReport', FileUploadService.multerOptions))
  async updateProfile(@Request() req, @Body() editProfileDto: EditProfileDto, @UploadedFile() file?: Express.Multer.File): Promise<{ user }> {
    if (file) {
      let filePath = '';
      if (file.mimetype.startsWith('image/')) {
        filePath = `uploads/images/${file.filename}`;
      } else {
        filePath = `uploads/documents/${file.filename}`;
      }
      editProfileDto.newMedicalReport = filePath;
    }
    const userId = req.user.userId;
    return this.authService.updateProfile(userId, editProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto): Promise<{ user }> {
    const userId = req.user.userId;
    return this.authService.updatePassword(userId, changePasswordDto);
  }

    @UseGuards(JwtAuthGuard)
    @Delete('delete-profile')
    async deleteProfile(@Request() req): Promise<{ message: string }> {
      const userId = req.user.userId;
      return this.authService.deleteProfile(userId);
    }

}
