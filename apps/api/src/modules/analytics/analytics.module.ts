import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeStatistics } from '../../database/entities/practice-statistics.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientPrescription } from '../../database/entities/patient-prescription.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { User } from '../../database/entities/user.entity';
import { UsageTracking } from '../../database/entities/usage-tracking.entity';
import { PracticeAnalyticsService } from './practice-analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PracticeStatistics,
      PatientRecord,
      PatientPrescription,
      PatientAccount,
      User,
      UsageTracking,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [PracticeAnalyticsService],
  exports: [PracticeAnalyticsService],
})
export class AnalyticsModule {}
