import { Injectable, Logger } from '@nestjs/common';
import { LlmService, RecommendationResult, FormulaRecommendation } from './llm.service';
import { AiEngineClient } from './ai-engine.client';
import { CasesService } from '../../cases/cases.service';
import { BodyHeat, BodyStrength } from '../../../database/entities/clinical-case.entity';
import { FormulaHeatNature, FormulaStrengthNature } from '../../../database/entities/formula.entity';

export interface SymptomInput {
  name: string;
  severity?: number;
  duration?: string;
}

export interface RecommendationRequest {
  patientAge?: number;
  patientGender?: string;
  constitution?: string;
  /** 임산부 여부 — AI Engine grounding 단에서 임산부 금기 본초 자동 제외 */
  pregnancy?: boolean;
  // 체열/근실도 (이종대 선생님 기준) - 필수
  bodyHeat?: BodyHeat;
  bodyStrength?: BodyStrength;
  bodyHeatScore?: number;      // -10 ~ +10
  bodyStrengthScore?: number;  // -10 ~ +10
  chiefComplaint: string;
  symptoms: SymptomInput[];
  currentMedications?: string[];
  topK?: number;
  /** 호출자 식별 — AI Engine rate-limit/personalization 용 */
  userId?: string;
}

// 체열/근실도 검증 결과
export interface ConstitutionValidation {
  isValid: boolean;
  warnings: ConstitutionWarning[];
}

export interface ConstitutionWarning {
  type: 'critical' | 'warning' | 'info';
  message: string;
  formulaName: string;
  reason: string;
}

// 체열/근실도 기반 추천 결과 (검증 포함)
/** 추천 근거로 사용한 실제 치험례 요약. 화면이 그대로 펼쳐 보여준다. */
export interface GroundingCase {
  caseId: string;
  title: string;
  summary: string;
  formulaName: string;
  outcome: string;
  matchPercent?: number;
}

