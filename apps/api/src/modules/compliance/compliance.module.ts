import { Module } from '@nestjs/common';
import { EmrCertificationService } from './emr-certification.service';
import { EmrCertificationController } from './emr-certification.controller';

@Module({
  providers: [EmrCertificationService],
  controllers: [EmrCertificationController],
  exports: [EmrCertificationService],
})
export class ComplianceModule {}
