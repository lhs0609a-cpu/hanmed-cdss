// ===========================
// 병양도표(病養圖表) 관련 타입
// ===========================

/**
 * 병증 분류
 * - external: 외감병 (감기, 발열 등)
 * - internal: 내상병 (만성 장부 질환)
 * - miscellaneous: 잡병
 */
export type DiseaseCategory = 'external' | 'internal' | 'miscellaneous';

export const DISEASE_CATEGORY_LABELS: Record<DiseaseCategory, string> = {
  external: '외감병(外感病)',
  internal: '내상병(內傷病)',
  miscellaneous: '잡병(雜病)',
};

// 병양도표 메인 엔트리
export interface ByeongYangEntry {
  id: string;
  disease: string;           // 병명 (예: 두통, 기침, 불면)
  hanja: string;             // 한자 (예: 頭痛, 咳嗽, 不眠)
  category: DiseaseCategory;
  description?: string;      // 병증 설명
  patterns: ByeongYangPattern[];
}

// 병양도표 패턴 (변증별 분류)
export interface ByeongYangPattern {
  id: string;
  patternName: string;       // 변증명 (예: 풍한두통, 간양두통)
  hanja?: string;            // 한자
  symptoms: PatternSymptom[];
  tongue: TongueSign;        // 설진
  pulse: PulseSign;          // 맥진
  treatment: PatternTreatment;
  differentialPoints: string[]; // 감별 포인트
}

// 증상 정보
export interface PatternSymptom {
  name: string;              // 증상명
  isKey: boolean;            // 주요 증상 여부 (진단 핵심)
  specifics?: string;        // 세부 특징 (예: "오후에 심해짐")
  frequency?: 'always' | 'often' | 'sometimes'; // 빈도
}

// 설진 정보
export interface TongueSign {
  body: string;              // 설체 (예: 담홍, 홍, 암자)
  coating: string;           // 설태 (예: 백태, 황태, 무태)
  description?: string;      // 추가 설명
}

// 맥진 정보
export interface PulseSign {
  type: string;              // 맥상 (예: 부맥, 침맥, 현맥)
  description?: string;      // 추가 설명
}

// 치료 정보
export interface PatternTreatment {
  principle: string;         // 치법 (예: 소풍산한)
  formulaIds: string[];      // 추천 처방 ID
  formulaNames: string[];    // 추천 처방명
  acupoints?: string[];      // 추천 경혈
  notes?: string;            // 치료 시 유의사항
}

// ===========================
// 팔강변증(八綱辨證) 관련 타입
// ===========================

export type YinYangType = 'yang' | 'yin' | 'yang_deficiency' | 'true_yin';
export type InteriorExteriorType = 'exterior' | 'interior' | 'half_exterior_half_interior';
export type ColdHeatType = 'heat' | 'cold' | 'deficiency_heat' | 'deficiency_cold';
export type DeficiencyExcessType = 'excess' | 'deficiency' | 'mixed';

export interface PalGangResult {
  type: YinYangType | InteriorExteriorType | ColdHeatType | DeficiencyExcessType;
  label: string;
  confidence: number;        // 0-100
  indicators: string[];      // 해당 결과를 뒷받침하는 증거
}

export interface PalGangAnalysis {
  // 음양
  yinYang: PalGangResult;

  // 표리
  interiorExterior: PalGangResult;

  // 한열
  coldHeat: PalGangResult;

  // 허실
  deficiencyExcess: PalGangResult;

  // 종합 분석
  summary: string;
  overallPattern: string;    // 종합 변증 (예: "표한실증", "이열허증")
  patternSuggestions: PatternSuggestion[];
  formulaSuggestions: FormulaSuggestion[];
}

export interface PatternSuggestion {
  pattern: string;           // 변증명
  confidence: number;        // 일치도
  description: string;       // 설명
}

export interface FormulaSuggestion {
  formulaId: string;
  formulaName: string;
  matchScore: number;        // 적합도 (0-100)
  reason: string;            // 추천 이유
  modifications?: string[];  // 가감 제안
}

// ===========================
// 진단 플로우 관련 타입
// ===========================

export interface DiagnosisStep {
  step: number;
  name: string;
  description: string;
  isCompleted: boolean;
}

export const DIAGNOSIS_FLOW: DiagnosisStep[] = [
  { step: 1, name: '증상 입력', description: '주소증 및 수반 증상 입력', isCompleted: false },
  { step: 2, name: '병증 분류', description: '외감/내상/잡병 분류', isCompleted: false },
  { step: 3, name: '팔강변증', description: '음양, 표리, 한열, 허실 분석', isCompleted: false },
  { step: 4, name: '세부변증', description: '구체적 변증 도출', isCompleted: false },
  { step: 5, name: '처방 추천', description: '변증에 따른 처방 제안', isCompleted: false },
];

// ===========================
// 병약도표(病藥圖表) - 매트릭스형 처방 가이드
// ===========================

/**
 * 체질/건실도 유형
 */
export type ConstitutionColumn =
  | 'heat_high'      // 체열많음
  | 'solid_high'     // 건실도높음
  | 'medium'         // 체열/건실도 중등
  | 'solid_low'      // 건실도낮음
  | 'heat_low';      // 체열적음

