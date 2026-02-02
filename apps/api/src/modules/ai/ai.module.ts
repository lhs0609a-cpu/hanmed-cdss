import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './services/llm.service';
import { RecommendationService } from './services/recommendation.service';
import { PatientExplanationService } from './services/patient-explanation.service';
import { CaseSearchService } from './services/case-search.service';
import { HealthScoreCalculatorService } from './services/health-score-calculator.service';
import { ScientificRationaleService } from './services/scientific-rationale.service';
import { PharmacologyReportService } from './services/pharmacology-report.service';
import { TreatmentStatisticsService } from './services/treatment-statistics.service';
import { ComprehensiveReportService } from './services/comprehensive-report.service';
import { AiController } from './ai.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    LlmService,
    RecommendationService,
    PatientExplanationService,
    CaseSearchService,
    HealthScoreCalculatorService,
    ScientificRationaleService,
    PharmacologyReportService,
    TreatmentStatisticsService,
    ComprehensiveReportService,
  ],
  controllers: [AiController],
  exports: [
    LlmService,
    RecommendationService,
    PatientExplanationService,
    CaseSearchService,
    HealthScoreCalculatorService,
    ScientificRationaleService,
    PharmacologyReportService,
    TreatmentStatisticsService,
    ComprehensiveReportService,
  ],
})
export class AiModule {}
