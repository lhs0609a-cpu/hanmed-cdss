import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeStatistics } from '../../database/entities/practice-statistics.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientPrescription } from '../../database/entities/patient-prescription.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { User } from '../../database/entities/user.entity';
import { UsageTracking } from '../../database/entities/usage-tracking.entity';
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';
import { PracticeAnalyticsService } from './practice-analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEventsController } from './analytics-events.controller';
import { GrowthEventsController, AdminGrowthController } from './growth.controller';
import { GrowthService } from './growth.service';
import { GrowthLiveService } from './growth-live.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PracticeStatistics,
      PatientRecord,
      PatientPrescription,
      PatientAccount,
      User,
      UsageTracking,
      AnalyticsEvent,
    ]),
  ],
  controllers: [AnalyticsController, AnalyticsEventsController, GrowthEventsController, AdminGrowthController],
  providers: [PracticeAnalyticsService, GrowthService, GrowthLiveService],
  exports: [PracticeAnalyticsService],
})
export class AnalyticsModule {}