export interface ValidatedRecommendationResult extends RecommendationResult {
  constitutionValidation?: ConstitutionValidation;
  /** 이번 추천에 근거로 넣은 유사 치험례. 비어 있으면 근거 없이 나온 추천이다. */
  groundingCases?: GroundingCase[];
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly aiEngine: AiEngineClient,
    /** AI Engine 다운/타임아웃 시 최후 폴백 — 진료가 끊기지 않게 */
    private readonly llmService: LlmService,
    /** 추천 근거가 될 유사 치험례 조회 — "왜 이 처방인지" 의 1차 출처 */
    private readonly casesService: CasesService,
  ) {}

  /**
   * 이번 진료와 닮은 실제 치험례를 찾아 추천 근거로 넘길 형태로 만든다.
   *
   * 실패하더라도 진료를 멈추지 않는다 — 근거가 없으면 없는 대로 추천은 나가고,
   * 화면에서 "근거 치험례 없음"으로 정직하게 표시된다.
   */
  private async findGroundingCases(request: RecommendationRequest) {
    const query = [
      request.chiefComplaint,
      ...(request.symptoms || []).map((s) => s?.name).filter(Boolean),
    ]
      .filter(Boolean)
      .join(' ');
    if (!query.trim()) return [];

    try {
      const found: any = await this.casesService.searchSimilar({
        query,
        topK: 5,
        constitution: request.constitution,
      });
      const rows: any[] = Array.isArray(found?.results) ? found.results : [];
      return rows.map((r) => ({
        caseId: String(r.id ?? r.caseId ?? ''),
        // 한 줄 요약이 있으면 제목으로 쓴다 — 원문 주소증은 문장 중간에서 잘려
        // "은 풍치와…" 처럼 읽히지 않는 채로 나온다.
        title: r.summaryOneLine || r.title || r.chiefComplaint || '',
        // 제목이 요약이면 본문은 "이 사례의 특징" 을 쓴다. 같은 문장을 두 번
        // 보여주지 않으면서, 내 환자에게 가져다 쓸 수 있는지 판단할 근거가 된다.
        summary:
          (r.summaryOneLine && r.distinctive) ||
          [r.chiefComplaint, r.patternDiagnosis, r.treatmentResult, r.result]
            .filter(Boolean)
            .join(' / ')
            .slice(0, 400),
        formulaName: r.formulaName ?? r.herbalFormulas?.[0]?.formulaName ?? '',
        outcome: r.treatmentOutcome ?? r.outcome ?? '',
        matchPercent: typeof r.matchPercent === 'number' ? r.matchPercent : undefined,
      }));
    } catch (err: any) {
      this.logger.warn(`유사 치험례 조회 실패 — 근거 없이 추천 진행: ${err?.message || err}`);
      return [];
    }
  }

  async getRecommendation(request: RecommendationRequest): Promise<ValidatedRecommendationResult> {
    // 체열/근실도 미입력 시 경고 추가
    const missingConstitutionWarnings: ConstitutionWarning[] = [];
    if (!request.bodyHeat) {
      missingConstitutionWarnings.push({
        type: 'warning',
        message: '체열(寒熱) 정보가 없습니다.',
        formulaName: '',
        reason: '정확한 처방 추천을 위해 체열 평가를 권장합니다.',
      });
    }
    if (!request.bodyStrength) {
      missingConstitutionWarnings.push({
        type: 'warning',
        message: '근실도(虛實) 정보가 없습니다.',
        formulaName: '',
        reason: '정확한 처방 추천을 위해 근실도 평가를 권장합니다.',
      });
    }

    // AI Engine 호출 — 그라운딩·임산부 차단·CRITICAL·PII 가드가 여기서 작동.
    // 체열/근실도는 AI Engine 스키마에 없으므로 chiefComplaint 에 컨텍스트로 합쳐 전달.
    const constitutionContext = this.buildConstitutionContext(request);
    const enrichedChiefComplaint = constitutionContext
      ? `${request.chiefComplaint}\n\n[체질 평가]\n${constitutionContext}`
      : request.chiefComplaint;

    // 추천 전에 근거가 될 실제 치험례부터 찾는다.
    const groundingCases = await this.findGroundingCases(request);

    let result: RecommendationResult;
    try {
      const aiResult = await this.aiEngine.getRecommendation({
        similarCases: groundingCases,
        patientAge: request.patientAge,
        patientGender: request.patientGender,
        constitution: request.constitution,
        pregnancy: request.pregnancy,
        chiefComplaint: enrichedChiefComplaint,
        symptoms: request.symptoms,
        currentMedications: request.currentMedications,
        topK: request.topK,
        userId: request.userId,
      });
      result = this.mapAiEngineResponse(aiResult);
    } catch (err: any) {
      // AI Engine 다운/타임아웃 → 폴백. 단, 안전 가드가 빠지므로 사용자에게 경고 부착.
      this.logger.warn(
        `AI Engine 호출 실패 → LlmService 폴백 (이유: ${err?.message || err}). ` +
        `이 경로는 grounding/임산부 가드가 우회됨.`,
      );
      result = await this.llmService.generateRecommendation({
        age: request.patientAge,
        gender: request.patientGender,
        constitution: request.constitution,
        bodyHeat: request.bodyHeat,
        bodyStrength: request.bodyStrength,
        bodyHeatScore: request.bodyHeatScore,
        bodyStrengthScore: request.bodyStrengthScore,
        chiefComplaint: request.chiefComplaint,
        symptoms: request.symptoms,
        currentMedications: request.currentMedications,
      });
      // 폴백 경로 명시 — UI 가 사용자에게 안내할 수 있게
      (result as any).warning =
        'AI Engine 일시 불가로 폴백 추론을 사용했습니다. 임산부/노인 안전 필터가 적용되지 않았으니 한의사의 추가 검토가 필요합니다.';
      (result as any).errorType = 'api_error';
    }

    // 체열/근실도 기반 처방 검증 (백엔드 책임 — AI Engine 은 모르는 정보)
    const validation = this.validateRecommendations(
      result.recommendations,
      request.bodyHeat,
      request.bodyStrength,
    );

    // 미입력 경고 병합
    if (missingConstitutionWarnings.length > 0) {
      validation.warnings = [...missingConstitutionWarnings, ...validation.warnings];
    }

    return {
      ...result,
      // 화면이 "이 처방을 고른 근거" 로 실제 사례를 펼쳐 보여줄 수 있게 그대로 실어 보낸다.
      groundingCases,
      constitutionValidation: validation,
    };
  }

  /**
   * AI Engine 응답 → 백엔드 RecommendationResult 매핑.
   * AI Engine 의 안전 메타데이터(grounded, safety_disclaimer, patient_safety, warnings)는
   * RecommendationResult 의 note/cautions/warning 으로 흡수해 UI 가 그대로 노출.
   */
  private mapAiEngineResponse(
    res: Awaited<ReturnType<AiEngineClient['getRecommendation']>>,
  ): RecommendationResult {
    const cautionsParts: string[] = [];
    if (res.cautions) cautionsParts.push(res.cautions);
    if (res.warnings && res.warnings.length > 0) {
      cautionsParts.push(res.warnings.join(' / '));
    }

    return {
      recommendations: (res.recommendations || []).map((r) => ({
        formula_name: r.formula_name,
        confidence_score: r.confidence_score,
        herbs: r.herbs || [],
        rationale: r.rationale,
        source: r.source || undefined,
        caseRefs: (r.case_refs || []) as string[],
      })),
      analysis: res.analysis || '',
      modifications: res.modifications || undefined,
      cautions: cautionsParts.join('\n\n') || undefined,
      note: res.safety_disclaimer || undefined,
      isAiGenerated: res.grounded !== false,
    };
  }

  private buildConstitutionContext(request: RecommendationRequest): string {
    const parts: string[] = [];
    if (request.bodyHeat) {
      const scoreText =
        request.bodyHeatScore !== undefined
          ? ` (점수 ${request.bodyHeatScore > 0 ? '+' : ''}${request.bodyHeatScore})`
          : '';
      parts.push(`체열(寒熱): ${this.getBodyHeatLabel(request.bodyHeat)}${scoreText}`);
    }
    if (request.bodyStrength) {
      const scoreText =
        request.bodyStrengthScore !== undefined
          ? ` (점수 ${request.bodyStrengthScore > 0 ? '+' : ''}${request.bodyStrengthScore})`
          : '';
      parts.push(`근실도(虛實): ${this.getBodyStrengthLabel(request.bodyStrength)}${scoreText}`);
    }
    return parts.join('\n');
  }

  /**
   * 체열/근실도 기반 처방 검증
   * 이종대 선생님 기준: 체열과 근실도가 맞지 않으면 처방 효과 감소/부작용 위험
   */
  private validateRecommendations(
    recommendations: FormulaRecommendation[],
    bodyHeat?: BodyHeat,
    bodyStrength?: BodyStrength,
  ): ConstitutionValidation {
    const warnings: ConstitutionWarning[] = [];

    // 처방별 한열/보사 성질 매핑 (주요 처방)
    const formulaProperties: Record<string, { heat: FormulaHeatNature; strength: FormulaStrengthNature }> = {
      // 온열성 처방 (한증 환자에 적합)
      '이중탕': { heat: FormulaHeatNature.WARM, strength: FormulaStrengthNature.TONIFYING },
      '사군자탕': { heat: FormulaHeatNature.NEUTRAL, strength: FormulaStrengthNature.TONIFYING },
      '육군자탕': { heat: FormulaHeatNature.WARM, strength: FormulaStrengthNature.TONIFYING },
      '보중익기탕': { heat: FormulaHeatNature.WARM, strength: FormulaStrengthNature.TONIFYING },
      '십전대보탕': { heat: FormulaHeatNature.WARM, strength: FormulaStrengthNature.TONIFYING },
      '팔물탕': { heat: FormulaHeatNature.NEUTRAL, strength: FormulaStrengthNature.TONIFYING },
      '귀비탕': { heat: FormulaHeatNature.WARM, strength: FormulaStrengthNature.TONIFYING },
      '팔미지황환': { heat: FormulaHeatNature.WARM, strength: FormulaStrengthNature.TONIFYING },
      '우귀음': { heat: FormulaHeatNature.HOT, strength: FormulaStrengthNature.TONIFYING },
      '부자이중탕': { heat: FormulaHeatNature.HOT, strength: FormulaStrengthNature.TONIFYING },
      '진무탕': { heat: FormulaHeatNature.HOT, strength: FormulaStrengthNature.TONIFYING },

      // 한량성 처방 (열증 환자에 적합)
      '백호탕': { heat: FormulaHeatNature.COLD, strength: FormulaStrengthNature.DRAINING },
      '황련해독탕': { heat: FormulaHeatNature.COLD, strength: FormulaStrengthNature.DRAINING },
      '용담사간탕': { heat: FormulaHeatNature.COLD, strength: FormulaStrengthNature.DRAINING },
      '육미지황환': { heat: FormulaHeatNature.COOL, strength: FormulaStrengthNature.TONIFYING },
      '좌귀음': { heat: FormulaHeatNature.COOL, strength: FormulaStrengthNature.TONIFYING },
      '천왕보심단': { heat: FormulaHeatNature.COOL, strength: FormulaStrengthNature.TONIFYING },
      '대승기탕': { heat: FormulaHeatNature.COLD, strength: FormulaStrengthNature.DRAINING },
      '소승기탕': { heat: FormulaHeatNature.COLD, strength: FormulaStrengthNature.DRAINING },

      // 평성 처방
      '소요산': { heat: FormulaHeatNature.NEUTRAL, strength: FormulaStrengthNature.NEUTRAL },
      '시호소간산': { heat: FormulaHeatNature.NEUTRAL, strength: FormulaStrengthNature.NEUTRAL },
      '소시호탕': { heat: FormulaHeatNature.NEUTRAL, strength: FormulaStrengthNature.NEUTRAL },
      '반하사심탕': { heat: FormulaHeatNature.NEUTRAL, strength: FormulaStrengthNature.NEUTRAL },
    };

    for (const rec of recommendations) {
      const props = formulaProperties[rec.formula_name];
      if (!props) continue; // 알려지지 않은 처방은 스킵

      // 체열 불일치 검사
      if (bodyHeat) {
        // 한증(寒證) 환자에게 한량성 처방
        if (bodyHeat === BodyHeat.COLD &&
            (props.heat === FormulaHeatNature.COLD || props.heat === FormulaHeatNature.COOL)) {
          warnings.push({
            type: 'critical',
            formulaName: rec.formula_name,
            message: `한체질(寒體質)에 한량성(寒凉性) 처방`,
            reason: `${rec.formula_name}은(는) 한량성 처방으로, 한체질 환자에게는 부작용(설사, 복통, 기력 저하)이 발생할 수 있습니다.`,
          });
        }

        // 열증(熱證) 환자에게 온열성 처방
        if (bodyHeat === BodyHeat.HOT &&
            (props.heat === FormulaHeatNature.HOT || props.heat === FormulaHeatNature.WARM)) {
          warnings.push({
            type: 'critical',
            formulaName: rec.formula_name,
            message: `열체질(熱體質)에 온열성(溫熱性) 처방`,
            reason: `${rec.formula_name}은(는) 온열성 처방으로, 열체질 환자에게는 화(火) 증상 악화(얼굴 홍조, 구건, 불면)가 발생할 수 있습니다.`,
          });
        }
      }

      // 근실도 불일치 검사
      if (bodyStrength) {
        // 허약(虛弱) 환자에게 사하(瀉下) 처방
        if (bodyStrength === BodyStrength.DEFICIENT &&
            props.strength === FormulaStrengthNature.DRAINING) {
          warnings.push({
            type: 'critical',
            formulaName: rec.formula_name,
            message: `허약체질(虛弱體質)에 사하성(瀉下性) 처방`,
            reason: `${rec.formula_name}은(는) 사하성 처방으로, 허약 환자에게는 정기 손상 및 기력 저하가 발생할 수 있습니다.`,
          });
        }

        // 실증(實證) 환자에게 과도한 보익 처방 (경고 수준)
        if (bodyStrength === BodyStrength.EXCESS &&
            props.strength === FormulaStrengthNature.TONIFYING) {
          warnings.push({
            type: 'info',
            formulaName: rec.formula_name,
            message: `실증(實證) 환자에게 보익(補益) 처방`,
            reason: `${rec.formula_name}은(는) 보익 처방입니다. 실증 환자에게는 사기(邪氣) 배출이 우선일 수 있습니다.`,
          });
        }
      }
    }

    return {
      isValid: !warnings.some(w => w.type === 'critical'),
      warnings,
    };
  }

  /**
   * 체열/근실도 한글 라벨 변환
   */
  getBodyHeatLabel(heat: BodyHeat): string {
    switch (heat) {
      case BodyHeat.COLD: return '한(寒)';
      case BodyHeat.HOT: return '열(熱)';
      default: return '평(平)';
    }
  }

  getBodyStrengthLabel(strength: BodyStrength): string {
    switch (strength) {
      case BodyStrength.DEFICIENT: return '허(虛)';
      case BodyStrength.EXCESS: return '실(實)';
      default: return '평(平)';
    }
  }
}
