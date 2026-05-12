import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TotpService } from './services/totp.service';
import { UsersModule } from '../users/users.module';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { ClinicPractitioner } from '../../database/entities/clinic-practitioner.entity';
import { PractitionerRolesGuard } from './guards/practitioner-role.guard';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([PasswordResetToken, ClinicPractitioner]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TotpService, PractitionerRolesGuard],
  exports: [AuthService, JwtModule, TotpService, PractitionerRolesGuard, TypeOrmModule],
})
export class AuthModule {}
