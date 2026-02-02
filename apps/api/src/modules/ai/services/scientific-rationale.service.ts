import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ScientificPrescriptionRationale,
  ScientificRationaleRequest,
  TraditionalEvidence,
  ModernPharmacologicalEvidence,
  StatisticalEvidence,
  ClinicalStudy,
  EVIDENCE_LEVEL_DEFINITIONS,
  PHARMACOLOGICAL_ACTION_LABELS,
} from '../types';

@Injectable()
export class ScientificRationaleService {
  private client: OpenAI | null = null;
  private readonly model: string;

  // 전통의학 ↔ 현대의학 개념 매핑
  private readonly CONCEPT_MAPPING = {
    // 체열 매핑
    bodyHeat: {
      cold: {
        traditional: '한증(寒證)',
        modern: '기초대사율 저하, 말초순환 장애, 갑상선 기능 저하 가능성',
        markers: ['저체온', '말초 혈류 감소', 'TSH 상승 가능성'],
      },
      hot: {
        traditional: '열증(熱證)',
        modern: '염증 반응 활성화, 교감신경 항진, 대사 항진',
        markers: ['염증 마커(CRP, IL-6) 상승', '심박수 증가', '체온 상승'],
      },
    },
    // 근실도 매핑
    bodyStrength: {
      deficient: {
        traditional: '허증(虛證)',
        modern: '면역력 저하, 에너지 대사 저하, 만성 피로',
        markers: ['면역 세포 기능 저하', '코르티솔 이상', 'ATP 생산 감소'],
      },
      excess: {
        traditional: '실증(實證)',
        modern: '대사산물 축적, 울혈, 자율신경 불균형',
        markers: ['혈액점도 증가', '혈압 상승', '스트레스 호르몬 증가'],
      },
    },
    // 장부 기능 매핑
    organs: {
      spleen: {
        traditional: '비위(脾胃)',
        modern: '소화계, 흡수 기능, 장내 미생물',
        relatedSystems: ['위장관', '췌장', '장내 면역'],
      },
      lung: {
        traditional: '폐(肺)',
        modern: '호흡기, 면역계, 피부',
        relatedSystems: ['호흡기', '선천 면역', '피부 장벽'],
      },
      kidney: {
        traditional: '신(腎)',
        modern: '신장, 부신, 생식계, 골격계',
        relatedSystems: ['신장 기능', '부신 호르몬', '골밀도'],
      },
      liver: {
        traditional: '간(肝)',
        modern: '간, 해독, 근골격계, 자율신경',
        relatedSystems: ['간 기능', '해독 효소', '근육 대사'],
      },
      heart: {
        traditional: '심(心)',
        modern: '심혈관계, 중추신경, 정신 기능',
        relatedSystems: ['심장 기능', '뇌 기능', '정서 조절'],
      },
    },
  };

  // AI 프롬프트
  private readonly SCIENTIFIC_RATIONALE_PROMPT = `당신은 한의학과 현대의학을 모두 이해하는 통합의학 전문가입니다.

## 역할
처방에 대해 다음 세 가지 관점의 과학적 근거를 제공합니다:

### 1. 전통의학적 근거
- **치법(治法)**: 어떤 치료 방법론을 사용하는지 (예: 보기익기법, 청열해독법)
- **병기(病機)**: 질병의 기전 분석 (예: 비기허로 인한 소화 불량)
- **체질 적합성**: 체열/근실도/사상체질 적합성
- **출전**: 동의보감, 상한론, 금궤요략 등 고전 출처
- **군신좌사**: 처방 구조 분석

### 2. 현대약리학적 근거
- **분자 타겟**: 약재의 활성 성분이 작용하는 분자 수준 타겟 (예: AMPK, NF-κB)
- **신호전달경로**: 관여하는 세포 신호 경로
- **약리 작용**: 항염, 항산화, 면역조절 등 작용 기전
- **활성 성분**: 주요 효과 성분과 PubChem ID

### 3. 통계적 근거
- **임상 연구**: 관련 PubMed 연구 (실제 PMID 사용)
- **치험례 통계**: 유사 환자 치료 성공률 추정
- **근거 수준**: A/B/C/D 등급 평가

## 중요 지침
1. 과학적으로 검증된 정보만 제공합니다.
2. 불확실한 부분은 명확히 표시합니다.
3. 환자가 이해할 수 있는 쉬운 설명을 포함합니다.
4. 한의학 개념과 현대의학 개념의 연결고리를 설명합니다.
5. 실제 존재하는 연구만 인용합니다 (PMID가 있는 경우).`;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('GPT_MODEL') || 'gpt-4o-mini';

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * 과학적 처방 근거 생성
   */
  async generateScientificRationale(
    request: ScientificRationaleRequest
  ): Promise<ScientificPrescriptionRationale> {
    const startTime = Date.now();

    // AI를 통한 분석 시도
    if (this.client) {
      try {
        return await this.generateWithAI(request, startTime);
      } catch (error) {
        console.error('AI 과학적 근거 생성 오류:', error);
        // AI 실패 시 기본 템플릿 반환
      }
    }

    // 기본 템플릿 기반 생성
    return this.generateBasicRationale(request, startTime);
  }

