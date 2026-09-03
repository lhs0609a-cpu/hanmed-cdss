import { SubscriptionTier } from './user.entity';

/**
 * 기능 키 — 게이팅 대상 기능을 식별한다.
 *
 * 원칙(수익모델 2026-06):
 *  - 한의사가 매일 임상에서 쓰는 핵심 의사결정 기능은 모든 티어에서 무료
 *    (변증, 처방 추천+근거, 증상검색, 치험례 검색, 커뮤니티, 한약재/DUR, 침구혈자리)
 *  - 단, 치험례 "목록 둘러보기"는 무료로 앞 3페이지까지다(2026-08). 검색은 계속
 *    무료다 — 찾으러 온 사람은 막지 않고, 6,000건을 통째로 훑는 것만 막는다.
 *    이 둘의 차이가 이 제품의 과금 지점이다.
 *  - 한의사가 "돈을 버는" 기능은 유료 (보험청구·삭감방지)
 *  - 한의원 운영 효율(환자관리·통계·음성차트)은 Pro/Clinic
 *  - 다인 협업·고급 관리 도구는 Clinic
 */
export enum FeatureKey {
  // ── 무료(코어 임상) ─────────────────────────────
  DIAGNOSIS = 'diagnosis', // 변증·통합진단
  PRESCRIPTION_RECOMMEND = 'prescription_recommend', // 처방 추천 + 근거
  SYMPTOM_SEARCH = 'symptom_search', // 증상 검색
  CASE_SEARCH = 'case_search', // 치험례 검색
  COMMUNITY = 'community', // 커뮤니티
  HERBS_PUBLIC = 'herbs_public', // 한약재·DUR 정보
  ACUPOINTS = 'acupoints', // 침구혈자리
  RED_FLAG = 'red_flag', // 적색신호 알림

  // ── 사용량 기반 (티어별 한도) ───────────────────
  AI_CHAT = 'ai_chat', // AI 챗봇
  /**
   * 치험례 목록 전체 열람.
   *
   * 없으면 목록의 앞 CASE_BROWSE_FREE_CASES 건까지만 페이지를 넘길 수 있다.
   * 검색·필터는 티어와 무관하게 열려 있다 — 잠그는 것은 "훑기"지 "찾기"가 아니다.
   */
  CASE_BROWSE_UNLIMITED = 'case_browse_unlimited',

  // ── Pro 이상 (운영 효율) ────────────────────────
  CASE_SAVE_UNLIMITED = 'case_save_unlimited', // 케이스 무제한 저장
  // ⚠️ 아래 두 개는 "사용자가 직접 작성한 자기 케이스"에만 적용된다.
  // 치험례 DB(clinical_cases) 본문은 어떤 티어에서도 내보낼 수 없다 —
  // 내보내기를 열면 열람 로그·워터마크를 우회해서 원문이 파일로 빠져나간다.
  // 게이팅 구현 시 대상이 자기 케이스인지 반드시 확인할 것.
  CASE_EXPORT = 'case_export', // 내 케이스 PDF/이미지 내보내기
  PATIENT_MANAGEMENT = 'patient_management', // 환자 명부·진료 기록 서버 보관 (법정 EMR 아님)
  VOICE_CHART = 'voice_chart', // 음성 받아쓰기 (베타)
  STATS_BASIC = 'stats_basic', // 기본 통계
  ADVANCED_FILTERS = 'advanced_filters', // 고급 검색 필터·학파 비교
  EXPORT_NO_WATERMARK = 'export_no_watermark', // 내 케이스 내보내기 워터마크 제거
  PRIORITY_SUPPORT = 'priority_support', // 우선 지원

