/**
 * 약리 기전 보고서 관련 타입 정의
 */

/**
 * 분자 타겟 정보
 */
export interface MolecularTargetInfo {
  /** 타겟 이름 (예: AMPK, NF-κB, COX-2) */
  name: string;
  /** 타겟 유형 */
  type: 'enzyme' | 'receptor' | 'channel' | 'transporter' | 'transcription_factor' | 'other';
  /** 작용 (활성화/억제/조절) */
  action: 'activation' | 'inhibition' | 'modulation';
  /** 활성 성분 */
  activeCompound: string;
  /** 약재 */
  herb: string;
  /** IC50/EC50 값 (있는 경우) */
  potency?: string;
  /** 작용 효과 설명 */
  effect: string;
  /** 근거 수준 */
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
  /** 관련 PubMed ID */
  pmid?: string;
}

/**
 * 신호전달경로 정보
 */
export interface SignalingPathwayDetail {
  /** 경로 이름 */
  name: string;
  /** 경로 유형 */
  type?: 'inflammatory' | 'metabolic' | 'apoptotic' | 'proliferative' | 'antioxidant' | 'other';
  /** 관련 성분들 */
  compounds: string[];
  /** 기전 설명 */
  mechanism: string;
  /** 상위 경로 연결 */
  upstream?: string[];
  /** 하위 경로 연결 */
  downstream?: string[];
  /** 임상적 의미 */
  clinicalRelevance: string;
}

/**
 * ADME 약동학 요약
 */
export interface ADMESummary {
  /** 흡수 */
  absorption: {
    summary: string;
    bioavailability?: string;
    absorptionSite?: string;
    foodEffect?: string;
  };
  /** 분포 */
  distribution: {
    summary: string;
    mainTissues?: string[];
    bbbPenetration?: boolean;
    proteinBinding?: string;
  };
  /** 대사 */
  metabolism: {
    summary: string;
    primaryEnzymes?: string[];
    metabolites?: string[];
    drugInteractionRisk?: 'low' | 'moderate' | 'high';
  };
  /** 배설 */
  excretion: {
    summary: string;
    halfLife?: string;
    route?: string;
  };
}

/**
 * 기전 플로우차트 노드
 */
export interface MechanismFlowchartNode {
  id: string;
  type: 'compound' | 'target' | 'pathway' | 'effect' | 'herb';
  label: string;
  labelKo?: string;
  description?: string;
  color?: string;
}

/**
 * 기전 플로우차트 엣지
 */
export interface MechanismFlowchartEdge {
  source: string;
  target: string;
  label?: string;
  type?: 'activation' | 'inhibition' | 'modulation';
}

/**
 * 기전 플로우차트
 */
export interface MechanismFlowchart {
  nodes: MechanismFlowchartNode[];
  edges: MechanismFlowchartEdge[];
}

/**
 * 성분별 약리 정보
 */
export interface CompoundPharmacology {
  /** 성분명 (영문) */
  name: string;
  /** 성분명 (한글) */
  nameKo?: string;
  /** 약재명 */
  herb: string;
  /** CAS 번호 */
  casNumber?: string;
  /** PubChem ID */
  pubChemId?: string;
  /** 화학적 분류 */
  chemicalClass?: string;
  /** 분자식 */
  molecularFormula?: string;
  /** 분자량 */
  molecularWeight?: number;
  /** 분자 타겟들 */
  targets: MolecularTargetInfo[];
  /** 신호전달경로들 */
  pathways: SignalingPathwayDetail[];
  /** 약동학 요약 */
  adme?: ADMESummary;
  /** 주요 효과 */
  mainEffects: string[];
  /** 근거 수준 */
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
}

/**
 * 약재별 약리 정보
 */
