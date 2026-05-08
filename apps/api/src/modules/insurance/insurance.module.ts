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
import { SangamLearnerService } from './sangam-learner.service';
import { SangamLearnerController } from './sangam-learner.controller';
import { EdiBuilderService } from './edi/edi-builder.service';
import { EdiSubmissionService } from './edi/edi-submission.service';
import { EdiController } from './edi/edi.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InsuranceClaim,
      DiagnosisCodeMaster,
      PatientRecord,
      PatientAccount,
    ]),
  ],
  controllers: [InsuranceController, SangamLearnerController, EdiController],
  providers: [InsuranceService, SangamLearnerService, EdiBuilderService, EdiSubmissionService],
  exports: [InsuranceService, SangamLearnerService, EdiBuilderService, EdiSubmissionService],
})
export class InsuranceModule {}
