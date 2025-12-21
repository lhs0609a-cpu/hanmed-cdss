import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

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
  private aiEngineUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.aiEngineUrl = this.configService.get('AI_ENGINE_URL') || 'http://localhost:8000';
  }

  async getRecommendation(request: RecommendationRequest) {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.aiEngineUrl}/api/v1/recommend/`,
        {
          patient_age: request.patientAge,
          patient_gender: request.patientGender,
          constitution: request.constitution,
          chief_complaint: request.chiefComplaint,
          symptoms: request.symptoms,
          current_medications: request.currentMedications,
        },
      );

      return response.data;
    } catch (error) {
      console.error('처방 추천 API 호출 실패:', error);
      throw error;
    }
  }

  async checkInteractions(herbs: string[], medications: string[]) {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.aiEngineUrl}/api/v1/interaction/check`,
        {
          herbs,
          medications,
        },
      );

      return response.data;
    } catch (error) {
      console.error('상호작용 검사 API 호출 실패:', error);
      throw error;
    }
  }
}