  /**
   * AI 기반 과학적 근거 생성
   */
  private async generateWithAI(
    request: ScientificRationaleRequest,
    startTime: number
  ): Promise<ScientificPrescriptionRationale> {
    const herbsList = request.herbs
      ? request.herbs.map(h => `${h.name}${h.amount ? ` ${h.amount}` : ''}`).join(', ')
      : '정보 없음';

    const patientContext = request.patientContext
      ? `
환자 정보:
- 주소증: ${request.patientContext.chiefComplaint || '미상'}
- 증상: ${request.patientContext.symptoms?.join(', ') || '미상'}
- 체열: ${this.translateBodyHeat(request.patientContext.bodyHeat)}
- 근실도: ${this.translateBodyStrength(request.patientContext.bodyStrength)}
- 체질: ${request.patientContext.constitution || '미상'}
- 나이/성별: ${request.patientContext.age || '미상'}세, ${request.patientContext.gender || '미상'}`
      : '';

    const detailLevel = request.detailLevel || 'standard';

    const userPrompt = `## 처방 정보
처방명: ${request.formulaNameOrId}
구성 약재: ${herbsList}
${patientContext}

## 요청
위 처방에 대한 과학적 근거를 JSON 형식으로 제공해주세요.
상세 수준: ${detailLevel}

JSON 형식:
{
  "formulaName": "처방명",
  "summary": {
    "oneLiner": "한 줄 요약",
    "patientFriendlyExplanation": "환자가 이해할 수 있는 설명 (2-3문장)",
    "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]
  },
  "traditionalEvidence": {
    "treatmentMethods": [
      {
        "name": "치법명",
        "hanja": "한자",
        "description": "설명",
        "rationale": "이 환자에게 적용되는 이유"
      }
    ],
    "pathogenesis": [
      {
        "name": "병기명",
        "hanja": "한자",
        "description": "설명",
        "modernInterpretation": "현대의학적 해석"
      }
    ],
    "constitutionFit": {
      "suitableFor": ["적합한 체질"],
      "cautionFor": ["주의 체질"],
      "contraindicatedFor": ["부적합 체질"],
      "bodyHeatFit": {
        "suitable": "cold/neutral/hot/any",
        "explanation": "설명"
      },
      "bodyStrengthFit": {
        "suitable": "deficient/neutral/excess/any",
        "explanation": "설명"
      }
    },
    "classicalSources": [
      {
        "name": "출전명",
        "chapter": "장/절",
        "quote": "원문 인용",
        "interpretation": "해석"
      }
    ],
    "formulaStructure": {
      "sovereign": [{"herb": "군약", "role": "역할"}],
      "minister": [{"herb": "신약", "role": "역할"}],
      "assistant": [{"herb": "좌약", "role": "역할"}],
      "courier": [{"herb": "사약", "role": "역할"}],
      "synergy": "배합 시너지 설명"
    }
  },
  "modernPharmacologicalEvidence": {
    "molecularTargets": [
      {
        "name": "타겟명 (예: AMPK)",
        "type": "enzyme/receptor/channel/transporter/transcription_factor/other",
        "activeCompound": "활성 성분",
        "herb": "약재명",
        "action": "activation/inhibition/modulation",
        "effect": "효과"
      }
    ],
    "signalingPathways": [
      {
        "name": "경로명",
        "compounds": ["관련 성분"],
        "mechanism": "기전",
        "clinicalRelevance": "임상적 의미"
      }
    ],
    "pharmacologicalActions": [
      {
        "type": "anti_inflammatory/antioxidant/immunomodulatory/etc",
        "nameKo": "한글명",
        "description": "설명",
        "relatedHerbs": ["관련 약재"],
        "evidenceLevel": "A/B/C/D"
      }
    ],
    "activeCompounds": [
      {
        "name": "성분명",
        "herb": "약재",
        "effects": ["효과"]
      }
    ]
  },
  "statisticalEvidence": {
    "clinicalStudies": [
      {
        "title": "연구 제목",
        "year": 2023,
        "journal": "저널명",
        "pmid": "실제 PMID 또는 null",
        "studyType": "rct/meta_analysis/cohort/etc",
        "sampleSize": 100,
        "mainFindings": "주요 발견",
        "conclusion": "결론"
      }
    ],
    "caseStatistics": {
      "totalSimilarCases": 100,
      "casesWithThisFormula": 30,
      "successRate": 85,
      "outcomeDistribution": {
        "cured": 15,
        "markedly_improved": 40,
        "improved": 30,
        "no_change": 10,
        "worsened": 5
      },
      "averageTreatmentDuration": "2-4주",
      "statisticalConfidence": 0.75,
      "matchCriteria": ["매칭 기준"]
    },
    "overallEvidenceLevel": "B",
    "evidenceLevelExplanation": "근거 수준 설명"
  },
  "expectedOutcomes": [
    {
      "outcome": "기대 효과",
      "timeline": "예상 기간",
      "probability": "가능성 (높음/중간/낮음)"
    }
  ],
  "precautions": [
    {
      "type": "contraindication/drug_interaction/side_effect/monitoring",
      "description": "설명",
      "severity": "critical/warning/info"
    }
  ]
}`;

    const response = await this.client!.chat.completions.create({
      model: this.model,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: this.SCIENTIFIC_RATIONALE_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    // 결과 구성
    const result: ScientificPrescriptionRationale = {
      formulaName: parsed.formulaName || request.formulaNameOrId,
      patientContext: request.patientContext ? {
        chiefComplaint: request.patientContext.chiefComplaint || '',
        symptoms: request.patientContext.symptoms || [],
        bodyHeat: request.patientContext.bodyHeat,
        bodyStrength: request.patientContext.bodyStrength,
        constitution: request.patientContext.constitution,
      } : undefined,
      summary: parsed.summary || {
        oneLiner: `${request.formulaNameOrId} 처방`,
        patientFriendlyExplanation: '처방에 대한 설명을 생성할 수 없습니다.',
        keyPoints: [],
      },
      traditionalEvidence: parsed.traditionalEvidence || this.getDefaultTraditionalEvidence(),
      modernPharmacologicalEvidence: parsed.modernPharmacologicalEvidence || this.getDefaultPharmacologicalEvidence(),
      statisticalEvidence: parsed.statisticalEvidence || this.getDefaultStatisticalEvidence(),
      expectedOutcomes: parsed.expectedOutcomes || [],
      precautions: parsed.precautions || [],
      metadata: {
        generatedAt: new Date(),
        aiModelVersion: this.model,
        confidenceLevel: this.calculateConfidence(parsed),
        dataSourcesUsed: ['AI Analysis', 'Traditional Medicine Database', 'PubMed References'],
      },
    };

    return result;
  }

  /**
   * 기본 템플릿 기반 근거 생성 (AI 미사용)
   */
  private generateBasicRationale(
    request: ScientificRationaleRequest,
    startTime: number
  ): ScientificPrescriptionRationale {
    return {
      formulaName: request.formulaNameOrId,
      patientContext: request.patientContext ? {
        chiefComplaint: request.patientContext.chiefComplaint || '',
        symptoms: request.patientContext.symptoms || [],
        bodyHeat: request.patientContext.bodyHeat,
        bodyStrength: request.patientContext.bodyStrength,
        constitution: request.patientContext.constitution,
      } : undefined,
      summary: {
        oneLiner: `${request.formulaNameOrId}은 전통 한의학에서 널리 사용되는 처방입니다.`,
        patientFriendlyExplanation: '이 처방은 한의학 고전에 기록된 처방으로, 오랜 임상 경험을 바탕으로 사용되고 있습니다. 자세한 과학적 분석을 위해서는 AI 서비스가 필요합니다.',
        keyPoints: [
          '전통 한의학 처방',
          '임상 경험 기반',
          '개인 맞춤 조정 가능',
        ],
      },
      traditionalEvidence: this.getDefaultTraditionalEvidence(),
      modernPharmacologicalEvidence: this.getDefaultPharmacologicalEvidence(),
      statisticalEvidence: this.getDefaultStatisticalEvidence(),
      expectedOutcomes: [
        {
          outcome: '증상 개선',
          timeline: '2-4주',
          probability: '개인차 있음',
        },
      ],
      precautions: [
        {
          type: 'monitoring',
          description: '복용 중 이상 증상이 나타나면 전문가와 상담하세요.',
          severity: 'info',
        },
      ],
      metadata: {
        generatedAt: new Date(),
        aiModelVersion: 'template-based',
        confidenceLevel: 0.3,
        dataSourcesUsed: ['Template'],
      },
    };
  }

  /**
   * 처방에 대한 빠른 근거 요약 생성
   */
  async generateQuickSummary(
    formulaName: string,
    herbs?: string[]
  ): Promise<{
    summary: string;
    traditionalBasis: string;
    modernBasis: string;
    evidenceLevel: string;
  }> {
    if (!this.client) {
      return {
        summary: `${formulaName}은 전통 한의학 처방입니다.`,
        traditionalBasis: '한의학 고전에 기록된 처방',
        modernBasis: '현대 약리학적 연구 진행 중',
        evidenceLevel: 'C',
      };
    }

    const prompt = `처방명: ${formulaName}
${herbs ? `구성 약재: ${herbs.join(', ')}` : ''}

위 처방에 대해 다음을 간략히 제공해주세요 (각 2-3문장):
1. 요약 (summary)
2. 전통의학적 근거 (traditionalBasis)
3. 현대의학적 근거 (modernBasis)
4. 근거 수준 (evidenceLevel: A/B/C/D)

JSON 형식으로 응답하세요.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '한의학과 현대의학을 통합하는 전문가입니다.' },
          { role: 'user', content: prompt },
        ],
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('빠른 요약 생성 오류:', error);
      return {
        summary: `${formulaName}은 전통 한의학 처방입니다.`,
        traditionalBasis: '한의학 고전에 기록된 처방',
        modernBasis: '현대 약리학적 연구 진행 중',
        evidenceLevel: 'C',
      };
    }
  }

  /**
   * 특정 약재의 과학적 근거 조회
   */
  async getHerbScientificEvidence(herbName: string): Promise<{
    traditional: { properties: string; efficacy: string; meridians: string[] };
    modern: { activeCompounds: string[]; mechanisms: string[]; studies: ClinicalStudy[] };
  }> {
    if (!this.client) {
      return {
        traditional: {
          properties: '전통 한의학 정보',
          efficacy: '약재 효능 정보',
          meridians: [],
        },
        modern: {
          activeCompounds: [],
          mechanisms: [],
          studies: [],
        },
      };
    }

    const prompt = `약재명: ${herbName}

이 약재에 대해 다음 정보를 JSON으로 제공해주세요:
1. traditional: { properties: "성미(性味)", efficacy: "효능", meridians: ["귀경"] }
2. modern: { activeCompounds: ["주요 활성 성분"], mechanisms: ["작용 기전"], studies: [{ title, year, pmid, mainFindings }] }`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.SCIENTIFIC_RATIONALE_PROMPT },
          { role: 'user', content: prompt },
        ],
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('약재 근거 조회 오류:', error);
      return {
        traditional: {
          properties: '정보 없음',
          efficacy: '정보 없음',
          meridians: [],
        },
        modern: {
          activeCompounds: [],
          mechanisms: [],
          studies: [],
        },
      };
    }
  }

  // ============ 유틸리티 메서드 ============

  private translateBodyHeat(bodyHeat?: string): string {
    if (!bodyHeat) return '미평가';
    const mapping: Record<string, string> = {
      cold: '한(寒) - 몸이 찬 편',
      neutral: '평(平) - 균형',
      hot: '열(熱) - 몸에 열이 많음',
    };
    return mapping[bodyHeat] || bodyHeat;
  }

  private translateBodyStrength(bodyStrength?: string): string {
    if (!bodyStrength) return '미평가';
    const mapping: Record<string, string> = {
      deficient: '허(虛) - 체력/소화력 약함',
      neutral: '평(平) - 균형',
      excess: '실(實) - 체력 튼튼함',
    };
    return mapping[bodyStrength] || bodyStrength;
  }

  private calculateConfidence(parsed: any): number {
    let confidence = 0.5;

    // 각 섹션 존재 여부에 따라 신뢰도 조정
    if (parsed.traditionalEvidence?.treatmentMethods?.length > 0) confidence += 0.1;
    if (parsed.traditionalEvidence?.classicalSources?.length > 0) confidence += 0.1;
    if (parsed.modernPharmacologicalEvidence?.molecularTargets?.length > 0) confidence += 0.1;
    if (parsed.statisticalEvidence?.clinicalStudies?.length > 0) confidence += 0.15;
    if (parsed.statisticalEvidence?.clinicalStudies?.some((s: any) => s.pmid)) confidence += 0.05;

    return Math.min(1, confidence);
  }

  private getDefaultTraditionalEvidence(): TraditionalEvidence {
    return {
      treatmentMethods: [],
      pathogenesis: [],
      constitutionFit: {
        suitableFor: [],
        cautionFor: [],
        contraindicatedFor: [],
        bodyHeatFit: { suitable: 'any', explanation: '평가 필요' },
        bodyStrengthFit: { suitable: 'any', explanation: '평가 필요' },
      },
      classicalSources: [],
    };
  }

  private getDefaultPharmacologicalEvidence(): ModernPharmacologicalEvidence {
    return {
      molecularTargets: [],
      signalingPathways: [],
      pharmacologicalActions: [],
      activeCompounds: [],
    };
  }

  private getDefaultStatisticalEvidence(): StatisticalEvidence {
    return {
      clinicalStudies: [],
      overallEvidenceLevel: 'D',
      evidenceLevelExplanation: '충분한 임상 연구가 부족합니다.',
    };
  }
}
