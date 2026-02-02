import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  PatientHealthScore,
  OrganFunctionScores,
  BodyStateInterpretation,
  ScoreEvidence,
  HealthScoreTrend,
} from '../../../database/entities/patient-health-score.entity';

/**
 * 건강 점수 계산 입력 데이터
 */
export interface HealthScoreInput {
  patientId: string;
  patientRecordId?: string;

  // 증상 정보
  symptoms: Array<{
    name: string;
    severity?: number; // 1-10
    duration?: string;
    location?: string;
  }>;

  // 진단 정보
  diagnosis?: string;
  patternDiagnosis?: string; // 변증
  constitution?: string; // 체질

  // 체열/근실도 (선택적, 입력되면 직접 사용)
  bodyHeat?: 'cold' | 'neutral' | 'hot';
  bodyStrength?: 'deficient' | 'neutral' | 'excess';
  bodyHeatScore?: number;
  bodyStrengthScore?: number;

  // 활력 징후 및 건강 지표
  vitalSigns?: {
    sleepQuality?: number; // 1-10
    energyLevel?: number; // 1-10
    appetite?: number; // 1-10
    stressLevel?: number; // 1-10
    painLevel?: number; // 1-10
  };

  // 건강 기록 (HealthJournal 데이터)
  recentHealthData?: Array<{
    overallCondition?: number;
    painLevel?: number;
    energyLevel?: number;
    sleepQuality?: number;
  }>;

  // 이전 점수 (트렌드 계산용)
  previousScore?: {
    overallHealthIndex: number;
    evaluatedAt: Date;
  };
}

/**
 * 건강 점수 계산 결과
 */
export interface HealthScoreResult {
  bodyHeatScore: number;
  bodyHeatInterpretation: BodyStateInterpretation;
  bodyStrengthScore: number;
  bodyStrengthInterpretation: BodyStateInterpretation;
  circulationScore: number;
  circulationInterpretation: string;
  organFunctionScores: OrganFunctionScores;
  organInterpretations: Record<string, string>;
  overallHealthIndex: number;
  overallInterpretation: string;
  confidenceLevel: number;
  confidenceExplanation: string;
  scoreEvidence: ScoreEvidence[];
  trend?: HealthScoreTrend;
  aiModelVersion?: string;
  aiAnalysisMetadata?: {
    inputSymptoms?: string[];
    inputDiagnosis?: string;
    processingTime?: number;
    promptVersion?: string;
  };
}

@Injectable()
export class HealthScoreCalculatorService {
  private client: OpenAI | null = null;
  private readonly model: string;
  private readonly promptVersion = '1.0.0';

