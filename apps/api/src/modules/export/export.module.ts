import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { PatientPrescription } from '../../database/entities/patient-prescription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PatientRecord, PatientAccount, PatientPrescription])],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
