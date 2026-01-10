import { Injectable } from '@nestjs/common';
import { LlmService, RecommendationResult } from './llm.service';

export interface SymptomInput {
  name: string;
  severity?: number;
  duration?: string;
}

export interface RecommendationRequest {
  patientAge?: number;
  patientGender?: string;
  constitution?: string;
  chiefComplaint: string;
  symptoms: SymptomInput[];
  currentMedications?: string[];
  topK?: number;
}

@Injectable()
export class RecommendationService {
  constructor(private llmService: LlmService) {}

  async getRecommendation(request: RecommendationRequest): Promise<RecommendationResult> {
    const patientInfo = {
      age: request.patientAge,
      gender: request.patientGender,
      constitution: request.constitution,
      chiefComplaint: request.chiefComplaint,
      symptoms: request.symptoms,
      currentMedications: request.currentMedications,
    };

    return this.llmService.generateRecommendation(patientInfo);
  }
}
