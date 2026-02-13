// ===========================
// 임상 근거 패널 관련 타입 정의
// ===========================

import type { MatchedCase } from './case-search'

/** 패널 props / hook 파라미터 */
export interface ClinicalEvidenceParams {
  formulaName: string
  herbs: Array<{ name: string; amount: string; role: string }>
  rationale: string
  chiefComplaint: string
  symptoms: Array<{ name: string; severity?: number }>
  constitution: string
  formulaDetail?: {
    hanja: string
    source: string
    category: string
    indication: string
    pathogenesis: string
    contraindications: string[]
    modifications: Array<{ condition: string; action: string }>
  }
}

/** AI 추천 근거 탭 데이터 */
export interface AIReasoningData {
  symptomMatches: Array<{
    symptom: string
    matched: boolean
    relevance: 'high' | 'medium' | 'low'
  }>
  constitutionFit: {
    score: number
    explanation: string
  }
  pathogenesisAnalysis: string
  keyPoints: string[]
  _isDemo?: boolean
}

/** 과학적 근거 탭 데이터 */
export interface ScientificEvidenceData {
  evidenceLevel: 'A' | 'B' | 'C' | 'D'
  pharmacologicalActions: string[]
  activeCompounds: Array<{
    herb: string
    compounds: string[]
    actions: string[]
  }>
  clinicalStudies: Array<{
    title: string
    year: number
    result: string
  }>
  patientFriendlyExplanation: string
  _isDemo?: boolean
}

/** 치료 통계 탭 데이터 */
export interface TreatmentStatsData {
  overallSuccessRate: number
  outcomeDistribution: {
    cured: number
    significantlyImproved: number
    improved: number
    noChange: number
    worsened: number
  }
  avgTreatmentDays: number
  prognosis: {
    expectedOutcome: string
    confidence: number
    expectedImprovementWeeks: number
  }
  totalCases: number
  _isDemo?: boolean
}

/** 유사 치험례 탭 결과 (기존 MatchedCase 재사용) */
export interface SimilarCasesResult {
  cases: MatchedCase[]
  totalFound: number
  _isDemo?: boolean
}

// ===========================
// Mock 데이터
// ===========================

export const MOCK_REASONING: AIReasoningData = {
  symptomMatches: [
    { symptom: '소화불량', matched: true, relevance: 'high' },
    { symptom: '피로감', matched: true, relevance: 'high' },
    { symptom: '식욕부진', matched: true, relevance: 'medium' },
    { symptom: '복부냉감', matched: true, relevance: 'medium' },
    { symptom: '설사', matched: false, relevance: 'low' },
  ],
  constitutionFit: {
    score: 85,
    explanation: '해당 체질의 비위 기능 특성에 적합한 처방입니다. 비기허(脾氣虛) 패턴에 잘 맞으며, 중초(中焦) 보강에 효과적입니다.',
  },
  pathogenesisAnalysis:
    '비위기허(脾胃氣虛)로 인한 운화(運化) 기능 저하가 핵심 병기입니다. 중기하함(中氣下陷)으로 피로와 소화불량이 동시에 나타나며, 기혈 생화(生化)의 원천인 비장의 기능 회복이 치료의 관건입니다.',
  keyPoints: [
    '비기허(脾氣虛) 패턴과 증상 4/5 일치',
    '체질 적합도 85% - 해당 체질에 우선 권장',
    '중기하함(中氣下陷) 치법에 정확히 대응',
    '6000건 치험례 DB 유사 증상 분석 근거',
  ],
  _isDemo: true,
}

