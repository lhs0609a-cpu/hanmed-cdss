import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SajuReport } from '../../database/entities/saju-report.entity';
import { SajuReportSection } from '../../database/entities/saju-report-section.entity';
import { SajuPurchase } from '../../database/entities/saju-purchase.entity';
import { User } from '../../database/entities/user.entity';
import { SajuController } from './saju.controller';
import { SajuCalculationService } from './services/saju-calculation.service';
import { SajuPaymentService } from './services/saju-payment.service';
import { SajuReportGeneratorService } from './services/saju-report-generator.service';
import { SajuImageService } from './services/saju-image.service';
import { SajuPdfService } from './services/saju-pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SajuReport, SajuReportSection, SajuPurchase, User]),
  ],
  controllers: [SajuController],
  providers: [
    SajuCalculationService,
    SajuPaymentService,
    SajuReportGeneratorService,
    SajuImageService,
    SajuPdfService,
  ],
  exports: [SajuCalculationService],
})
export class SajuModule {}