  // ── Clinic 이상 (팀·청구) ───────────────────────
  MULTI_PRACTITIONER = 'multi_practitioner', // 다인 한의사 계정
  CLINIC_DASHBOARD = 'clinic_dashboard', // 한의원 단위 대시보드
  INSURANCE_CLAIM = 'insurance_claim', // 보험청구 (Clinic 또는 add-on)
  STATS_ADVANCED = 'stats_advanced', // 고급 분석
  TEAM_CASE_DB = 'team_case_db', // 한의원 공동 케이스 DB
  DEDICATED_SUPPORT = 'dedicated_support', // 전담 지원
}

/**
 * 케이스 저장 한도 (CASE_SAVE_UNLIMITED 없을 때 적용).
 */
export const CASE_SAVE_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 10,
  [SubscriptionTier.BASIC]: 50,
  [SubscriptionTier.PROFESSIONAL]: Infinity,
  [SubscriptionTier.CLINIC]: Infinity,
};

/**
 * 환자 명부 보관 한도.
 *
 * 예전에는 Pro 이상만 환자 명부를 쓸 수 있었다. 무료 계정은 페이지 자체가
 * 자물쇠 화면이었다. 그런데 이 기능은 써 봐야 값어치를 안다 — 환자 한 명을
 * 넣고 다음 진료 때 그 기록이 그대로 떠 있는 걸 봐야 "이거 없으면 못 하겠다"
 * 가 된다. 열어 보지도 못한 기능은 결제 이유가 되지 않는다.
 *
 * 그래서 전 티어에 열고 인원으로 나눈다. 무료는 맛보기, 유료는 실제 운영.
 * 5명은 한의원을 굴리기에는 확실히 모자라고, 기능을 판단하기에는 충분하다.
 *
 * Infinity 는 무제한이다. JSON 으로 내보낼 때는 null 로 바꾼다 —
 * JSON.stringify(Infinity) 는 null 이 되므로 어차피 같은 값이지만,
 * 화면에서 "무제한" 을 그리려면 그 사실을 알고 있어야 한다.
 */
export const PATIENT_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 5,
  [SubscriptionTier.BASIC]: 50,
  [SubscriptionTier.PROFESSIONAL]: 500,
  [SubscriptionTier.CLINIC]: Infinity,
};

/** 이 사용자의 환자 보관 한도. 알 수 없는 티어는 가장 낮게 취급한다. */
export function patientLimit(tier?: SubscriptionTier | null): number {
  return (
    PATIENT_LIMITS[tier as SubscriptionTier] ?? PATIENT_LIMITS[SubscriptionTier.FREE]
  );
}

/**
 * 치험례 목록 둘러보기 한도 (CASE_BROWSE_UNLIMITED 없을 때 적용).
 *
 * 6,000건이 쌓여 있다는 사실 자체가 이 제품의 값어치다. 숨기면 팔리지 않고,
 * 전부 열어 두면 팔 것이 없다. 총 건수는 그대로 보여주고 넘길 범위만 잠근다.
 */
export const CASE_BROWSE_FREE_PAGES = 3;

/** 목록 페이지 크기 상한 — 티어 무관. 없으면 limit 을 키워 한도를 그냥 넘어간다. */
export const CASE_LIST_PAGE_SIZE_MAX = 20;

/** 무료 티어가 목록으로 도달할 수 있는 최대 건수 (페이지가 아니라 이게 진짜 한도) */
export const CASE_BROWSE_FREE_CASES = CASE_BROWSE_FREE_PAGES * CASE_LIST_PAGE_SIZE_MAX;

/**
 * 하루 치험례 본문 열람 상한 — 티어별.
 *
 * 목록을 60건으로 잠가 놓고 본문을 하루 200건 열어 주면 잠근 의미가 없다.
 * 검색은 무료로 열려 있어서, 예전 값이면 무료 계정 하나로 한 달이면 전량을
 * 읽을 수 있었다 — 유료화와 유출 방어가 같은 지점에서 무너진다.
 *
 * 유료 티어에도 상한을 남긴다. 결제한 계정이 덤프용으로 쓰이는 것이 실제로
 * 가장 흔한 유출 경로다. 사람이 하루에 읽는 양보다는 넉넉하다.
 */