export const CONSTITUTION_COLUMN_LABELS: Record<ConstitutionColumn, string> = {
  heat_high: '체열많음',
  solid_high: '건실도높음',
  medium: '체열/건실도 중등',
  solid_low: '건실도낮음',
  heat_low: '체열적음',
};

/**
 * 병인/상태 유형
 */
export type PathogenRow =
  | 'intestinal_stagnation'  // 장역복함형
  | 'mental_disorder'        // 정신이란형
  | 'heat_excess'            // 열실/상열형
  | 'digestive_relaxation'   // 소화관이완형
  | 'mental_tension'         // 정신간장형
  | 'pelvic_blood_stasis'    // 골반혈소형
  | 'elderly'                // 노인
  | 'child'                  // 소아
  | 'pregnant';              // 임신부

export const PATHOGEN_ROW_LABELS: Record<PathogenRow, string> = {
  intestinal_stagnation: '장역복함형',
  mental_disorder: '정신이란형',
  heat_excess: '열실/상열형',
  digestive_relaxation: '소화관이완형',
  mental_tension: '정신간장형',
  pelvic_blood_stasis: '골반혈소형',
  elderly: '노인',
  child: '소아',
  pregnant: '임신부',
};

export const PATHOGEN_ROW_CATEGORY: Record<PathogenRow, '병인' | '상태별'> = {
  intestinal_stagnation: '병인',
  mental_disorder: '병인',
  heat_excess: '병인',
  digestive_relaxation: '병인',
  mental_tension: '병인',
  pelvic_blood_stasis: '병인',
  elderly: '상태별',
  child: '상태별',
  pregnant: '상태별',
};

/**
 * 병약도표 셀 데이터
 */
export interface ByeongYakCell {
  formula: string;        // 처방명
  note?: string;          // 추가 설명
  isRecommended?: boolean; // 추천 여부
}

/**
 * 병약도표 행 데이터
 */
export interface ByeongYakRow {
  pathogen: PathogenRow;
  cells: Partial<Record<ConstitutionColumn, ByeongYakCell[]>>;
}

/**
 * 병약도표 전체 데이터
 */
export interface ByeongYakTable {
  id: string;
  disease: string;        // 병명 (예: 변비)
  hanja: string;          // 한자
  description?: string;   // 설명
  rows: ByeongYakRow[];
  footnotes?: string[];   // 각주
}

// ===========================
// 대표 처방 사례 타입
// ===========================

export interface FormulaCase {
  id: string;
  name: string;
  hanja: string;
  school: 'classical' | 'later' | 'sasang' | 'hyungsang';
  category: string;          // 처방 분류 (예: 보익제, 해표제)
  indication: string;        // 적응증
  keySymptoms: string[];     // 핵심 증상
  targetPatterns?: string[]; // 대상 변증
  contraindications: string[]; // 금기
  modernApplications?: string[]; // 현대 질환 적용
  herbs: {
    name: string;
    amount: string;
    role: '군' | '신' | '좌' | '사';
    function?: string;
  }[];
  clinicalNotes: string;     // 임상 메모
  lectureNotes?: string;     // 강의 노트 (녹용대부탕, 귀비탕 등)
}

// 강의에서 언급된 대표 처방들
export const REPRESENTATIVE_FORMULAS: Partial<FormulaCase>[] = [
  {
    name: '녹용대부탕',
    hanja: '鹿茸大補湯',
    school: 'later',
    category: '보익제',
    indication: '원기 허손, 허로, 기혈양허',
    keySymptoms: ['피로', '기력저하', '식욕부진', '소화불량'],
    clinicalNotes: '장기간의 허로 환자에게 적합. 녹용의 보양 작용으로 원기 회복.',
  },
  {
    name: '귀비탕',
    hanja: '歸脾湯',
    school: 'later',
    category: '보익제-보혈',
    indication: '심비양허, 기혈양허, 사려과도',
    keySymptoms: ['불면', '건망', '심계', '식욕부진', '권태'],
    targetPatterns: ['심비양허증'],
    modernApplications: ['불안장애', '만성피로', '빈혈'],
    clinicalNotes: '과도한 사고와 스트레스로 인한 심비 손상 치료.',
  },
  {
    name: '보중익기탕',
    hanja: '補中益氣湯',
    school: 'later',
    category: '보익제-보기',
    indication: '비위기허, 기허발열, 중기하함',
    keySymptoms: ['권태감', '자한', '기단', '식욕부진', '탈항'],
    targetPatterns: ['비위기허증', '중기하함증'],
    modernApplications: ['만성피로증후군', '위하수', '탈항', '자궁탈출'],
    clinicalNotes: '비위의 기를 보하여 중초를 튼튼히 함.',
  },
  {
    name: '시호탕류',
    hanja: '柴胡湯類',
    school: 'classical',
    category: '화해제',
    indication: '소양병, 왕래한열, 흉협고만',
    keySymptoms: ['왕래한열', '흉협고만', '구고', '인건', '현훈'],
    targetPatterns: ['소양병', '반표반이증'],
    clinicalNotes: '고방의 대표 처방군. 소시호탕, 대시호탕 등.',
  },
];
