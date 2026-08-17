/**
 * 프론트 게이팅용 PLAN_FEATURES 매트릭스.
 *
 * 백엔드(apps/api/src/database/entities/plan-features.ts)와 1:1 동기화 필요.
 * SSOT가 무너지면 게이팅 일관성이 깨지므로, 양쪽 동시 수정이 원칙.
 */

export type SubscriptionTier = 'free' | 'basic' | 'professional' | 'clinic';

export enum FeatureKey {
  DIAGNOSIS = 'diagnosis',
  PRESCRIPTION_RECOMMEND = 'prescription_recommend',
  SYMPTOM_SEARCH = 'symptom_search',
  CASE_SEARCH = 'case_search',
  COMMUNITY = 'community',
  HERBS_PUBLIC = 'herbs_public',
  ACUPOINTS = 'acupoints',
  RED_FLAG = 'red_flag',
  AI_CHAT = 'ai_chat',

  CASE_SAVE_UNLIMITED = 'case_save_unlimited',
  CASE_EXPORT = 'case_export',
  PATIENT_MANAGEMENT = 'patient_management',
  VOICE_CHART = 'voice_chart',
  STATS_BASIC = 'stats_basic',
  ADVANCED_FILTERS = 'advanced_filters',
  EXPORT_NO_WATERMARK = 'export_no_watermark',
  PRIORITY_SUPPORT = 'priority_support',

  MULTI_PRACTITIONER = 'multi_practitioner',
  CLINIC_DASHBOARD = 'clinic_dashboard',
  INSURANCE_CLAIM = 'insurance_claim',
  STATS_ADVANCED = 'stats_advanced',
  TEAM_CASE_DB = 'team_case_db',
  DEDICATED_SUPPORT = 'dedicated_support',
}

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
  // 아직 서버 동기화 전(브라우저 저장)이라 "무제한 저장"으로 팔지 않는다.
  [FeatureKey.CASE_SAVE_UNLIMITED]: '치험례 개수 제한 없음',
  [FeatureKey.CASE_EXPORT]: '케이스 내보내기',
  // "전자차트" 라고 부르지 않는다 — 진료기록부 법정 요건(보존기간·수정이력 등)을
  // 충족하는 EMR 이 아니라, 환자 명부와 진료 기록을 서버에 보관하는 기능이다.
  [FeatureKey.PATIENT_MANAGEMENT]: '환자 명부·진료 기록 서버 보관',
  [FeatureKey.VOICE_CHART]: '음성 받아쓰기 (베타)',
  [FeatureKey.STATS_BASIC]: '기본 통계',
  [FeatureKey.ADVANCED_FILTERS]: '고급 검색 필터',
  [FeatureKey.EXPORT_NO_WATERMARK]: '워터마크 제거 내보내기',
  [FeatureKey.PRIORITY_SUPPORT]: '우선 지원',
  [FeatureKey.MULTI_PRACTITIONER]: '다인 한의사 계정',
  [FeatureKey.CLINIC_DASHBOARD]: '한의원 대시보드',
  [FeatureKey.INSURANCE_CLAIM]: '보험청구·삭감방지',
  [FeatureKey.STATS_ADVANCED]: '고급 분석',
  [FeatureKey.TEAM_CASE_DB]: '한의원 공동 케이스 DB',
  [FeatureKey.DEDICATED_SUPPORT]: '전담 지원',
};

const FREE_FEATURES = [
  FeatureKey.DIAGNOSIS,
  FeatureKey.PRESCRIPTION_RECOMMEND,
  FeatureKey.SYMPTOM_SEARCH,
  FeatureKey.CASE_SEARCH,
  FeatureKey.COMMUNITY,
  FeatureKey.HERBS_PUBLIC,
  FeatureKey.ACUPOINTS,
  FeatureKey.RED_FLAG,
  FeatureKey.AI_CHAT,
] as const;

const BASIC_FEATURES = [
  ...FREE_FEATURES,
  FeatureKey.CASE_EXPORT,
  FeatureKey.STATS_BASIC,
] as const;

const PRO_FEATURES = [
  ...BASIC_FEATURES,
  FeatureKey.CASE_SAVE_UNLIMITED,
  FeatureKey.PATIENT_MANAGEMENT,
  FeatureKey.VOICE_CHART,
  FeatureKey.ADVANCED_FILTERS,
  FeatureKey.EXPORT_NO_WATERMARK,
  FeatureKey.PRIORITY_SUPPORT,
] as const;

const CLINIC_FEATURES = [
  ...PRO_FEATURES,
  FeatureKey.MULTI_PRACTITIONER,
  FeatureKey.CLINIC_DASHBOARD,
  FeatureKey.INSURANCE_CLAIM,
  FeatureKey.STATS_ADVANCED,
  FeatureKey.TEAM_CASE_DB,
  FeatureKey.DEDICATED_SUPPORT,
] as const;

export const PLAN_FEATURES: Record<SubscriptionTier, ReadonlySet<FeatureKey>> = {
  free: new Set(FREE_FEATURES),
  basic: new Set(BASIC_FEATURES),
  professional: new Set(PRO_FEATURES),
  clinic: new Set(CLINIC_FEATURES),
};

/** 해당 기능에 최소로 필요한 티어. 업그레이드 안내용. */
export const MIN_TIER_FOR_FEATURE: Record<FeatureKey, SubscriptionTier> = (() => {
  const out: Partial<Record<FeatureKey, SubscriptionTier>> = {};
  const order: SubscriptionTier[] = ['free', 'basic', 'professional', 'clinic'];
  for (const key of Object.values(FeatureKey)) {
    for (const tier of order) {
      if (PLAN_FEATURES[tier].has(key)) {
        out[key] = tier;
        break;
      }
    }
  }
  return out as Record<FeatureKey, SubscriptionTier>;
})();

export const TIER_LABEL: Record<SubscriptionTier, string> = {
  free: 'Free',
  basic: 'Basic',
  professional: 'Pro',
  clinic: 'Clinic',
};

export function tierHasFeature(tier: SubscriptionTier, key: FeatureKey): boolean {
  return PLAN_FEATURES[tier]?.has(key) ?? false;
}
