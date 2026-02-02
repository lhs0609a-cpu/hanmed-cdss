import api from './api';

// ============================================
// Health Score Types
// ============================================
export interface HealthScoreRequest {
  patientId: string;
  symptoms?: string[];
  diagnosis?: string;
  pulseData?: {
    rate?: number;
    quality?: string;
    depth?: string;
    strength?: string;
  };
  tongueData?: {
    bodyColor?: string;
    coatingColor?: string;
    coatingThickness?: string;
    moisture?: string;
    shape?: string;
  };
  vitalSigns?: {
    temperature?: number;
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
  };
}

export interface OrganScore {
  name: string;
  koreanName: string;
  score: number;
  status: 'excellent' | 'good' | 'normal' | 'attention' | 'concern';
  description: string;
}

export interface HealthScoreResult {
  patientId: string;
  calculatedAt: string;
  scores: {
    bodyHeat: number; // -10 ~ +10 (한↔열)
    bodyStrength: number; // -10 ~ +10 (허↔실)
    energyCirculation: number; // 0-100
    organScores: OrganScore[];
    overallHealth: number; // 0-100
  };
  interpretation: {
    constitution: string;
    primaryPattern: string;
    recommendations: string[];
  };
  confidence: number;
  previousScore?: {
    overallHealth: number;
    calculatedAt: string;
  };
}

// ============================================
// Scientific Rationale Types
// ============================================
export interface ScientificRationaleRequest {
  patientId: string;
  diagnosis: string;
  prescriptionId?: string;
  formulaName?: string;
  herbs?: Array<{ name: string; amount: string }>;
  symptoms?: string[];
  constitution?: string;
}

export interface TraditionalRationale {
  treatmentPrinciple: string;
  pathogenesis: string;
  constitutionMatch: string;
  formulaExplanation: string;
  herbRoles: Array<{
    herb: string;
    role: string;
    explanation: string;
  }>;
}

export interface ModernRationale {
  molecularTargets: string[];
  signalingPathways: string[];
  pharmacologicalEffects: string[];
  clinicalMechanism: string;
}

export interface ResearchEvidence {
  studies: Array<{
    title: string;
    authors: string;
    year: number;
    journal: string;
    pmid?: string;
    summary: string;
    evidenceLevel: 'A' | 'B' | 'C' | 'D';
    relevance: number;
  }>;
  metaAnalyses?: Array<{
    title: string;
    conclusion: string;
    sampleSize: number;
    effectSize?: string;
  }>;
  overallEvidenceLevel: 'A' | 'B' | 'C' | 'D';
}

export interface ScientificRationaleResult {
  traditional: TraditionalRationale;
  modern: ModernRationale;
  research: ResearchEvidence;
  patientFriendlySummary: string;
  generatedAt: string;
}

// ============================================
// Pharmacology Report Types
// ============================================
export interface PharmacologyReportRequest {
  formulaName?: string;
  herbs: Array<{ name: string; amount: string }>;
  targetCondition?: string;
  patientProfile?: {
    age?: number;
    gender?: string;
    weight?: number;
  };
}

export interface MolecularTarget {
  name: string;
  type: string;
  effect: string;
  confidence: number;
}

export interface SignalingPathway {
  name: string;
  effect: string;
  downstreamEffects: string[];
}

export interface CompoundPharmacology {
  name: string;
  koreanName: string;
  molecularWeight?: number;
  targets: MolecularTarget[];
  pathways: SignalingPathway[];
  adme?: {
    absorption: string;
    distribution: string;
    metabolism: string;
    excretion: string;
    halfLife?: string;
    bioavailability?: string;
  };
}

export interface HerbPharmacology {
  herbName: string;
  compounds: CompoundPharmacology[];
  primaryActions: string[];
  synergies: string[];
}

