import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import {
  Clinic,
  ClinicPractitioner,
  Reservation,
  PatientClinicConnection,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clinic,
      ClinicPractitioner,
      Reservation,
      PatientClinicConnection,
    ]),
    PatientAuthModule,
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
