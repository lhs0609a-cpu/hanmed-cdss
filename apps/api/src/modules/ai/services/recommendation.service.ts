import { Injectable } from '@nestjs/common';
import { LlmService, RecommendationResult, FormulaRecommendation } from './llm.service';
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
  // 체열/근실도 (이종대 선생님 기준) - 필수
  bodyHeat?: BodyHeat;
  bodyStrength?: BodyStrength;
  bodyHeatScore?: number;      // -10 ~ +10
  bodyStrengthScore?: number;  // -10 ~ +10
  chiefComplaint: string;
  symptoms: SymptomInput[];
  currentMedications?: string[];
  topK?: number;
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
export interface ValidatedRecommendationResult extends RecommendationResult {
  constitutionValidation?: ConstitutionValidation;
}

@Injectable()
export class RecommendationService {
  constructor(private llmService: LlmService) {}

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

    const patientInfo = {
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
    };

    const result = await this.llmService.generateRecommendation(patientInfo);

    // 체열/근실도 기반 처방 검증
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
      constitutionValidation: validation,
    };
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