  private readonly HEALTH_SCORE_SYSTEM_PROMPT = `당신은 한의학 전문가로서 환자의 건강 상태를 수치화하여 평가하는 AI입니다.

## 역할
환자의 증상, 진단, 건강 데이터를 분석하여 다음 지표를 계산합니다:

### 1. 체열 점수 (寒熱) [-10 ~ +10]
- -10: 극한(極寒) - 극심한 대사 저하, 사지냉증, 설사 경향
- -5: 한(寒) - 찬 것 싫어함, 따뜻한 것 선호
- 0: 평(平) - 균형 상태
- +5: 열(熱) - 더운 것 싫어함, 찬 것 선호
- +10: 극열(極熱) - 심한 염증 반응, 갈증, 구건

#### 현대 의학적 해석
- 한증 → 기초대사율 저하, 말초순환 장애, 갑상선 기능 저하 가능성
- 열증 → 염증 반응 활성, 교감신경 항진, 대사 항진

### 2. 근실도 점수 (虛實) [-10 ~ +10]
- -10: 극허(極虛) - 극심한 기력 저하, 무력감
- -5: 허(虛) - 피로감, 소화력 약함
- 0: 평(平) - 균형 상태
- +5: 실(實) - 체력 충만, 울체 경향
- +10: 극실(極實) - 과잉/정체/울체

#### 현대 의학적 해석
- 허증 → 면역력 저하, 에너지 결핍, 피로 증후군
- 실증 → 대사산물 축적, 울혈, 자율신경 불균형

### 3. 기혈순환도 [0-100]
혈액순환 및 에너지 흐름 상태

### 4. 장부 기능 점수 [0-100 각각]
- 비위(脾胃): 소화 기능
- 폐(肺): 호흡/면역 기능
- 신(腎): 신장/생식/골격 기능
- 간(肝): 간/해독/근육 기능
- 심(心): 심장/순환/정신 기능

### 5. 종합 건강 지수 [0-100]
모든 지표를 종합한 전체 건강 상태

## 평가 원칙
1. 증상의 심각도와 지속 기간을 고려합니다.
2. 한의학 이론과 현대 의학적 해석을 모두 제공합니다.
3. 불확실한 부분은 신뢰도에 반영합니다.
4. 근거를 명확히 제시합니다.`;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('GPT_MODEL') || 'gpt-4o-mini';

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * 건강 점수 계산
   */
  async calculateHealthScore(input: HealthScoreInput): Promise<HealthScoreResult> {
    const startTime = Date.now();

    // AI를 통한 분석 시도
    if (this.client) {
      try {
        const aiResult = await this.calculateWithAI(input);
        aiResult.aiAnalysisMetadata = {
          ...aiResult.aiAnalysisMetadata,
          processingTime: Date.now() - startTime,
          promptVersion: this.promptVersion,
        };

        // 이전 점수가 있으면 트렌드 계산
        if (input.previousScore) {
          aiResult.trend = this.calculateTrend(
            input.previousScore.overallHealthIndex,
            aiResult.overallHealthIndex
          );
        }

        return aiResult;
      } catch (error) {
        console.error('AI 건강 점수 계산 오류:', error);
        // AI 실패 시 규칙 기반으로 폴백
      }
    }

    // 규칙 기반 계산 (AI 미설정 또는 실패 시)
    const ruleBasedResult = this.calculateWithRules(input);

    if (input.previousScore) {
      ruleBasedResult.trend = this.calculateTrend(
        input.previousScore.overallHealthIndex,
        ruleBasedResult.overallHealthIndex
      );
    }

    return ruleBasedResult;
  }

  /**
   * AI 기반 건강 점수 계산
   */
  private async calculateWithAI(input: HealthScoreInput): Promise<HealthScoreResult> {
    const symptomsList = input.symptoms.map(s =>
      `${s.name}${s.severity ? `(심각도: ${s.severity}/10)` : ''}${s.duration ? `, 기간: ${s.duration}` : ''}`
    ).join('\n- ');

    const vitalSignsText = input.vitalSigns ? `
- 수면의 질: ${input.vitalSigns.sleepQuality ?? '미측정'}/10
- 에너지 수준: ${input.vitalSigns.energyLevel ?? '미측정'}/10
- 식욕: ${input.vitalSigns.appetite ?? '미측정'}/10
- 스트레스: ${input.vitalSigns.stressLevel ?? '미측정'}/10
- 통증: ${input.vitalSigns.painLevel ?? '미측정'}/10` : '미측정';

    const userPrompt = `## 환자 건강 데이터

### 증상
- ${symptomsList}

### 진단 정보
- 진단: ${input.diagnosis || '미상'}
- 변증: ${input.patternDiagnosis || '미상'}
- 체질: ${input.constitution || '미상'}

### 활력 징후
${vitalSignsText}

### 기존 평가 (있는 경우)
- 체열: ${input.bodyHeat || '미평가'}${input.bodyHeatScore !== undefined ? ` (점수: ${input.bodyHeatScore})` : ''}
- 근실도: ${input.bodyStrength || '미평가'}${input.bodyStrengthScore !== undefined ? ` (점수: ${input.bodyStrengthScore})` : ''}

## 요청
위 데이터를 분석하여 다음 JSON 형식으로 건강 점수를 제공해주세요:

{
  "bodyHeatScore": number (-10 ~ +10),
  "bodyHeatInterpretation": {
    "traditional": "한의학적 해석",
    "modern": "현대의학적 해석",
    "relatedSymptoms": ["관련 증상들"],
    "recommendations": ["생활 지침"]
  },
  "bodyStrengthScore": number (-10 ~ +10),
  "bodyStrengthInterpretation": {
    "traditional": "한의학적 해석",
    "modern": "현대의학적 해석",
    "relatedSymptoms": ["관련 증상들"],
    "recommendations": ["생활 지침"]
  },
  "circulationScore": number (0-100),
  "circulationInterpretation": "순환 상태 해석",
  "organFunctionScores": {
    "spleen": number (0-100),
    "lung": number (0-100),
    "kidney": number (0-100),
    "liver": number (0-100),
    "heart": number (0-100)
  },
  "organInterpretations": {
    "spleen": "비위 기능 해석",
    "lung": "폐 기능 해석",
    "kidney": "신 기능 해석",
    "liver": "간 기능 해석",
    "heart": "심 기능 해석"
  },
  "overallHealthIndex": number (0-100),
  "overallInterpretation": "종합 건강 상태 해석",
  "confidenceLevel": number (0-1),
  "confidenceExplanation": "신뢰도 설명",
  "scoreEvidence": [
    {
      "factor": "평가 요소",
      "sourceData": "근거 데이터",
      "contribution": number,
      "confidence": number (0-1)
    }
  ]
}`;

    const response = await this.client!.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: this.HEALTH_SCORE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content) as HealthScoreResult;

