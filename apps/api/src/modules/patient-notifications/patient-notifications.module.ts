import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientNotificationsController } from './patient-notifications.controller';
import { PatientNotificationsService } from './patient-notifications.service';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import { PatientNotification, PatientAccount } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientNotification, PatientAccount]),
    PatientAuthModule,
  ],
  controllers: [PatientNotificationsController],
  providers: [PatientNotificationsService],
  exports: [PatientNotificationsService],
})
export class PatientNotificationsModule {}
