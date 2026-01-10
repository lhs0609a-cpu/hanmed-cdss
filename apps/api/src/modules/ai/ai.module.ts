import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './services/llm.service';
import { RecommendationService } from './services/recommendation.service';
import { PatientExplanationService } from './services/patient-explanation.service';
import { CaseSearchService } from './services/case-search.service';
import { AiController } from './ai.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    LlmService,
    RecommendationService,
    PatientExplanationService,
    CaseSearchService,
  ],
  controllers: [AiController],
  exports: [
    LlmService,
    RecommendationService,
    PatientExplanationService,
    CaseSearchService,
  ],
})
export class AiModule {}