export interface HerbPharmacology {
  /** 약재명 (한글) */
  name: string;
  /** 약재명 (영문) */
  nameEn?: string;
  /** 학명 */
  scientificName?: string;
  /** 주요 활성 성분 */
  activeCompounds: CompoundPharmacology[];
  /** 약재 전체 효과 요약 */
  effectSummary: string;
  /** 약재 기전 요약 */
  mechanismSummary: string;
  /** 임상적 적응증 */
  clinicalIndications: string[];
  /** 주요 약리 작용 */
  pharmacologicalActions: {
    type: string;
    description: string;
    evidenceLevel: 'A' | 'B' | 'C' | 'D';
  }[];
  /** 관련 PubMed 연구 */
  relatedStudies: {
    title: string;
    year: number;
    pmid?: string;
    finding: string;
  }[];
}

/**
 * 약리 기전 보고서
 */
export interface PharmacologyReport {
  /** 보고서 제목 */
  title: string;
  /** 처방명 */
  formulaName?: string;
  /** 약재별 약리 정보 */
  herbs: HerbPharmacology[];
  /** 처방 전체의 시너지 효과 */
  synergisticEffects?: {
    effect: string;
    mechanism: string;
    involvedHerbs: string[];
    evidenceLevel: 'A' | 'B' | 'C' | 'D';
  }[];
  /** 전체 기전 플로우차트 */
  mechanismFlowchart: MechanismFlowchart;
  /** 환자 친화적 요약 */
  patientSummary: {
    /** 한 줄 요약 */
    oneLiner: string;
    /** 작용 기전 쉬운 설명 */
    howItWorks: string;
    /** 핵심 포인트 */
    keyPoints: string[];
    /** 주의사항 */
    precautions: string[];
  };
  /** 전체 근거 수준 */
  overallEvidenceLevel: 'A' | 'B' | 'C' | 'D';
  /** 메타데이터 */
  metadata: {
    generatedAt: Date;
    aiModelVersion?: string;
    dataSources: string[];
    confidenceLevel: number;
  };
}

/**
 * 약리 보고서 요청
 */
export interface PharmacologyReportRequest {
  /** 약재 목록 */
  herbs: {
    name: string;
    nameEn?: string;
    amount?: string;
  }[];
  /** 처방명 (선택) */
  formulaName?: string;
  /** 상세 수준 */
  detailLevel?: 'brief' | 'standard' | 'detailed';
  /** 포함할 섹션 */
  includeSections?: {
    compounds?: boolean;
    pathways?: boolean;
    adme?: boolean;
    flowchart?: boolean;
    studies?: boolean;
  };
  /** 환자 정보 (맞춤 설명용) */
  patientContext?: {
    chiefComplaint?: string;
    symptoms?: string[];
  };
}

/**
 * 약리 작용 타입 라벨
 */
export const PHARMACOLOGICAL_ACTION_TYPES = {
  anti_inflammatory: '항염증',
  antioxidant: '항산화',
  immunomodulatory: '면역조절',
  metabolic_regulation: '대사조절',
  neuroprotective: '신경보호',
  cardioprotective: '심혈관보호',
  hepatoprotective: '간보호',
  gastroprotective: '위장보호',
  antimicrobial: '항균',
  antiviral: '항바이러스',
  anticancer: '항암',
  analgesic: '진통',
  sedative: '진정',
  adaptogenic: '적응원성',
  other: '기타',
} as const;

/**
 * 분자 타겟 타입 라벨
 */
export const TARGET_TYPE_LABELS = {
  enzyme: '효소',
  receptor: '수용체',
  channel: '이온채널',
  transporter: '수송체',
  transcription_factor: '전사인자',
  other: '기타',
} as const;

/**
 * 작용 타입 라벨
 */
export const ACTION_TYPE_LABELS = {
  activation: '활성화',
  inhibition: '억제',
  modulation: '조절',
} as const;

/**
 * 경로 타입 라벨
 */
export const PATHWAY_TYPE_LABELS = {
  inflammatory: '염증 경로',
  metabolic: '대사 경로',
  apoptotic: '세포사멸 경로',
  proliferative: '세포증식 경로',
  antioxidant: '항산화 경로',
  other: '기타 경로',
} as const;
