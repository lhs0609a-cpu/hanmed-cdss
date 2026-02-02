import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthJournal } from '../../database/entities/health-journal.entity';
import { MedicationLog } from '../../database/entities/medication-log.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientHealthScore } from '../../database/entities/patient-health-score.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { Reservation } from '../../database/entities/reservation.entity';
import { PatientInsightsService } from './patient-insights.service';
import { PatientInsightsController } from './patient-insights.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HealthJournal,
      MedicationLog,
      PatientRecord,
      PatientHealthScore,
      PatientAccount,
      Reservation,
    ]),
  ],
  controllers: [PatientInsightsController],
  providers: [PatientInsightsService],
  exports: [PatientInsightsService],
})
export class PatientInsightsModule {}
