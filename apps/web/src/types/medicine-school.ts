// ===========================
// 학파(School) 관련 타입
// ===========================

/**
 * 한의학 학파 분류
 * - classical (고방): 상한론, 금궤요략 기반
 * - later (후세방): 금원대 이후 발전, 장부변증 중심
 * - sasang (사상방): 이제마의 사상의학
 * - hyungsang (형상방): 외형 관찰 기반
 */
export type MedicineSchool = 'classical' | 'later' | 'sasang' | 'hyungsang';

export interface SchoolInfo {
  id: MedicineSchool;
  name: string;           // 고방, 후세방, 사상방, 형상방
  hanja: string;          // 古方, 後世方, 四象方, 形象方
  period: string;         // 시대
  source: string;         // 주요 출전
  philosophy: string;     // 치료 철학
  characteristics: string[]; // 특징
  representativeFormulas: string[]; // 대표 처방
}

// 학파별 상세 정보
export const SCHOOL_INFO: Record<MedicineSchool, SchoolInfo> = {
  classical: {
    id: 'classical',
    name: '고방',
    hanja: '古方',
    period: '한(漢)대',
    source: '상한론, 금궤요략',
    philosophy: '6경변증을 통한 병의 단계 파악과 정확한 처방 선정',
    characteristics: [
      '6경변증(태양, 양명, 소양, 태음, 소음, 궐음)',
      '간결한 처방 구성',
      '약미(藥味) 수가 적음',
      '용량이 비교적 큼',
      '급성 외감병 치료에 강점',
    ],
    representativeFormulas: [
      '마황탕', '계지탕', '갈근탕', '소시호탕', '대시호탕',
      '반하사심탕', '오령산', '사역탕', '이중탕',
    ],
  },
  later: {
    id: 'later',
    name: '후세방',
    hanja: '後世方',
    period: '금원(金元)대 이후',
    source: '의학입문, 경악전서, 동의보감',
    philosophy: '장부변증과 보법(補法)을 통한 내상병 치료',
    characteristics: [
      '장부변증 위주',
      '보법(補法) 중시',
      '약미가 다양하고 세분화',
      '만성병, 내상병 치료에 강점',
      '변증론치(辨證論治) 체계화',
    ],
    representativeFormulas: [
      '보중익기탕', '귀비탕', '육군자탕', '사물탕', '팔물탕',
      '십전대보탕', '육미지황탕', '쌍화탕', '소요산',
    ],
  },
  sasang: {
    id: 'sasang',
    name: '사상방',
    hanja: '四象方',
    period: '조선 후기 (1894년)',
    source: '동의수세보원',
    philosophy: '체질에 따른 맞춤 치료',
    characteristics: [
      '4가지 체질 분류 (태양, 태음, 소양, 소음)',
      '체질별 장부 대소(大小) 이론',
      '체질에 맞는 약물 사용',
      '음식, 생활 양생도 체질별 적용',
      '같은 병도 체질에 따라 다른 처방',
    ],
    representativeFormulas: [
      '태음조위탕', '청심연자탕', '형방패독산',
      '소음인보중익기탕', '팔물군자탕',
      '소양인양격산화탕', '독활지황탕',
    ],
  },
  hyungsang: {
    id: 'hyungsang',
    name: '형상방',
    hanja: '形象方',
    period: '현대',
    source: '형상의학',
    philosophy: '외형적 특징을 통한 체질 및 병증 파악',
    characteristics: [
      '얼굴, 체형, 손, 발 등 외형 관찰',
      '외형에서 내적 상태 유추',
      '사상의학과 결합하여 활용',
      '시각적 진단 중시',
    ],
    representativeFormulas: [
      '체형별 사상처방 변형',
      '얼굴형에 따른 처방 가감',
    ],
  },
};

// 학파별 처방 확장 인터페이스
export interface FormulaSchoolExtension {
  school: MedicineSchool;
  schoolSpecificNotes?: string;
  alternativesBySchool?: SchoolAlternative[];
}

export interface SchoolAlternative {
  school: MedicineSchool;
  formulaId: string;
  formulaName: string;
  comparison: string; // 비교 설명
}

// 학파별 비교 분석 결과
export interface SchoolComparisonResult {
  symptom: string;
  analyses: SchoolAnalysis[];
}

export interface SchoolAnalysis {
  school: MedicineSchool;
  approach: string;        // 접근법 설명
  pattern: string;         // 해당 학파의 변증
  formulas: {
    id: string;
    name: string;
    reason: string;
  }[];
  pros: string[];          // 장점
  cons: string[];          // 단점
  suitableFor: string;     // 적합한 환자/상황
}
