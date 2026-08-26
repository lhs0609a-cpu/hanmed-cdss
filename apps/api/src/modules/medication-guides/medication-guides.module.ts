import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MedicationGuidesController,
  PublicMedicationGuidesController,
  PublicPatientTrackController,
} from './medication-guides.controller';
import { MedicationGuidesService } from './medication-guides.service';
import { GuideLinkSenderService } from './guide-link-sender.service';
import { GuideReminderService } from './guide-reminder.service';
import { MedicationGuide } from '../../database/entities/medication-guide.entity';
import { MedicationGuideReport } from '../../database/entities/medication-guide-report.entity';
import { MedicationGuideDose } from '../../database/entities/medication-guide-dose.entity';
import { PatientNotifyLog } from '../../database/entities/patient-notify-log.entity';
import { PractitionerVisit } from '../../database/entities/practitioner-visit.entity';
import { PractitionerPatient } from '../../database/entities/practitioner-patient.entity';
import { Formula } from '../../database/entities/formula.entity';
import { Herb } from '../../database/entities/herb.entity';
import { User } from '../../database/entities/user.entity';
import { CasesModule } from '../cases/cases.module';
import { InteractionsModule } from '../interactions/interactions.module';

// EncryptionService(CommonModule)와 MessagingService(MessagingModule)는 모두
// @Global 이라 여기서 다시 import 하지 않는다.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicationGuide,
      MedicationGuideReport,
      MedicationGuideDose,
      PatientNotifyLog,
      PractitionerVisit,
      PractitionerPatient,
      Formula,
      Herb,
      User,
    ]),
    CasesModule,
    InteractionsModule,
  ],
  controllers: [
    MedicationGuidesController,
    PublicMedicationGuidesController,
    PublicPatientTrackController,
  ],
  providers: [
    MedicationGuidesService,
    GuideLinkSenderService,
    GuideReminderService,
  ],
  exports: [MedicationGuidesService],
})
export class MedicationGuidesModule {}
