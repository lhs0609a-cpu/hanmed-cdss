/**
 * 앱 전체 통계 설정 파일
 *
 * 이 파일에서 치험례, 처방, 약재 등의 기본 통계를 중앙 관리합니다.
 * 사용자의 개인 치험례가 추가되면 자동으로 합산됩니다.
 */

/**
 * 폴백 통계 — 이제 화면의 1차 출처가 아니다.
 *
 * 2026-09-09 부터 홈페이지 히어로는 GET /stats/public 이 세어 준 DB 실측값을
 * 쓴다(usePublicStats). 여기 있는 값은 API 가 답하기 전 첫 페인트와, API 가
 * 죽었을 때의 폴백으로만 남는다.
 *
 * 손으로 적는 방식은 반드시 어긋난다. 실제로 어긋나 있었다 — 치험례를
 * 8,579 건까지 모아 놓고 홈페이지는 6,454 건을 걸고 있었고, 문헌은
 * 42,182 편인데 35,800 편이라고 적혀 있었다. 그래서 세는 일을 DB 에 맡겼다.
 *
 * formulas 는 404 로 맞춘다. 예전에는 429(all-formulas.json 배열 길이)를
 * 걸었다 — 처방 화면이 DB 가 아니라 그 파일을 읽어서다. 이제 네 숫자 모두
 * DB 를 기준으로 통일했으므로 폴백도 같은 기준으로 둔다. 다만 처방 화면이
 * 아직 429건을 보여주므로 25건의 간극이 남아 있다. 그 간극은 데이터를
 * 맞춰서 없앨 일이지, 숫자를 골라 적어서 덮을 일이 아니다.
 *
 * 재확인 방법:
 *   SELECT COUNT(*) FROM clinical_cases
 *    WHERE corpus = 'korean' AND "excludedReason" IS NULL;      -- cases
 *   SELECT COUNT(*) FROM clinical_cases
 *    WHERE corpus = 'classical' AND "excludedReason" IS NULL;
 *   SELECT COUNT(*) FROM formulas;            -- formulas
 *   SELECT COUNT(*) FROM herbs_master;        -- herbs
 *   SELECT COUNT(*) FROM clinical_references; -- references
 */
export const BASE_STATS = {
  // 치험례 — 이 제품의 핵심 자산. 40년치 축적분.
  //
  // 8,579건 중 116건은 목록에서 뺐다(excludedReason). 학술지 목차, 처방
  // 해설 본문, 본초 강좌, 밴드 신변잡기 같은 것이 문서 통째로 수집되면서
  // 같은 표에 들어와 있었다. 세는 수와 목록에 보이는 수는 같아야 한다.
  cases: 8463,

  /**
   * 고전 의안 — 中醫笈成(CC0) 수록 청대 이전 의안 7,920건.
   *
   * cases 에 더해 16,499 로 내걸지 않는다. 이쪽은 문언문이고, 치험례 목록은
   * 기본적으로 한국 현대 기록만 보여준다. 합친 수를 히어로에 적으면 그
   * 숫자를 보고 들어온 한의사가 목록에서 절반을 못 찾는다 — 열어 본 사람이
   * 바로 아는 종류의 과장이다. 세는 자리를 나눠 둔다.
   */
  classicalCases: 7920,

  /**
   * 처방 — formulas 테이블 기준.
   * 처방 화면은 아직 all-formulas.json(429건)을 읽으므로 25건 차이가 난다.
   */
  formulas: 404,

  // 약재
  herbs: 636,

  // 국내외 문헌 (KCI 20,996 + PubMed 21,186)
  references: 42182,

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
