import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import { AuthModule } from '../auth/auth.module';
import {
  Clinic,
  ClinicPractitioner,
  Reservation,
  PatientClinicConnection,
} from '../../database/entities';
import { PatientAccessLog } from '../../database/entities/patient-access-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clinic,
      ClinicPractitioner,
      Reservation,
      PatientClinicConnection,
      PatientAccessLog,
    ]),
    PatientAuthModule,
    AuthModule,
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
