import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientPrescriptionsController } from './patient-prescriptions.controller';
import { PatientPrescriptionsService } from './patient-prescriptions.service';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import { AuthModule } from '../auth/auth.module';
import {
  PatientPrescription,
  PatientRecord,
  Herb,
  Formula,
  DrugHerbInteraction,
  PatientAccount,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientPrescription,
      PatientRecord,
      Herb,
      Formula,
      DrugHerbInteraction,
      PatientAccount,
    ]),
    PatientAuthModule,
    AuthModule, // PractitionerRolesGuard — 테넌트 소속 검증
  ],
  controllers: [PatientPrescriptionsController],
  providers: [PatientPrescriptionsService],
  exports: [PatientPrescriptionsService],
})
export class PatientPrescriptionsModule {}
