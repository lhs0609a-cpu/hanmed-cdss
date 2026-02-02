import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  InsuranceClaim,
  DiagnosisCodeMaster,
} from '../../database/entities/insurance-claim.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InsuranceClaim,
      DiagnosisCodeMaster,
      PatientRecord,
      PatientAccount,
    ]),
  ],
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService],
})
export class InsuranceModule {}