export const CASE_VIEW_DAILY_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 20,
  [SubscriptionTier.BASIC]: 100,
  [SubscriptionTier.PROFESSIONAL]: 200,
  [SubscriptionTier.CLINIC]: 200,
};

/** 이 사용자의 하루 열람 상한. 알 수 없는 티어는 가장 낮게 취급한다. */
export function dailyViewLimit(tier?: SubscriptionTier | null): number {
  return (
    CASE_VIEW_DAILY_LIMITS[tier as SubscriptionTier] ??
    CASE_VIEW_DAILY_LIMITS[SubscriptionTier.FREE]
  );
}

/**
 * 한의원 단위 동시 계정 수.
 */
export const PRACTITIONER_SEAT_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 1,
  [SubscriptionTier.BASIC]: 1,
  [SubscriptionTier.PROFESSIONAL]: 1,
  [SubscriptionTier.CLINIC]: 3, // 기본 3인, 추가 시트는 별도 과금
};

/**
 * 티어별 기능 접근 매트릭스.
 *
 * 한 줄 = 한 티어가 접근 가능한 모든 기능. 상위 티어는 하위 티어의 모든 기능을 포함한다.
 */
export const PLAN_FEATURES: Record<SubscriptionTier, ReadonlySet<FeatureKey>> = {
  [SubscriptionTier.FREE]: new Set<FeatureKey>([
    FeatureKey.DIAGNOSIS,
    FeatureKey.PRESCRIPTION_RECOMMEND,
    FeatureKey.SYMPTOM_SEARCH,
    FeatureKey.CASE_SEARCH,
    FeatureKey.COMMUNITY,
    FeatureKey.HERBS_PUBLIC,
    FeatureKey.ACUPOINTS,
    FeatureKey.RED_FLAG,
    FeatureKey.AI_CHAT, // 무료지만 월 한도 제한 (PLAN_LIMITS)
    // 전 티어에 열려 있고 인원으로 나뉜다 (PATIENT_LIMITS).
    FeatureKey.PATIENT_MANAGEMENT,
  ]),
  [SubscriptionTier.BASIC]: new Set<FeatureKey>([
    FeatureKey.DIAGNOSIS,
    FeatureKey.PRESCRIPTION_RECOMMEND,
    FeatureKey.SYMPTOM_SEARCH,
    FeatureKey.CASE_SEARCH,
    FeatureKey.COMMUNITY,
    FeatureKey.HERBS_PUBLIC,
    FeatureKey.ACUPOINTS,
    FeatureKey.RED_FLAG,
    FeatureKey.AI_CHAT,
    FeatureKey.CASE_BROWSE_UNLIMITED,
    FeatureKey.CASE_EXPORT,
    FeatureKey.PATIENT_MANAGEMENT,
    FeatureKey.STATS_BASIC,
  ]),
  [SubscriptionTier.PROFESSIONAL]: new Set<FeatureKey>([
    FeatureKey.DIAGNOSIS,
    FeatureKey.PRESCRIPTION_RECOMMEND,
    FeatureKey.SYMPTOM_SEARCH,
    FeatureKey.CASE_SEARCH,
    FeatureKey.COMMUNITY,
    FeatureKey.HERBS_PUBLIC,
    FeatureKey.ACUPOINTS,
    FeatureKey.RED_FLAG,
    FeatureKey.AI_CHAT,
    FeatureKey.CASE_BROWSE_UNLIMITED,
    FeatureKey.CASE_SAVE_UNLIMITED,
    FeatureKey.CASE_EXPORT,
    FeatureKey.PATIENT_MANAGEMENT,
    FeatureKey.VOICE_CHART,
    FeatureKey.STATS_BASIC,
    FeatureKey.ADVANCED_FILTERS,
    FeatureKey.EXPORT_NO_WATERMARK,
    FeatureKey.PRIORITY_SUPPORT,
  ]),
  [SubscriptionTier.CLINIC]: new Set<FeatureKey>([
    FeatureKey.DIAGNOSIS,
    FeatureKey.PRESCRIPTION_RECOMMEND,
    FeatureKey.SYMPTOM_SEARCH,
    FeatureKey.CASE_SEARCH,
    FeatureKey.COMMUNITY,
    FeatureKey.HERBS_PUBLIC,
    FeatureKey.ACUPOINTS,
    FeatureKey.RED_FLAG,
    FeatureKey.AI_CHAT,
    FeatureKey.CASE_BROWSE_UNLIMITED,
    FeatureKey.CASE_SAVE_UNLIMITED,
    FeatureKey.CASE_EXPORT,
    FeatureKey.PATIENT_MANAGEMENT,
    FeatureKey.VOICE_CHART,
    FeatureKey.STATS_BASIC,
    FeatureKey.ADVANCED_FILTERS,
    FeatureKey.EXPORT_NO_WATERMARK,
    FeatureKey.PRIORITY_SUPPORT,
    FeatureKey.MULTI_PRACTITIONER,
    FeatureKey.CLINIC_DASHBOARD,
    FeatureKey.INSURANCE_CLAIM,
    FeatureKey.STATS_ADVANCED,
    FeatureKey.TEAM_CASE_DB,
    FeatureKey.DEDICATED_SUPPORT,
  ]),
};

