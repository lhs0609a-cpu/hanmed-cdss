import { SubscriptionTier } from './user.entity';

/**
 * 기능 키 — 게이팅 대상 기능을 식별한다.
 *
 * 원칙(수익모델 2026-06):
 *  - 한의사가 매일 임상에서 쓰는 핵심 의사결정 기능은 모든 티어에서 무료
 *    (변증, 처방 추천+근거, 증상검색, 치험례 검색, 커뮤니티, 한약재/DUR, 침구혈자리)
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

  // ── Pro 이상 (운영 효율) ────────────────────────
  CASE_SAVE_UNLIMITED = 'case_save_unlimited', // 케이스 무제한 저장
  CASE_EXPORT = 'case_export', // 케이스 PDF/이미지 내보내기
  PATIENT_MANAGEMENT = 'patient_management', // 환자 명부·진료 기록 서버 보관 (법정 EMR 아님)
  VOICE_CHART = 'voice_chart', // 음성 받아쓰기 (베타)
  STATS_BASIC = 'stats_basic', // 기본 통계
  ADVANCED_FILTERS = 'advanced_filters', // 고급 검색 필터·학파 비교
  EXPORT_NO_WATERMARK = 'export_no_watermark', // 워터마크 제거 내보내기
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
    FeatureKey.CASE_EXPORT,
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
  [FeatureKey.CASE_SAVE_UNLIMITED]: '치험례 개수 제한 없음',
  [FeatureKey.CASE_EXPORT]: '케이스 내보내기 (PDF/이미지)',
  [FeatureKey.PATIENT_MANAGEMENT]: '환자 명부·진료 기록 서버 보관',
  [FeatureKey.VOICE_CHART]: '음성 받아쓰기 (베타)',
  [FeatureKey.STATS_BASIC]: '기본 통계',
  [FeatureKey.ADVANCED_FILTERS]: '고급 검색 필터·학파 비교',
  [FeatureKey.EXPORT_NO_WATERMARK]: '워터마크 제거 내보내기',
  [FeatureKey.PRIORITY_SUPPORT]: '우선 지원',
  [FeatureKey.MULTI_PRACTITIONER]: '다인 한의사 계정',
  [FeatureKey.CLINIC_DASHBOARD]: '한의원 단위 대시보드',
  [FeatureKey.INSURANCE_CLAIM]: '보험청구·삭감방지',
  [FeatureKey.STATS_ADVANCED]: '고급 분석',
  [FeatureKey.TEAM_CASE_DB]: '한의원 공동 케이스 DB',
  [FeatureKey.DEDICATED_SUPPORT]: '전담 지원',
};
