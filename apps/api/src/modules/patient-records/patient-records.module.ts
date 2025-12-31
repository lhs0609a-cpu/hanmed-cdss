import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PatientRecordsController } from './patient-records.controller';
import { PatientRecordsService } from './patient-records.service';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
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
    HttpModule,
    PatientAuthModule,
  ],
  controllers: [PatientRecordsController],
  providers: [PatientRecordsService],
  exports: [PatientRecordsService],
})
export class PatientRecordsModule {}