/**
 * 단일 헬퍼: 티어가 특정 기능에 접근 가능한가?
 */
export function tierHasFeature(tier: SubscriptionTier, key: FeatureKey): boolean {
  return PLAN_FEATURES[tier]?.has(key) ?? false;
}

/**
 * UI 표시용 한글 라벨.
 */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  [FeatureKey.DIAGNOSIS]: '변증·통합진단',
  [FeatureKey.PRESCRIPTION_RECOMMEND]: '처방 추천 + 근거',
  [FeatureKey.SYMPTOM_SEARCH]: '증상 검색',
  [FeatureKey.CASE_SEARCH]: '치험례 검색',
  [FeatureKey.COMMUNITY]: '커뮤니티',
  [FeatureKey.HERBS_PUBLIC]: '한약재·DUR',
  [FeatureKey.ACUPOINTS]: '침구혈자리',
  [FeatureKey.RED_FLAG]: '적색신호 알림',
  [FeatureKey.AI_CHAT]: 'AI 챗봇',
  [FeatureKey.CASE_BROWSE_UNLIMITED]: '치험례 6,000건 전체 열람',
  [FeatureKey.CASE_SAVE_UNLIMITED]: '치험례 개수 제한 없음',
  [FeatureKey.CASE_EXPORT]: '내 케이스 내보내기 (PDF/이미지)',
  [FeatureKey.PATIENT_MANAGEMENT]: '환자 명부·진료 기록 서버 보관',
  [FeatureKey.VOICE_CHART]: '음성 받아쓰기 (베타)',
  [FeatureKey.STATS_BASIC]: '기본 통계',
  [FeatureKey.ADVANCED_FILTERS]: '고급 검색 필터·학파 비교',
  [FeatureKey.EXPORT_NO_WATERMARK]: '내 케이스 워터마크 없이 내보내기',
  [FeatureKey.PRIORITY_SUPPORT]: '우선 지원',
  [FeatureKey.MULTI_PRACTITIONER]: '다인 한의사 계정',
  [FeatureKey.CLINIC_DASHBOARD]: '한의원 단위 대시보드',
  [FeatureKey.INSURANCE_CLAIM]: '보험청구·삭감방지',
  [FeatureKey.STATS_ADVANCED]: '고급 분석',
  [FeatureKey.TEAM_CASE_DB]: '한의원 공동 케이스 DB',
  [FeatureKey.DEDICATED_SUPPORT]: '전담 지원',
};
