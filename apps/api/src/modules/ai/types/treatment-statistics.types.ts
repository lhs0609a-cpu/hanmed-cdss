/**
 * 치료 통계 관련 타입 정의
 */

/**
 * 치료 결과 분포
 */
export interface OutcomeDistribution {
  /** 완치 */
  cured: number;
  /** 현저히 호전 */
  markedlyImproved: number;
  /** 호전 */
  improved: number;
  /** 불변 */
  noChange: number;
  /** 악화 */
  worsened: number;
}

/**
 * 처방별 통계
 */
export interface FormulaStatistics {
  /** 처방명 */
  formulaName: string;
  /** 처방 한자명 */
  formulaHanja?: string;
  /** 총 사용 건수 */
  totalCases: number;
  /** 성공 건수 (완치 + 현저호전 + 호전) */
  successCount: number;
  /** 성공률 (%) */
  successRate: number;
  /** 결과 분포 */
  outcomeDistribution: OutcomeDistribution;
  /** 평균 치료 기간 */
  averageDuration?: string;
  /** 주요 적응증 */
  mainIndications: string[];
  /** 신뢰도 (케이스 수 기반) */
  confidenceLevel: 'high' | 'medium' | 'low';
}

/**
 * 인구통계학적 통계
 */
export interface DemographicStatistics {
  /** 연령대별 통계 */
  byAgeGroup: {
    group: string;
    range: [number, number];
    totalCases: number;
    successRate: number;
  }[];
  /** 성별 통계 */
  byGender: {
    gender: string;
    totalCases: number;
    successRate: number;
  }[];
  /** 체질별 통계 */
  byConstitution: {
    constitution: string;
    totalCases: number;
    successRate: number;
    topFormulas: string[];
  }[];
  /** 체열별 통계 */
  byBodyHeat: {
    bodyHeat: 'cold' | 'neutral' | 'hot';
    label: string;
    totalCases: number;
    successRate: number;
  }[];
  /** 근실도별 통계 */
  byBodyStrength: {
    bodyStrength: 'deficient' | 'neutral' | 'excess';
    label: string;
    totalCases: number;
    successRate: number;
  }[];
}

/**
 * 증상별 통계
 */
export interface SymptomStatistics {
  /** 증상명 */
  symptomName: string;
  /** 해당 증상의 총 케이스 수 */
  totalCases: number;
  /** 성공률 */
  successRate: number;
  /** 가장 효과적인 처방 */
  topFormulas: {
    formulaName: string;
    caseCount: number;
    successRate: number;
  }[];
  /** 동반 증상 */
  coOccurringSymptoms: {
    symptom: string;
    frequency: number;
  }[];
}

/**
 * 치료 기간 통계
 */
export interface TreatmentDurationStatistics {
  /** 평균 치료 기간 (일) */
  averageDays: number;
  /** 중앙값 치료 기간 (일) */
  medianDays: number;
  /** 기간별 분포 */
  distribution: {
    range: string;
    percentage: number;
    caseCount: number;
  }[];
  /** 결과별 평균 기간 */
  byOutcome: {
    outcome: string;
    averageDays: number;
  }[];
}

/**
 * 종합 치료 통계
 */
export interface ComprehensiveTreatmentStatistics {
  /** 통계 제목 */
  title: string;
  /** 분석 기간 */
  analysisPeriod?: {
    start: Date;
    end: Date;
  };
  /** 총 분석 케이스 수 */
  totalCasesAnalyzed: number;
  /** 전체 성공률 */
  overallSuccessRate: number;
  /** 전체 결과 분포 */
  outcomeDistribution: OutcomeDistribution;
  /** 상위 처방 통계 */
  topFormulas: FormulaStatistics[];
  /** 인구통계학적 통계 */
  demographics: DemographicStatistics;
  /** 치료 기간 통계 */
  treatmentDuration: TreatmentDurationStatistics;
  /** 데이터 신뢰도 */
  dataQuality: {
    completenessScore: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    limitations: string[];
  };
  /** 메타데이터 */
  metadata: {
    generatedAt: Date;
    dataSource: string;
    version: string;
  };
}

/**
 * 유사 환자 통계 요청
 */
export interface SimilarPatientStatisticsRequest {
  /** 주소증 */
  chiefComplaint: string;
  /** 증상 목록 */
  symptoms: {
    name: string;
    severity?: number;
  }[];
  /** 진단명 */
  diagnosis?: string;
  /** 체열 */
  bodyHeat?: 'cold' | 'neutral' | 'hot';
  /** 근실도 */
  bodyStrength?: 'deficient' | 'neutral' | 'excess';
  /** 환자 나이 */
  age?: number;
  /** 환자 성별 */
  gender?: string;
  /** 체질 */
  constitution?: string;
  /** 특정 처방으로 필터 */
  formulaFilter?: string;
}

/**
 * 유사 환자 통계 응답
 */
export interface SimilarPatientStatisticsResponse {
  /** 유사 환자 수 */
  totalSimilarPatients: number;
  /** 매칭 기준 */
  matchCriteria: string[];
  /** 유사도 점수 */
  similarityScore: number;
  /** 전체 성공률 */
  overallSuccessRate: number;
  /** 결과 분포 */
  outcomeDistribution: OutcomeDistribution;
  /** 평균 치료 기간 */
  averageTreatmentDuration: string;
  /** 상위 효과적 처방 */
  topEffectiveFormulas: {
    rank: number;
    formulaName: string;
    formulaHanja?: string;
    caseCount: number;
    successRate: number;
    averageDuration?: string;
  }[];
  /** 예후 예측 */
  prognosisPrediction: {
    expectedOutcome: string;
    confidence: number;
    timeToImprovement: string;
    factors: {
      positive: string[];
      negative: string[];
    };
  };
  /** 비교 분석 */
  comparativeAnalysis: {
    vsAllPatients: {
      successRateDiff: number;
      interpretation: string;
    };
    vsSameAgeGroup?: {
      successRateDiff: number;
      interpretation: string;
    };
    vsSameConstitution?: {
      successRateDiff: number;
      interpretation: string;
    };
  };
  /** 신뢰도 */
  confidenceLevel: 'high' | 'medium' | 'low';
  /** 제한 사항 */
  limitations?: string[];
}

/**
 * 처방 효과 비교 요청
 */
export interface FormulaComparisonRequest {
  /** 비교할 처방 목록 */
  formulas: string[];
  /** 적응증 필터 */
  indicationFilter?: string;
  /** 체질 필터 */
  constitutionFilter?: string;
}

/**
 * 처방 효과 비교 응답
 */
export interface FormulaComparisonResponse {
  /** 비교 대상 처방 */
  formulas: {
    formulaName: string;
    totalCases: number;
    successRate: number;
    averageDuration: string;
    mainIndications: string[];
    strengthWeakness: {
      strengths: string[];
      weaknesses: string[];
    };
  }[];
  /** 승자 (가장 효과적인 처방) */
  recommendation: {
    formulaName: string;
    reason: string;
    confidence: number;
  };
  /** 비교 차트 데이터 */
  chartData: {
    labels: string[];
    successRates: number[];
    caseCountsks: number[];
  };
}

/**
 * 통계 차트 데이터
 */
export interface StatisticsChartData {
  /** 차트 유형 */
  chartType: 'bar' | 'pie' | 'line' | 'radar' | 'gauge';
  /** 차트 제목 */
  title: string;
  /** 라벨 */
  labels: string[];
  /** 데이터셋 */
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
  /** 단위 */
  unit?: string;
}