    result.aiModelVersion = this.model;
    result.aiAnalysisMetadata = {
      inputSymptoms: input.symptoms.map(s => s.name),
      inputDiagnosis: input.diagnosis,
    };

    return result;
  }

  /**
   * 규칙 기반 건강 점수 계산 (AI 폴백)
   */
  private calculateWithRules(input: HealthScoreInput): HealthScoreResult {
    const evidence: ScoreEvidence[] = [];

    // 1. 체열 점수 계산
    let bodyHeatScore = input.bodyHeatScore ?? 0;
    if (!input.bodyHeatScore && input.bodyHeat) {
      bodyHeatScore = this.mapBodyHeatToScore(input.bodyHeat);
    }
    evidence.push({
      factor: '체열 평가',
      sourceData: input.bodyHeat || '직접 입력',
      contribution: Math.abs(bodyHeatScore) * 2,
      confidence: input.bodyHeatScore !== undefined ? 0.8 : 0.5,
    });

    // 2. 근실도 점수 계산
    let bodyStrengthScore = input.bodyStrengthScore ?? 0;
    if (!input.bodyStrengthScore && input.bodyStrength) {
      bodyStrengthScore = this.mapBodyStrengthToScore(input.bodyStrength);
    }
    evidence.push({
      factor: '근실도 평가',
      sourceData: input.bodyStrength || '직접 입력',
      contribution: Math.abs(bodyStrengthScore) * 2,
      confidence: input.bodyStrengthScore !== undefined ? 0.8 : 0.5,
    });

    // 3. 증상 기반 장부 기능 점수 계산
    const organScores = this.calculateOrganScoresFromSymptoms(input.symptoms);

    // 4. 활력 징후 기반 순환 점수 계산
    const circulationScore = this.calculateCirculationScore(input.vitalSigns);

    // 5. 종합 건강 지수 계산
    const organAverage = (
      organScores.spleen +
      organScores.lung +
      organScores.kidney +
      organScores.liver +
      organScores.heart
    ) / 5;

    const bodyHeatPenalty = Math.abs(bodyHeatScore) * 2; // 극단값일수록 감점
    const bodyStrengthPenalty = Math.abs(bodyStrengthScore) * 2;

    const overallHealthIndex = Math.max(0, Math.min(100,
      (organAverage * 0.4) +
      (circulationScore * 0.3) +
      ((100 - bodyHeatPenalty - bodyStrengthPenalty) * 0.3)
    ));

    // 6. 신뢰도 계산
    const confidenceLevel = this.calculateConfidence(input);

    return {
      bodyHeatScore,
      bodyHeatInterpretation: this.getBodyHeatInterpretation(bodyHeatScore),
      bodyStrengthScore,
      bodyStrengthInterpretation: this.getBodyStrengthInterpretation(bodyStrengthScore),
      circulationScore,
      circulationInterpretation: this.getCirculationInterpretation(circulationScore),
      organFunctionScores: organScores,
      organInterpretations: this.getOrganInterpretations(organScores),
      overallHealthIndex: Math.round(overallHealthIndex),
      overallInterpretation: this.getOverallInterpretation(overallHealthIndex),
      confidenceLevel,
      confidenceExplanation: `규칙 기반 계산 (입력 데이터 ${input.symptoms.length}개 증상 기반)`,
      scoreEvidence: evidence,
      aiModelVersion: 'rule-based',
    };
  }

  /**
   * 체열 enum을 점수로 변환
   */
  private mapBodyHeatToScore(bodyHeat: string): number {
    switch (bodyHeat) {
      case 'cold': return -5;
      case 'hot': return 5;
      default: return 0;
    }
  }

  /**
   * 근실도 enum을 점수로 변환
   */
  private mapBodyStrengthToScore(bodyStrength: string): number {
    switch (bodyStrength) {
      case 'deficient': return -5;
      case 'excess': return 5;
      default: return 0;
    }
  }

  /**
   * 증상 기반 장부 기능 점수 계산
   */
  private calculateOrganScoresFromSymptoms(
    symptoms: Array<{ name: string; severity?: number }>
  ): OrganFunctionScores {
    const baseScore = 70; // 기본 점수
    const scores: OrganFunctionScores = {
      spleen: baseScore,
      lung: baseScore,
      kidney: baseScore,
      liver: baseScore,
      heart: baseScore,
    };

    // 증상별 장부 영향 매핑
    const symptomOrganMap: Record<string, { organ: keyof OrganFunctionScores; impact: number }[]> = {
      '소화불량': [{ organ: 'spleen', impact: -15 }],
      '식욕부진': [{ organ: 'spleen', impact: -10 }],
      '설사': [{ organ: 'spleen', impact: -12 }],
      '변비': [{ organ: 'spleen', impact: -8 }, { organ: 'liver', impact: -5 }],
      '기침': [{ organ: 'lung', impact: -10 }],
      '호흡곤란': [{ organ: 'lung', impact: -15 }, { organ: 'heart', impact: -10 }],
      '감기': [{ organ: 'lung', impact: -8 }],
      '요통': [{ organ: 'kidney', impact: -10 }],
      '피로': [{ organ: 'kidney', impact: -8 }, { organ: 'spleen', impact: -5 }],
      '빈뇨': [{ organ: 'kidney', impact: -10 }],
      '두통': [{ organ: 'liver', impact: -10 }],
      '현기증': [{ organ: 'liver', impact: -8 }],
      '근육통': [{ organ: 'liver', impact: -8 }],
      '가슴답답함': [{ organ: 'heart', impact: -10 }],
      '불면': [{ organ: 'heart', impact: -12 }, { organ: 'kidney', impact: -5 }],
      '불안': [{ organ: 'heart', impact: -10 }],
    };

    for (const symptom of symptoms) {
      const effects = symptomOrganMap[symptom.name];
      if (effects) {
        for (const effect of effects) {
          const severityMultiplier = (symptom.severity || 5) / 5;
          scores[effect.organ] = Math.max(0, scores[effect.organ] + effect.impact * severityMultiplier);
        }
      }
    }

    return scores;
  }

  /**
   * 활력 징후 기반 순환 점수 계산
   */
  private calculateCirculationScore(vitalSigns?: HealthScoreInput['vitalSigns']): number {
    if (!vitalSigns) return 60;

    const factors = [
      vitalSigns.energyLevel ? vitalSigns.energyLevel * 10 : null,
      vitalSigns.sleepQuality ? vitalSigns.sleepQuality * 10 : null,
      vitalSigns.painLevel ? (10 - vitalSigns.painLevel) * 10 : null,
      vitalSigns.stressLevel ? (10 - vitalSigns.stressLevel) * 10 : null,
    ].filter((v): v is number => v !== null);

    if (factors.length === 0) return 60;
    return Math.round(factors.reduce((a, b) => a + b, 0) / factors.length);
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(input: HealthScoreInput): number {
    let confidence = 0.3; // 기본값

    // 증상 개수에 따른 신뢰도
    if (input.symptoms.length >= 3) confidence += 0.2;
    if (input.symptoms.length >= 5) confidence += 0.1;

    // 활력 징후 데이터 존재 여부
    if (input.vitalSigns) confidence += 0.15;

    // 진단 정보 존재 여부
    if (input.diagnosis) confidence += 0.1;
    if (input.patternDiagnosis) confidence += 0.1;

    // 체열/근실도 직접 입력 여부
    if (input.bodyHeatScore !== undefined) confidence += 0.05;
    if (input.bodyStrengthScore !== undefined) confidence += 0.05;

    return Math.min(1, confidence);
  }

  /**
   * 체열 해석 생성
   */
  private getBodyHeatInterpretation(score: number): BodyStateInterpretation {
    if (score <= -7) {
      return {
        traditional: '극한증(極寒證): 양기가 매우 부족하여 몸이 극도로 차가운 상태입니다.',
        modern: '기초대사율 저하, 갑상선 기능 저하 가능성, 심한 말초순환 장애가 의심됩니다.',
        relatedSymptoms: ['사지냉증', '복통', '설사', '추위 과민', '무력감'],
        recommendations: ['따뜻한 음식 섭취', '온열 요법', '과도한 냉방 피하기', '따뜻한 물 자주 마시기'],
      };
    } else if (score <= -3) {
      return {
        traditional: '한증(寒證): 양기가 부족하여 몸이 찬 편입니다.',
        modern: '말초순환 저하, 대사율 감소 경향이 있습니다.',
        relatedSymptoms: ['손발 차가움', '찬 것 싫어함', '소화력 약함'],
        recommendations: ['따뜻한 성질의 음식 섭취', '규칙적인 운동', '보온 주의'],
      };
    } else if (score <= 3) {
      return {
        traditional: '평(平): 한열이 균형을 이루고 있는 상태입니다.',
        modern: '체온 조절 기능이 정상적으로 작동하고 있습니다.',
        relatedSymptoms: [],
        recommendations: ['현재 상태 유지', '균형 잡힌 식단', '적절한 운동'],
      };
    } else if (score <= 7) {
      return {
        traditional: '열증(熱證): 체내에 열이 많은 상태입니다.',
        modern: '대사 항진, 경미한 염증 반응 가능성이 있습니다.',
        relatedSymptoms: ['더위 과민', '갈증', '얼굴 홍조', '변비 경향'],
        recommendations: ['시원한 성질의 음식 섭취', '수분 충분히 섭취', '과격한 운동 자제'],
      };
    } else {
      return {
        traditional: '극열증(極熱證): 체내에 심한 열이 축적된 상태입니다.',
        modern: '염증 반응 활성화, 자율신경 실조 가능성이 있습니다.',
        relatedSymptoms: ['심한 갈증', '구건', '불면', '조급함', '변비'],
        recommendations: ['열을 내리는 음식 섭취', '충분한 휴식', '스트레스 관리', '전문 진료 권장'],
      };
    }
  }

  /**
   * 근실도 해석 생성
   */
  private getBodyStrengthInterpretation(score: number): BodyStateInterpretation {
    if (score <= -7) {
      return {
        traditional: '극허증(極虛證): 정기가 매우 부족하여 기력이 극도로 저하된 상태입니다.',
        modern: '심한 면역력 저하, 만성 피로 증후군, 영양 결핍 가능성이 있습니다.',
        relatedSymptoms: ['극심한 피로', '기력 저하', '소화 불량', '어지러움', '자한'],
        recommendations: ['충분한 휴식', '영양가 있는 음식', '보익 처방 필요', '과로 금지'],
      };
    } else if (score <= -3) {
      return {
        traditional: '허증(虛證): 정기가 부족하여 체력이 약한 상태입니다.',
        modern: '면역력 저하 경향, 에너지 대사 저하가 있습니다.',
        relatedSymptoms: ['피로감', '식욕 부진', '무력감', '감기 잘 걸림'],
        recommendations: ['규칙적인 식사', '적절한 휴식', '과로 피하기', '보양 음식 섭취'],
      };
    } else if (score <= 3) {
      return {
        traditional: '평(平): 허실이 균형을 이루고 있는 상태입니다.',
        modern: '에너지 대사와 면역 기능이 균형 잡힌 상태입니다.',
        relatedSymptoms: [],
        recommendations: ['현재 상태 유지', '규칙적인 생활', '균형 잡힌 식단'],
      };
    } else if (score <= 7) {
      return {
        traditional: '실증(實證): 기혈이 충만하거나 울체된 상태입니다.',
        modern: '대사산물 축적, 울혈 경향이 있습니다.',
        relatedSymptoms: ['복부 팽만', '답답함', '스트레스', '근육 긴장'],
        recommendations: ['가벼운 운동', '스트레스 해소', '과식 주의', '순환 촉진'],
      };
    } else {
      return {
        traditional: '극실증(極實證): 기혈이 극도로 울체된 상태입니다.',
        modern: '심한 울혈, 대사증후군 위험, 고혈압 가능성이 있습니다.',
        relatedSymptoms: ['심한 복부 팽만', '두통', '흉민', '변비', '고혈압'],
        recommendations: ['활동량 증가', '담백한 식단', '사하/통경 치료 고려', '전문 진료 권장'],
      };
    }
  }

  /**
   * 순환 상태 해석
   */
  private getCirculationInterpretation(score: number): string {
    if (score >= 80) return '기혈순환이 원활하여 건강한 상태입니다.';
    if (score >= 60) return '기혈순환이 양호하나 약간의 개선이 필요합니다.';
    if (score >= 40) return '기혈순환에 어느 정도 문제가 있어 관리가 필요합니다.';
    return '기혈순환이 원활하지 않아 적극적인 치료가 필요합니다.';
  }

  /**
   * 장부별 해석
   */
  private getOrganInterpretations(scores: OrganFunctionScores): Record<string, string> {
    const getInterpretation = (score: number, organName: string): string => {
      if (score >= 80) return `${organName} 기능이 양호합니다.`;
      if (score >= 60) return `${organName} 기능이 약간 저하되어 있습니다.`;
      if (score >= 40) return `${organName} 기능 저하가 있어 관리가 필요합니다.`;
      return `${organName} 기능이 많이 저하되어 적극적인 치료가 필요합니다.`;
    };

    return {
      spleen: getInterpretation(scores.spleen, '비위(소화)'),
      lung: getInterpretation(scores.lung, '폐(호흡/면역)'),
      kidney: getInterpretation(scores.kidney, '신(신장/골격)'),
      liver: getInterpretation(scores.liver, '간(해독/근육)'),
      heart: getInterpretation(scores.heart, '심(순환/정신)'),
    };
  }

  /**
   * 종합 건강 해석
   */
  private getOverallInterpretation(index: number): string {
    if (index >= 80) return '전반적으로 건강한 상태입니다. 현재의 생활습관을 유지하세요.';
    if (index >= 60) return '양호한 상태이나 일부 개선이 필요합니다. 규칙적인 생활과 적절한 관리를 권장합니다.';
    if (index >= 40) return '건강 관리가 필요한 상태입니다. 생활습관 개선과 정기적인 진료를 권장합니다.';
    return '건강 상태가 좋지 않습니다. 전문적인 진료와 적극적인 치료가 필요합니다.';
  }

  /**
   * 트렌드 계산
   */
  private calculateTrend(previousScore: number, currentScore: number): HealthScoreTrend {
    const change = currentScore - previousScore;
    let direction: HealthScoreTrend['direction'] = 'stable';
    let interpretation = '';

    if (change >= 5) {
      direction = 'improving';
      interpretation = `이전 대비 ${change}점 상승했습니다. 건강 상태가 호전되고 있습니다.`;
    } else if (change <= -5) {
      direction = 'declining';
      interpretation = `이전 대비 ${Math.abs(change)}점 하락했습니다. 건강 관리에 더 신경 써주세요.`;
    } else {
      interpretation = '이전과 비슷한 건강 상태를 유지하고 있습니다.';
    }

    return {
      changeFromLast: change,
      direction,
      interpretation,
    };
  }
}
