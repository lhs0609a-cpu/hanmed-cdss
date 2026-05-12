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
      // 도메인 검증 — 빈 입력은 false-positive 위험. 한쪽이 비면 의미 있는 결과 불가.
      if (!Array.isArray(herbs) || !Array.isArray(medications)) {
        throw new Error('herbs / medications 는 문자열 배열이어야 합니다.');
      }
      const cleanHerbs = herbs.map((h) => String(h || '').trim()).filter(Boolean);
      const cleanDrugs = medications.map((m) => String(m || '').trim()).filter(Boolean);

      const result: any = await this.interactionsService.checkInteractions(
        cleanHerbs,
        cleanDrugs,
      );

      // requiresOverride 가 true 면 호출 측(컨트롤러/UI)이 처방 저장 전에 한의사 동의 UX 를 띄워야 한다.
      // 여기서는 응답 메타데이터로만 전달, 차단 자체는 처방 저장 엔드포인트의 책임.
      return {
        success: true,
        data: result,
        requiresOverride: Boolean(result?.requiresOverride),
      };
    } catch (error) {
      console.error('상호작용 검사 실패:', error);
      throw error;
    }
  }
}