export const MOCK_SIMILAR_CASES: SimilarCasesResult = {
  cases: [
    {
      caseId: 'demo-case-1',
      title: '만성 소화불량 및 피로감 환자',
      formulaName: '보중익기탕',
      formulaHanja: '補中益氣湯',
      chiefComplaint: '소화가 안되고 피로가 심함',
      symptoms: ['소화불량', '피로', '식욕부진', '복부냉감'],
      diagnosis: '비기허(脾氣虛)',
      patientAge: 58,
      patientGender: 'M',
      patientConstitution: '태음인',
      treatmentFormula: '보중익기탕 가 진피',
      dataSource: '임상 치험례 DB',
      matchScore: {
        total: 87,
        grade: 'A',
        gradeLabel: '높은 유사도',
        vectorSimilarity: 0,
        keywordMatch: 52,
        metadataMatch: 35,
      },
      matchReasons: [
        { type: 'chief_complaint', description: '주소증 일치', contribution: 30 },
        { type: 'symptom', description: '3개 증상 일치', contribution: 30 },
        { type: 'constitution', description: '체질 일치', contribution: 15 },
      ],
    },
    {
      caseId: 'demo-case-2',
      title: '비위허약 환자의 식욕부진',
      formulaName: '보중익기탕',
      formulaHanja: '補中益氣湯',
      chiefComplaint: '밥맛이 없고 기력이 없음',
      symptoms: ['식욕부진', '피로', '권태감', '복부팽만'],
      diagnosis: '비위기허(脾胃氣虛)',
      patientAge: 45,
      patientGender: 'F',
      patientConstitution: '소음인',
      treatmentFormula: '보중익기탕',
      dataSource: '임상 치험례 DB',
      matchScore: {
        total: 78,
        grade: 'B',
        gradeLabel: '보통 유사도',
        vectorSimilarity: 0,
        keywordMatch: 45,
        metadataMatch: 33,
      },
      matchReasons: [
        { type: 'symptom', description: '2개 증상 일치', contribution: 20 },
        { type: 'formula', description: '동일 처방', contribution: 25 },
      ],
    },
  ],
  totalFound: 2,
  _isDemo: true,
}

export const MOCK_SCIENTIFIC: ScientificEvidenceData = {
  evidenceLevel: 'B',
  pharmacologicalActions: [
    '면역 조절 (T세포 활성화, NK세포 증진)',
    '항염 작용 (NF-κB 경로 억제)',
    '소화 기능 개선 (위장관 운동 촉진)',
    '항피로 효과 (미토콘드리아 기능 향상)',
    '항산화 작용 (SOD, GSH-Px 증가)',
  ],
  activeCompounds: [
    {
      herb: '황기',
      compounds: ['Astragaloside IV', 'Cycloastragenol'],
      actions: ['면역증강', '항피로'],
    },
    {
      herb: '인삼',
      compounds: ['Ginsenoside Rg1', 'Ginsenoside Rb1'],
      actions: ['항피로', '인지기능 개선'],
    },
    {
      herb: '백출',
      compounds: ['Atractylone', 'Atractylenolide III'],
      actions: ['소화촉진', '항염'],
    },
  ],
  clinicalStudies: [
    {
      title: '보중익기탕의 만성 피로 증후군 치료 효과: 무작위 대조 시험',
      year: 2023,
      result: '치료군에서 피로도 VAS 점수 42% 감소 (p<0.05)',
    },
    {
      title: '비위기허 환자에서의 보중익기탕 소화기능 개선 연구',
      year: 2022,
      result: '위장관 운동 시간 평균 28% 단축',
    },
  ],
  patientFriendlyExplanation:
    '이 처방은 몸의 에너지(기)를 끌어올려 소화력과 체력을 동시에 회복시키는 처방입니다. 현대 연구에서도 면역력 강화와 피로 개선 효과가 확인되었습니다.',
  _isDemo: true,
}

export const MOCK_STATISTICS: TreatmentStatsData = {
  overallSuccessRate: 82,
  outcomeDistribution: {
    cured: 28,
    significantlyImproved: 35,
    improved: 19,
    noChange: 12,
    worsened: 6,
  },
  avgTreatmentDays: 21,
  prognosis: {
    expectedOutcome: '현저 호전',
    confidence: 78,
    expectedImprovementWeeks: 3,
  },
  totalCases: 156,
  _isDemo: true,
}
