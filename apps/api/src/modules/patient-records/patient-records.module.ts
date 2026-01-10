import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientRecordsController } from './patient-records.controller';
import { PatientRecordsService } from './patient-records.service';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import { AiModule } from '../ai/ai.module';
import {
  PatientRecord,
  PatientAccount,
  PatientClinicConnection,
  PatientNotification,
  ClinicalCase,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientRecord,
      PatientAccount,
      PatientClinicConnection,
      PatientNotification,
      ClinicalCase,
    ]),
    PatientAuthModule,
    AiModule,
  ],
  controllers: [PatientRecordsController],
  providers: [PatientRecordsService],
  exports: [PatientRecordsService],
})
export class PatientRecordsModule {}
