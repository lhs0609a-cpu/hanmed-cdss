import { useSubscriptionInfo } from './useSubscription';
import { useAuthStore } from '@/stores/authStore';
import {
  DEMO_FEATURE_SET,
  FeatureKey,
  MIN_TIER_FOR_FEATURE,
  SubscriptionTier,
  TIER_LABEL,
  tierHasFeature,
} from '@/config/plan-features';

export interface FeatureAccess {
  /** 현재 사용자 티어 */
  tier: SubscriptionTier;
  /** 체험 계정인가 — 잠금 안내를 '업그레이드'가 아니라 '회원가입'으로 바꾼다 */
  isDemo: boolean;
  /** 해당 기능에 접근 가능한지 */
  hasAccess: boolean;
  /** 잠겨있다면, 필요한 최소 티어 */
  requiredTier: SubscriptionTier | null;
  /** 잠금 표시용 라벨 ("Pro 이상", "Clinic 이상") */
  requiredTierLabel: string | null;
  /** 로딩 중인지 (구독 정보 fetch 중) */
  isLoading: boolean;
}

/**
 * 기능별 접근 가능 여부를 판정한다.
 *
 * 우선순위:
 *  1. 백엔드 응답의 `features` 배열 (SSOT) — 있으면 그걸 사용
 *  2. 폴백: 프론트 PLAN_FEATURES 매트릭스로 tier에서 계산
 *
 * 1번은 백엔드가 사용자의 add-on, 한의원 시트 등을 반영한 최종 권한이므로 항상 우선.
 */
export function useFeatureAccess(key: FeatureKey): FeatureAccess {
  const { data, isLoading } = useSubscriptionInfo();

  const tier = (data?.tier as SubscriptionTier | undefined) ?? 'free';
  const backendFeatures = (data as { features?: string[] } | undefined)?.features;
  // 체험 여부는 로그인 응답에 실려 오므로 스토어에서 바로 안다. 구독 정보를
  // 기다리면 그 사이 첫 페인트에서 잠긴 화면이 잠깐 열려 보인다.
  const storeIsDemo = useAuthStore((s) => s.user?.isDemo === true);
  const isDemo =
    storeIsDemo || (data as { isDemo?: boolean } | undefined)?.isDemo === true;

  // 체험 계정은 티어와 무관하게 DEMO_FEATURE_SET 만 쓴다.
  const hasAccess = isDemo
    ? DEMO_FEATURE_SET.has(key)
    : backendFeatures
      ? backendFeatures.includes(key)
      : tierHasFeature(tier, key);

  const requiredTier = hasAccess ? null : MIN_TIER_FOR_FEATURE[key] ?? null;

  return {
    tier,
    isDemo,
    hasAccess,
    requiredTier,
    requiredTierLabel: requiredTier ? TIER_LABEL[requiredTier] : null,
    isLoading,
  };
}