export interface MechanismFlowchart {
  nodes: Array<{
    id: string;
    type: 'herb' | 'compound' | 'target' | 'pathway' | 'effect';
    label: string;
    description?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
}

export interface PharmacologyReport {
  formulaName: string;
  herbs: HerbPharmacology[];
  flowchart: MechanismFlowchart;
  summary: string;
  clinicalImplications: string[];
  generatedAt: string;
}

// ============================================
// Treatment Statistics Types
// ============================================
export interface SimilarPatientStatisticsRequest {
  symptoms: string[];
  diagnosis?: string;
  ageRange?: { min: number; max: number };
  gender?: string;
  constitution?: string;
}

export interface OutcomeDistribution {
  significantImprovement: number;
  moderateImprovement: number;
  slightImprovement: number;
  noChange: number;
  worsened: number;
}

export interface FormulaStatistics {
  formulaName: string;
  totalCases: number;
  successRate: number;
  averageDuration: number;
  outcomeDistribution: OutcomeDistribution;
}

export interface DemographicBreakdown {
  ageGroups: Array<{ range: string; count: number; successRate: number }>;
  genderDistribution: Array<{ gender: string; count: number; successRate: number }>;
  constitutionDistribution: Array<{ type: string; count: number; successRate: number }>;
}

export interface SimilarPatientStatistics {
  totalCases: number;
  matchScore: number;
  overallSuccessRate: number;
  averageTreatmentDuration: number;
  outcomeDistribution: OutcomeDistribution;
  topFormulas: FormulaStatistics[];
  demographicBreakdown: DemographicBreakdown;
  confidenceLevel: number;
}

export interface ComprehensiveStatistics {
  similarPatients: SimilarPatientStatistics;
  formulaComparison?: {
    formulas: FormulaStatistics[];
    recommendation: string;
  };
  symptomAnalysis: {
    symptom: string;
    frequency: number;
    averageResolutionDays: number;
  }[];
}

// ============================================
// Comprehensive Report Types
// ============================================
export interface ComprehensiveReportRequest {
  patientId: string;
  prescriptionId?: string;
  diagnosis: string;
  formulaName: string;
  herbs: Array<{ name: string; amount: string }>;
  symptoms: string[];
  constitution?: string;
}

export interface ComprehensivePatientReport {
  id: string;
  generatedAt: string;
  patient: {
    id: string;
    name?: string;
    age?: number;
    gender?: string;
  };
  healthScore: HealthScoreResult;
  prescription: {
    formulaName: string;
    herbs: Array<{ name: string; amount: string; role: string }>;
    dosageInstructions: string;
    duration: number;
  };
  scientificEvidence: {
    traditionRationale: string;
    modernRationale: string;
    keyStudies: Array<{
      title: string;
      conclusion: string;
      evidenceLevel: string;
    }>;
    overallEvidenceLevel: string;
  };
  statistics: {
    similarCases: number;
    successRate: number;
    averageDuration: number;
    outcomeDistribution: OutcomeDistribution;
  };
  prognosis: {
    expectedOutcome: string;
    expectedDuration: string;
    keyMilestones: Array<{
      week: number;
      expectedChange: string;
    }>;
  };
  lifestyle: {
    dietary: string[];
    exercise: string[];
    sleep: string[];
    avoidance: string[];
  };
}

// ============================================
// API Functions
// ============================================

/**
 * 환자 건강 점수 계산
 */
export const calculateHealthScore = async (
  data: HealthScoreRequest
): Promise<HealthScoreResult> => {
  const response = await api.post('/ai/health-score/calculate', data);
  return response.data?.data || response.data;
};

/**
 * 환자 건강 점수 조회
 */
export const getHealthScore = async (patientId: string): Promise<HealthScoreResult | null> => {
  try {
    const response = await api.get(`/ai/health-score/${patientId}`);
    return response.data?.data || response.data;
  } catch (error) {
    return null;
  }
};

/**
 * 과학적 처방 근거 생성
 */
export const generateScientificRationale = async (
  data: ScientificRationaleRequest
): Promise<ScientificRationaleResult> => {
  const response = await api.post('/ai/rationale/generate', data);
  return response.data?.data || response.data;
};

/**
 * 약리 기전 보고서 생성
 */
export const generatePharmacologyReport = async (
  data: PharmacologyReportRequest
): Promise<PharmacologyReport> => {
  const response = await api.post('/ai/pharmacology/report', data);
  return response.data?.data || response.data;
};

/**
 * 약재별 약리 정보 조회
 */
export const getHerbPharmacology = async (herbName: string): Promise<HerbPharmacology> => {
  const response = await api.post('/ai/pharmacology/herb', { herbName });
  return response.data?.data || response.data;
};

/**
 * 유사 환자 통계 조회
 */
export const getSimilarPatientStatistics = async (
  data: SimilarPatientStatisticsRequest
): Promise<SimilarPatientStatistics> => {
  const response = await api.post('/ai/statistics/similar-patients', data);
  return response.data?.data || response.data;
};

/**
 * 처방 통계 조회
 */
export const getFormulaStatistics = async (
  formulaName: string,
  symptoms?: string[]
): Promise<FormulaStatistics> => {
  const response = await api.post('/ai/statistics/formula', { formulaName, symptoms });
  return response.data?.data || response.data;
};

/**
 * 종합 통계 조회
 */
export const getComprehensiveStatistics = async (
  symptoms: string[],
  formulaName?: string,
  diagnosis?: string
): Promise<ComprehensiveStatistics> => {
  const response = await api.get('/ai/statistics/comprehensive', {
    params: { symptoms: symptoms.join(','), formulaName, diagnosis },
  });
  return response.data?.data || response.data;
};

/**
 * 종합 환자 보고서 생성
 */
export const generateComprehensiveReport = async (
  data: ComprehensiveReportRequest
): Promise<ComprehensivePatientReport> => {
  const response = await api.post('/ai/report/generate', data);
  return response.data?.data || response.data;
};

/**
 * HTML 보고서 생성 (PDF 변환용)
 */
export const generateReportHtml = async (
  data: ComprehensiveReportRequest
): Promise<{ html: string; report: ComprehensivePatientReport }> => {
  const response = await api.post('/ai/report/generate-html', data);
  return response.data?.data || response.data;
};
