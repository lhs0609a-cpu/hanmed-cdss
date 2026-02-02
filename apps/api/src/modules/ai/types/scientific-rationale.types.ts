/**
 * 과학적 처방 근거 타입 정의
 * 전통의학 + 현대의학 + 통계적 근거를 통합
 */

// ============ 전통의학적 근거 ============

/**
 * 치법 (治法) - 치료 방법론
 */
export interface TreatmentMethod {
  /** 치법 이름 (예: 보기익기법) */
  name: string;
  /** 한자 표기 */
  hanja?: string;
  /** 설명 */
  description: string;
  /** 적용 근거 */
  rationale: string;
}

/**
 * 병기 (病機) - 질병의 기전
 */
export interface PathogenesisMechanism {
  /** 병기 이름 (예: 비기허) */
  name: string;
  /** 한자 표기 */
  hanja?: string;
  /** 설명 */
  description: string;
  /** 현대의학적 해석 */
  modernInterpretation?: string;
}

/**
 * 체질 적합성
 */
export interface ConstitutionFit {
  /** 적합한 체질 */
  suitableFor: string[];
  /** 주의가 필요한 체질 */
  cautionFor: string[];
  /** 부적합한 체질 */
  contraindicatedFor: string[];
  /** 체열 적합성 */
  bodyHeatFit: {
    suitable: 'cold' | 'neutral' | 'hot' | 'any';
    explanation: string;
  };
  /** 근실도 적합성 */
  bodyStrengthFit: {
    suitable: 'deficient' | 'neutral' | 'excess' | 'any';
    explanation: string;
  };
}

/**
 * 전통의학적 근거
 */
export interface TraditionalEvidence {
  /** 치법 */
  treatmentMethods: TreatmentMethod[];
  /** 병기 분석 */
  pathogenesis: PathogenesisMechanism[];
  /** 체질 적합성 */
  constitutionFit: ConstitutionFit;
  /** 출전 (동의보감, 상한론 등) */
  classicalSources: Array<{
    name: string;
    chapter?: string;
    quote?: string;
    interpretation?: string;
  }>;
  /** 군신좌사 분석 */
  formulaStructure?: {
    sovereign: Array<{ herb: string; role: string }>;  // 군약
    minister: Array<{ herb: string; role: string }>;   // 신약
    assistant: Array<{ herb: string; role: string }>;  // 좌약
    courier: Array<{ herb: string; role: string }>;    // 사약
    synergy: string;  // 배합 시너지 설명
  };
}

// ============ 현대약리학적 근거 ============

/**
 * 분자 타겟
 */
export interface MolecularTarget {
  /** 타겟 이름 (예: AMPK, NF-κB) */
  name: string;
  /** 타겟 유형 */
  type: 'enzyme' | 'receptor' | 'channel' | 'transporter' | 'transcription_factor' | 'other';
  /** 활성 성분 */
  activeCompound: string;
  /** 약재 */
  herb: string;
  /** 작용 (활성화/억제) */
  action: 'activation' | 'inhibition' | 'modulation';
  /** 효과 설명 */
  effect: string;
}

/**
 * 신호전달경로
 */
export interface SignalingPathway {
  /** 경로 이름 */
  name: string;
  /** 관련 성분 */
  compounds: string[];
  /** 작용 기전 */
  mechanism: string;
  /** 임상적 의미 */
  clinicalRelevance: string;
}

/**
 * 약리 작용
 */
export interface PharmacologicalAction {
  /** 작용 유형 */
  type:
    | 'anti_inflammatory'    // 항염
    | 'antioxidant'          // 항산화
    | 'immunomodulatory'     // 면역조절
    | 'analgesic'            // 진통
    | 'antibacterial'        // 항균
    | 'antiviral'            // 항바이러스
    | 'hepatoprotective'     // 간보호
    | 'cardioprotective'     // 심장보호
    | 'neuroprotective'      // 신경보호
    | 'gastroprotective'     // 위장보호
    | 'metabolic'            // 대사조절
    | 'hormonal'             // 호르몬조절
    | 'circulatory'          // 순환개선
    | 'other';
  /** 작용 이름 (한글) */
  nameKo: string;
  /** 설명 */
  description: string;
  /** 관련 약재 */
  relatedHerbs: string[];
  /** 근거 수준 */
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
}

