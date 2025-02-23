import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserSchema } from './schema/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResetCodeSchema } from './schema/reset-password.schema';
import { MailService } from 'src/service/mail.service';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'images'),
      serveRoot: '/uploads/images',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'documents'),
      serveRoot: '/uploads/documents',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '5m' },
      }),
    }),
    MongooseModule.forFeature([
      {
        name: 'User',
        schema: UserSchema
      },
      {
        name: 'ResetCode',
        schema: ResetCodeSchema
       }
    ])
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService],
})
export class AuthModule { }
