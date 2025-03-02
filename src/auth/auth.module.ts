import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { ResetCode, ResetCodeSchema } from './schema/reset-password.schema';
import { JwtModule } from '@nestjs/jwt';
import { MailService } from 'src/service/mail.service';
import { FileUploadService } from './fileUpload.service';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleStrategy } from './Google/auth.google.strategy';
import { GoogleOAuthGuard } from './Google/google-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ResetCode.name, schema: ResetCodeSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'pimpim',
      signOptions: { expiresIn: '5m' },
    }),
    PassportModule,
  ],
  providers: [AuthService, MailService, FileUploadService, JwtAuthGuard, GoogleStrategy, GoogleOAuthGuard],
  controllers: [AuthController],
})
export class AuthModule {}