/**
 * 현대약리학적 근거
 */
export interface ModernPharmacologicalEvidence {
  /** 분자 타겟 */
  molecularTargets: MolecularTarget[];
  /** 신호전달경로 */
  signalingPathways: SignalingPathway[];
  /** 약리 작용 */
  pharmacologicalActions: PharmacologicalAction[];
  /** 주요 활성 성분 */
  activeCompounds: Array<{
    name: string;
    herb: string;
    casNumber?: string;
    pubChemId?: string;
    effects: string[];
  }>;
  /** 약동학 정보 */
  pharmacokinetics?: {
    absorption?: string;
    distribution?: string;
    metabolism?: string;
    excretion?: string;
    halfLife?: string;
  };
}

// ============ 통계적 근거 ============

/**
 * 임상 연구
 */
export interface ClinicalStudy {
  /** 연구 제목 */
  title: string;
  /** 저자 */
  authors?: string[];
  /** 출판 연도 */
  year: number;
  /** 저널 */
  journal?: string;
  /** PubMed ID */
  pmid?: string;
  /** DOI */
  doi?: string;
  /** 연구 유형 */
  studyType: 'rct' | 'cohort' | 'case_control' | 'case_series' | 'meta_analysis' | 'systematic_review' | 'in_vitro' | 'animal';
  /** 대상자 수 */
  sampleSize?: number;
  /** 주요 결과 */
  mainFindings: string;
  /** 결론 */
  conclusion: string;
  /** 효과 크기 */
  effectSize?: string;
  /** p값 */
  pValue?: string;
  /** 신뢰구간 */
  confidenceInterval?: string;
}

/**
 * 치험례 통계
 */
export interface CaseStatistics {
  /** 유사 환자 총 수 */
  totalSimilarCases: number;
  /** 이 처방 사용 건수 */
  casesWithThisFormula: number;
  /** 성공률 */
  successRate: number;
  /** 결과 분포 */
  outcomeDistribution: {
    cured: number;        // 완치
    markedly_improved: number;  // 현저 호전
    improved: number;     // 호전
    no_change: number;    // 무변화
    worsened: number;     // 악화
  };
  /** 평균 치료 기간 */
  averageTreatmentDuration: string;
  /** 재발률 */
  recurrenceRate?: number;
  /** 통계적 신뢰도 */
  statisticalConfidence: number;
  /** 매칭 기준 */
  matchCriteria: string[];
}

/**
 * 통계적 근거
 */
export interface StatisticalEvidence {
  /** 임상 연구 목록 */
  clinicalStudies: ClinicalStudy[];
  /** 치험례 통계 */
  caseStatistics?: CaseStatistics;
  /** 근거 수준 요약 */
  overallEvidenceLevel: 'A' | 'B' | 'C' | 'D';
  /** 근거 수준 설명 */
  evidenceLevelExplanation: string;
  /** 메타분석 결과 (있는 경우) */
  metaAnalysis?: {
    totalStudies: number;
    totalParticipants: number;
    pooledEffectSize: string;
    heterogeneity: string;
    conclusion: string;
  };
}

// ============ 종합 타입 ============

/**
 * 과학적 처방 근거 종합
 */
export interface ScientificPrescriptionRationale {
  /** 처방 ID */
  formulaId?: string;
  /** 처방명 */
  formulaName: string;
  /** 처방명 한자 */
  formulaNameHanja?: string;

  /** 환자 정보 요약 */
  patientContext?: {
    chiefComplaint: string;
    symptoms: string[];
    bodyHeat?: string;
    bodyStrength?: string;
    constitution?: string;
  };

