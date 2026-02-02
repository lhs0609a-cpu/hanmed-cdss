import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrognosisPrediction } from '../../database/entities/prognosis-prediction.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { ClinicalCase } from '../../database/entities/clinical-case.entity';
import { PrognosisService } from './prognosis.service';
import { PrognosisController } from './prognosis.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrognosisPrediction,
      PatientRecord,
      ClinicalCase,
    ]),
  ],
  controllers: [PrognosisController],
  providers: [PrognosisService],
  exports: [PrognosisService],
})
export class PrognosisModule {}
