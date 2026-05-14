import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * AI Engine (FastAPI) HTTP 클라이언트.
 *
 * NestJS 백엔드가 LLM 을 직접 호출하던 흐름을 AI Engine 으로 위임한다.
 * 이렇게 해야 AI Engine 에 구축된 다음 안전 가드가 처방 흐름에서 작동한다:
 *   - GroundingService: 임산부/노인 금기 본초·CRITICAL 상호작용·환각 처방 차단
 *   - PII 살균 + 프롬프트 인젝션 방어
 *   - LLM 동시성/Rate limit 제어 (CapacityExceeded)
 *   - 모델 폴백 체인 (gpt-4o-mini → gpt-4o → 더미)
 *
 * AI Engine 다운/타임아웃 시 호출자가 폴백을 결정할 수 있도록 예외를 그대로 throw.
 */

export interface AiEngineRecommendationRequest {
  patientAge?: number;
  patientGender?: string;
  constitution?: string;
  pregnancy?: boolean;
  chiefComplaint: string;
  symptoms: Array<{ name: string; severity?: number; duration?: string }>;
  currentMedications?: string[];
  topK?: number;
  /** 호출자 식별 — AI Engine 의 rate-limit/personalization 용 */
  userId?: string;
}

export interface AiEngineHerbInfo {
  name: string;
  amount: string;
  role: string;
}

export interface AiEngineFormulaRecommendation {
  formula_name: string;
  confidence_score: number;
  herbs: AiEngineHerbInfo[];
  rationale: string;
  source?: string | null;
  has_classical_citation?: boolean | null;
  safety_flags?: string[] | null;
}

export interface AiEngineRecommendationResponse {
  recommendations: AiEngineFormulaRecommendation[];
  analysis: string;
  modifications?: string | null;
  cautions?: string | null;
  note?: string | null;
  warnings?: string[] | null;
  source?: string | null;
  disclaimer?: string | null;
  safety_disclaimer?: string | null;
  patient_safety?: { is_pregnant?: boolean; is_elderly?: boolean } | null;
  generated_at?: string | null;
  model?: string | null;
  grounded?: boolean | null;
  cache_hit?: boolean | null;
}

@Injectable()
export class AiEngineClient {
  private readonly logger = new Logger(AiEngineClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('AI_ENGINE_URL') || 'http://localhost:8000';
    // AI Engine 의 OpenAI 호출 자체가 최대 25s → 백엔드 측은 30s 로 여유 확보
    this.timeoutMs = parseInt(
      this.configService.get<string>('AI_ENGINE_TIMEOUT_MS') || '30000',
      10,
    );
  }

  /**
   * 처방 추천. AI Engine `/api/v1/recommend/` 호출.
   * @throws Error AI Engine 다운/타임아웃/5xx 시
   */
  async getRecommendation(
    req: AiEngineRecommendationRequest,
  ): Promise<AiEngineRecommendationResponse> {
    const body = {
      patient_age: req.patientAge,
      patient_gender: req.patientGender,
      constitution: req.constitution,
      pregnancy: req.pregnancy,
      chief_complaint: req.chiefComplaint,
      symptoms: req.symptoms,
      current_medications: req.currentMedications,
      top_k: req.topK ?? 3,
    };

    const url = `${this.baseUrl}/api/v1/recommend/`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (req.userId) headers['X-User-Id'] = req.userId;
    // 서비스 간 통신용 내부 키 (AI Engine 측에서 검증하지 않더라도 일관성 위해 동봉)
    const internalKey = this.configService.get<string>('INTERNAL_API_KEY');
    if (internalKey) headers['X-Internal-Key'] = internalKey;

    try {
      const response = await firstValueFrom(
        this.httpService.post<AiEngineRecommendationResponse>(url, body, {
          headers,
          timeout: this.timeoutMs,
        }),
      );

      // AI Engine 은 ResponseWrapperMiddleware 로 NestJS 형식으로 감쌀 수 있음.
      // 두 가지 형태(원본 / { data: 원본 }) 모두 처리.
      const raw: any = response.data;
      const payload: AiEngineRecommendationResponse =
        raw && raw.data && typeof raw.data === 'object' && 'recommendations' in raw.data
          ? raw.data
          : raw;

      if (!Array.isArray(payload?.recommendations)) {
        this.logger.warn(
          `[ai-engine] recommendations 가 배열이 아님 — keys=${Object.keys(payload || {}).join(',')}`,
        );
        return { recommendations: [], analysis: '' };
      }
      return payload;
    } catch (err: any) {
      // 호출자가 폴백 결정할 수 있도록 그대로 throw — 진료가 끊기진 않게 RecommendationService 에서 처리
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message;
      this.logger.error(`[ai-engine] 호출 실패 (status=${status}): ${detail}`);
      throw err;
    }
  }
}