  /** 처방 선정 요약 */
  summary: {
    /** 한 줄 설명 */
    oneLiner: string;
    /** 처방 선정 이유 (환자 친화적) */
    patientFriendlyExplanation: string;
    /** 핵심 포인트 */
    keyPoints: string[];
  };

  /** 전통의학적 근거 */
  traditionalEvidence: TraditionalEvidence;

  /** 현대약리학적 근거 */
  modernPharmacologicalEvidence: ModernPharmacologicalEvidence;

  /** 통계적 근거 */
  statisticalEvidence: StatisticalEvidence;

  /** 기대 효과 */
  expectedOutcomes: Array<{
    outcome: string;
    timeline: string;
    probability?: string;
  }>;

  /** 주의사항 */
  precautions: Array<{
    type: 'contraindication' | 'drug_interaction' | 'side_effect' | 'monitoring';
    description: string;
    severity: 'critical' | 'warning' | 'info';
  }>;

  /** 생성 메타데이터 */
  metadata: {
    generatedAt: Date;
    aiModelVersion?: string;
    confidenceLevel: number;
    dataSourcesUsed: string[];
  };
}

/**
 * 과학적 근거 생성 요청
 */
export interface ScientificRationaleRequest {
  /** 처방명 또는 ID */
  formulaNameOrId: string;
  /** 구성 약재 (처방명으로 조회 불가 시) */
  herbs?: Array<{
    name: string;
    amount?: string;
  }>;
  /** 환자 컨텍스트 */
  patientContext?: {
    chiefComplaint?: string;
    symptoms?: string[];
    bodyHeat?: 'cold' | 'neutral' | 'hot';
    bodyStrength?: 'deficient' | 'neutral' | 'excess';
    constitution?: string;
    age?: number;
    gender?: string;
  };
  /** 상세 수준 */
  detailLevel?: 'basic' | 'standard' | 'comprehensive';
  /** 포함할 근거 유형 */
  includeEvidence?: {
    traditional?: boolean;
    pharmacological?: boolean;
    statistical?: boolean;
  };
}

/**
 * 근거 수준 정의
 */
export const EVIDENCE_LEVEL_DEFINITIONS = {
  A: {
    label: '강한 근거',
    description: '잘 설계된 RCT 또는 메타분석에서 일관된 결과',
    minStudies: 2,
    studyTypes: ['rct', 'meta_analysis', 'systematic_review'],
  },
  B: {
    label: '중등도 근거',
    description: 'RCT 1개 또는 잘 설계된 비무작위 연구',
    minStudies: 1,
    studyTypes: ['rct', 'cohort', 'case_control'],
  },
  C: {
    label: '약한 근거',
    description: '관찰 연구, 증례 보고, 전문가 의견',
    minStudies: 1,
    studyTypes: ['case_series', 'case_control'],
  },
  D: {
    label: '매우 약한 근거',
    description: '전임상 연구 또는 이론적 근거만 존재',
    minStudies: 0,
    studyTypes: ['in_vitro', 'animal'],
  },
} as const;

/**
 * 약리 작용 유형 한글 매핑
 */
export const PHARMACOLOGICAL_ACTION_LABELS: Record<PharmacologicalAction['type'], string> = {
  anti_inflammatory: '항염 작용',
  antioxidant: '항산화 작용',
  immunomodulatory: '면역조절 작용',
  analgesic: '진통 작용',
  antibacterial: '항균 작용',
  antiviral: '항바이러스 작용',
  hepatoprotective: '간보호 작용',
  cardioprotective: '심장보호 작용',
  neuroprotective: '신경보호 작용',
  gastroprotective: '위장보호 작용',
  metabolic: '대사조절 작용',
  hormonal: '호르몬조절 작용',
  circulatory: '혈액순환 개선',
  other: '기타 작용',
};
