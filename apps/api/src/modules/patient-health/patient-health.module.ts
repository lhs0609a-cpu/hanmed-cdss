import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientHealthController } from './patient-health.controller';
import { PatientHealthService } from './patient-health.service';
import { MedicationSchedulerService } from './medication-scheduler.service';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import {
  HealthJournal,
  MedicationReminder,
  MedicationLog,
  PatientAccount,
  PatientNotification,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HealthJournal,
      MedicationReminder,
      MedicationLog,
      PatientAccount,
      PatientNotification,
    ]),
    PatientAuthModule,
  ],
  controllers: [PatientHealthController],
  providers: [PatientHealthService, MedicationSchedulerService],
  exports: [PatientHealthService, MedicationSchedulerService],
})
export class PatientHealthModule {}
