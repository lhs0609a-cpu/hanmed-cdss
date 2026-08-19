import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MedicationGuidesController,
  PublicMedicationGuidesController,
} from './medication-guides.controller';
import { MedicationGuidesService } from './medication-guides.service';
import { MedicationGuide } from '../../database/entities/medication-guide.entity';
import { MedicationGuideReport } from '../../database/entities/medication-guide-report.entity';
import { PractitionerVisit } from '../../database/entities/practitioner-visit.entity';
import { PractitionerPatient } from '../../database/entities/practitioner-patient.entity';
import { Formula } from '../../database/entities/formula.entity';
import { User } from '../../database/entities/user.entity';
import { CasesModule } from '../cases/cases.module';
import { InteractionsModule } from '../interactions/interactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicationGuide,
      MedicationGuideReport,
      PractitionerVisit,
      PractitionerPatient,
      Formula,
      User,
    ]),
    CasesModule,
    InteractionsModule,
  ],
  controllers: [MedicationGuidesController, PublicMedicationGuidesController],
  providers: [MedicationGuidesService],
  exports: [MedicationGuidesService],
})
export class MedicationGuidesModule {}
