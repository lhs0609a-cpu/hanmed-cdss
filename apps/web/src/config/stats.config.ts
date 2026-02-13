/**
 * 앱 전체 통계 설정 파일
 *
 * 이 파일에서 치험례, 처방, 약재 등의 기본 통계를 중앙 관리합니다.
 * 사용자의 개인 치험례가 추가되면 자동으로 합산됩니다.
 */

// 기본 데이터베이스 통계 (서버 DB 기준 수치)
// 참고: 이 수치는 실제 DB에 등록된 데이터 건수를 반영합니다.
// cases: /api/v1/cases 의 총 건수와 동기화 필요
export const BASE_STATS = {
  // 치험례: DB에 등록된 치험례 수
  cases: 6000,

  // 처방 데이터
  formulas: 429,

  // 약재 정보
  herbs: 500,

  // 약물 상호작용
  interactions: 1000,

  // 고전 원문
  classics: 45,

  // 경혈 정보
  acupoints: 361,
} as const;

// 통계 표시 형식
export const STATS_DISPLAY = {
  cases: {
    label: '치험례',
    suffix: '+',
    description: '검증된 임상 치험례',
  },
  formulas: {
    label: '처방 데이터',
    suffix: '+',
    description: '한의학 처방 정보',
  },
  herbs: {
    label: '약재 정보',
    suffix: '+',
    description: '본초 데이터베이스',
  },
  interactions: {
    label: '약물 상호작용',
    suffix: '+',
    description: '안전성 검사 데이터',
  },
} as const;

// LocalStorage 키
export const MY_CASES_STORAGE_KEY = 'ongojishin_my_cases';

// 사용자의 개인 치험례 수 가져오기
export function getMyCasesCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(MY_CASES_STORAGE_KEY);
    if (saved) {
      const cases = JSON.parse(saved);
      return Array.isArray(cases) ? cases.length : 0;
    }
  } catch {
    return 0;
  }
  return 0;
}

// 전체 치험례 수 (기본 + 사용자)
export function getTotalCasesCount(): number {
  return BASE_STATS.cases + getMyCasesCount();
}

// 통계 숫자 포맷팅 (예: 6000 -> "6,000+")
export function formatStatNumber(num: number, suffix: string = '+'): string {
  return num.toLocaleString('ko-KR') + suffix;
}

// 대략적인 표현 (예: 6000 -> "6,000건 이상")
export function formatStatApprox(num: number): string {
  const rounded = Math.floor(num / 100) * 100;
  return `${rounded.toLocaleString('ko-KR')}건 이상`;
}

// 모든 통계 가져오기 (사용자 치험례 포함)
export function getAllStats() {
  const myCasesCount = getMyCasesCount();
  return {
    cases: BASE_STATS.cases + myCasesCount,
    myCases: myCasesCount,
    baseCases: BASE_STATS.cases,
    formulas: BASE_STATS.formulas,
    herbs: BASE_STATS.herbs,
    interactions: BASE_STATS.interactions,
    classics: BASE_STATS.classics,
    acupoints: BASE_STATS.acupoints,
  };
}
