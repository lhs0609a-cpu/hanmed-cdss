import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { LlmService } from './services/llm.service';
import { AiEngineClient } from './services/ai-engine.client';
import { RecommendationService } from './services/recommendation.service';
import { PatientExplanationService } from './services/patient-explanation.service';
import { CaseSearchService } from './services/case-search.service';
import { HealthScoreCalculatorService } from './services/health-score-calculator.service';
import { ScientificRationaleService } from './services/scientific-rationale.service';
import { PharmacologyReportService } from './services/pharmacology-report.service';
import { TreatmentStatisticsService } from './services/treatment-statistics.service';
import { ComprehensiveReportService } from './services/comprehensive-report.service';
import { AiController } from './ai.controller';
import { CasesModule } from '../cases/cases.module';
import { TossPaymentsModule } from '../toss-payments/toss-payments.module';

@Module({
  // CasesModule — 추천 근거가 될 유사 치험례를 DB 에서 찾기 위해 필요.
  // AI 월 한도를 세려면 결제 쪽 trackUsage 가 필요하다. 그 구현은 락과
  // 트랜잭션을 갖추고 있어서 여기에 다시 만들 이유가 없다.
  imports: [ConfigModule, HttpModule, CasesModule, TossPaymentsModule],
  providers: [
    LlmService,
    AiEngineClient,
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
    AiEngineClient,
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
