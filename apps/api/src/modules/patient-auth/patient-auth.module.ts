import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PatientAuthController } from './patient-auth.controller';
import { PatientAuthService } from './patient-auth.service';
import { PatientAuthGuard } from './guards/patient-auth.guard';
import { PatientAccount, PhoneVerification } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientAccount, PhoneVerification]),
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
  controllers: [PatientAuthController],
  providers: [PatientAuthService, PatientAuthGuard],
  exports: [PatientAuthService, PatientAuthGuard, JwtModule],
})
export class PatientAuthModule {}
