import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PractitionerPatientsService } from './practitioner-patients.service';
import { PractitionerPatientsController } from './practitioner-patients.controller';
import { PractitionerPatient } from '../../database/entities/practitioner-patient.entity';
import { PractitionerVisit } from '../../database/entities/practitioner-visit.entity';

// EncryptionService 는 CommonModule(@Global)에서 제공되므로 별도 import 가 필요 없다.
@Module({
  imports: [TypeOrmModule.forFeature([PractitionerPatient, PractitionerVisit])],
  controllers: [PractitionerPatientsController],
  providers: [PractitionerPatientsService],
  exports: [PractitionerPatientsService],
})
export class PractitionerPatientsModule {}
