import { Injectable } from '@nestjs/common';
import { RecommendationService } from '../ai/services/recommendation.service';
import { InteractionsService } from '../interactions/interactions.service';

interface RecommendationRequest {
  patientAge?: number;
  patientGender?: string;
  constitution?: string;
  chiefComplaint: string;
  symptoms: Array<{ name: string; severity?: number }>;
  currentMedications?: string[];
}

@Injectable()
export class PrescriptionsService {
  constructor(
    private recommendationService: RecommendationService,
    private interactionsService: InteractionsService,
  ) {}

  async getRecommendation(request: RecommendationRequest) {
    try {
      const result = await this.recommendationService.getRecommendation({
        patientAge: request.patientAge,
        patientGender: request.patientGender,
        constitution: request.constitution,
        chiefComplaint: request.chiefComplaint,
        symptoms: request.symptoms,
        currentMedications: request.currentMedications,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('처방 추천 실패:', error);
      throw error;
    }
  }

  async checkInteractions(herbs: string[], medications: string[]) {
    try {
      const result = await this.interactionsService.checkInteractions(
        herbs,
        medications,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('상호작용 검사 실패:', error);
      throw error;
    }
  }
}
