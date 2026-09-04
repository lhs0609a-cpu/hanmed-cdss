/**
 * 앱 전체 통계 설정 파일
 *
 * 이 파일에서 치험례, 처방, 약재 등의 기본 통계를 중앙 관리합니다.
 * 사용자의 개인 치험례가 추가되면 자동으로 합산됩니다.
 */

/**
 * 기본 데이터베이스 통계 — 전부 운영 DB 실측값이다.
 *
 * 2026-09-04 확인. 이 숫자들이 홈페이지 히어로와 요금제 화면에 그대로
 * 나가므로, 어림잡은 값을 넣으면 안 된다. 하나가 틀리면 나머지도 못
 * 믿는다.
 *
 * 그날 바로잡은 것 세 가지.
 *   cases     6,000 → 6,454   (clinical_cases 실측)
 *   formulas    429 → 404     (formulas 실측. 429는 방약합편 수록 수였다)
 *   herbs       500 → 636     (herbs_master 실측)
 *
 * 재확인 방법:
 *   SELECT COUNT(*) FROM clinical_cases;      -- cases
 *   SELECT COUNT(*) FROM formulas;            -- formulas
 *   SELECT COUNT(*) FROM herbs_master;        -- herbs
 *   SELECT COUNT(*) FROM clinical_references; -- references
 */
export const BASE_STATS = {
  // 치험례 — 이 제품의 핵심 자산. 40년치 축적분.
  cases: 6454,

  // 처방
  formulas: 404,

  // 약재
  herbs: 636,

  // 국내외 문헌 (KCI 20,996 + PubMed 14,804)
  references: 35800,

  // 약물 상호작용 — 규칙 수라 DB 행 수와 1:1 이 아니다. 어림값이므로
  // 히어로에 숫자로 내걸지 않는다.
  interactions: 1000,

  // 고전 원문
  classics: 45,

  /**
   * 경혈 — 앱에 실제로 실린 것은 58혈이다.
   *
   * 예전 값 361 은 WHO 표준 경혈의 전체 수였지 우리가 가진 수가 아니었다.
   * 그대로 히어로에 내걸면 열어 본 사람이 바로 안다. 가진 만큼만 적는다.
   */
  acupoints: 58,
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
