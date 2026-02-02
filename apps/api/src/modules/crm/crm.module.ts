import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CrmCampaign,
  CrmAutoMessage,
  CrmPatientSegment,
  CrmMessageLog,
  CrmFunnelStage,
  CrmPatientFunnelStatus,
} from '../../database/entities/crm-campaign.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientHealthScore } from '../../database/entities/patient-health-score.entity';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrmCampaign,
      CrmAutoMessage,
      CrmPatientSegment,
      CrmMessageLog,
      CrmFunnelStage,
      CrmPatientFunnelStatus,
      PatientAccount,
      PatientRecord,
      PatientHealthScore,
    ]),
  ],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
