/**
 * 종합 환자 보고서 관련 타입 정의
 */

import { OutcomeDistribution, FormulaStatistics } from './treatment-statistics.types';

/**
 * 보고서 건강 점수 섹션
 */
export interface ReportHealthScoreSection {
  /** 체열 점수 */
  bodyHeatScore: number;
  /** 체열 해석 */
  bodyHeatInterpretation: {
    level: string;
    traditional: string;
    modern: string;
  };
  /** 근실도 점수 */
  bodyStrengthScore: number;
  /** 근실도 해석 */
  bodyStrengthInterpretation: {
    level: string;
    traditional: string;
    modern: string;
  };
  /** 기혈순환도 */
  circulationScore: number;
  /** 장부 기능 점수 */
  organFunctionScores: {
    spleen: number;
    lung: number;
    kidney: number;
    liver: number;
    heart: number;
  };
  /** 종합 건강지수 */
  overallHealthIndex: number;
  /** 종합 해석 */
  overallInterpretation: string;
  /** 트렌드 (이전 대비) */
  trend?: {
    changeFromLast: number;
    direction: 'improving' | 'stable' | 'declining';
    interpretation: string;
  };
}

/**
 * 보고서 처방 섹션
 */
export interface ReportPrescriptionSection {
  /** 처방명 */
  formulaName: string;
  /** 처방명 한자 */
  formulaHanja?: string;
  /** 구성 약재 */
  herbs: {
    name: string;
    amount?: string;
    role?: '군' | '신' | '좌' | '사';
    effect?: string;
  }[];
  /** 처방 목적 */
  purpose: string;
  /** 전통의학적 치법 */
  treatmentMethod: {
    name: string;
    hanja?: string;
    description: string;
  };
  /** 복용법 */
  dosageInstructions: string;
  /** 주의사항 */
  precautions: string[];
}

/**
 * 보고서 과학적 근거 섹션
 */
export interface ReportScientificEvidenceSection {
  /** 전통의학 근거 요약 */
  traditionalEvidence: {
    sources: string[];
    summary: string;
  };
  /** 현대약리학 근거 요약 */
  modernEvidence: {
    keyMechanisms: string[];
    activeCompounds: {
      name: string;
      herb: string;
      effect: string;
    }[];
    summary: string;
  };
  /** 통계적 근거 요약 */
  statisticalEvidence: {
    similarCases: number;
    successRate: number;
    outcomeDistribution: OutcomeDistribution;
    averageDuration: string;
  };
  /** 전체 근거 수준 */
  overallEvidenceLevel: 'A' | 'B' | 'C' | 'D';
  /** 관련 연구 (상위 3개) */
  keyStudies: {
    title: string;
    year: number;
    pmid?: string;
    finding: string;
  }[];
}

/**
 * 보고서 예후 섹션
 */
export interface ReportPrognosisSection {
  /** 예상 결과 */
  expectedOutcome: string;
  /** 예상 기간 */
  expectedDuration: string;
  /** 신뢰도 */
  confidence: number;
  /** 긍정적 요인 */
  positiveFactors: string[];
  /** 주의 요인 */
  cautionFactors: string[];
  /** 추천 사항 */
  recommendations: string[];
  /** 다음 진료 */
  followUp?: {
    recommended: boolean;
    timing?: string;
    reason?: string;
  };
}

/**
 * 보고서 생활 관리 섹션
 */
export interface ReportLifestyleSection {
  /** 식이 권고 */
  diet: {
    recommended: string[];
    avoid: string[];
    tips: string[];
  };
  /** 운동 권고 */
  exercise: {
    recommended: string[];
    avoid: string[];
    tips: string[];
  };
  /** 생활 습관 */
  lifestyle: {
    recommended: string[];
    avoid: string[];
  };
  /** 계절별 주의사항 */
  seasonalAdvice?: string;
}

/**
 * 종합 환자 보고서
 */
export interface ComprehensivePatientReport {
  /** 보고서 ID */
  reportId: string;
  /** 보고서 유형 */
  reportType: 'consultation' | 'followup' | 'summary';
  /** 보고서 제목 */
  title: string;
  /** 생성 일시 */
  generatedAt: Date;
  /** 환자 정보 */
  patientInfo: {
    name?: string;
    age?: number;
    gender?: string;
    constitution?: string;
    patientId?: string;
  };
  /** 진료 정보 */
  consultationInfo: {
    date: string;
    chiefComplaint: string;
    symptoms: string[];
    diagnosis?: string;
    patternDiagnosis?: string;
  };
  /** 건강 점수 섹션 */
  healthScore: ReportHealthScoreSection;
  /** 처방 섹션 */
  prescription: ReportPrescriptionSection;
  /** 과학적 근거 섹션 */
  scientificEvidence: ReportScientificEvidenceSection;
  /** 예후 섹션 */
  prognosis: ReportPrognosisSection;
  /** 생활 관리 섹션 */
  lifestyle?: ReportLifestyleSection;
  /** 환자 요약 (한 페이지) */
  executiveSummary: {
    oneLiner: string;
    keyPoints: string[];
    actionItems: string[];
  };
  /** 메타데이터 */
  metadata: {
    version: string;
    generatedBy: string;
    confidenceLevel: number;
    dataSources: string[];
  };
}

/**
 * 종합 보고서 생성 요청
 */
export interface ComprehensiveReportRequest {
  /** 환자 ID */
  patientId?: string;
  /** 진료 기록 ID */
  patientRecordId?: string;
  /** 환자 정보 */
  patientInfo?: {
    name?: string;
    age?: number;
    gender?: string;
    constitution?: string;
  };
  /** 진료 정보 */
  consultationInfo: {
    date: string;
    chiefComplaint: string;
    symptoms: {
      name: string;
      severity?: number;
      duration?: string;
    }[];
    diagnosis?: string;
    patternDiagnosis?: string;
  };
  /** 건강 점수 (이미 계산된 경우) */
  healthScore?: {
    bodyHeatScore: number;
    bodyStrengthScore: number;
    overallHealthIndex: number;
    organFunctionScores?: {
      spleen: number;
      lung: number;
      kidney: number;
      liver: number;
      heart: number;
    };
  };
  /** 처방 정보 */
  prescription: {
    formulaName: string;
    formulaHanja?: string;
    herbs: {
      name: string;
      amount?: string;
      role?: string;
    }[];
    dosageInstructions?: string;
  };
  /** 포함할 섹션 */
  includeSections?: {
    healthScore?: boolean;
    prescription?: boolean;
    scientificEvidence?: boolean;
    prognosis?: boolean;
    lifestyle?: boolean;
  };
  /** 보고서 유형 */
  reportType?: 'consultation' | 'followup' | 'summary';
  /** 상세 수준 */
  detailLevel?: 'brief' | 'standard' | 'detailed';
}

/**
 * 보고서 HTML 템플릿 옵션
 */
export interface ReportHtmlOptions {
  /** 테마 */
  theme?: 'light' | 'dark' | 'print';
  /** 로고 URL */
  logoUrl?: string;
  /** 병원명 */
  clinicName?: string;
  /** 의사명 */
  doctorName?: string;
  /** 페이지 크기 */
  pageSize?: 'A4' | 'Letter';
  /** 포함할 섹션 */
  includeSections?: {
    header?: boolean;
    healthScore?: boolean;
    prescription?: boolean;
    scientificEvidence?: boolean;
    prognosis?: boolean;
    lifestyle?: boolean;
    footer?: boolean;
  };
}

/**
 * 보고서 내보내기 형식
 */
export type ReportExportFormat = 'html' | 'pdf' | 'json';
