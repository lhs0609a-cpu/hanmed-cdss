import { create } from 'zustand';

export interface Plan {
  tier: string;
  name: string;
  description: string;
  tagline?: string;
  features: string[];
  /** PLAN_FEATURES 매트릭스의 FeatureKey 배열 (백엔드 SSOT) */
  featureKeys?: string[];
  /** UI 라벨 변환된 feature 목록 */
  featureLabels?: string[];
  monthlyPrice: number;
  yearlyPrice: number;
  aiQueryLimit: number;
  overagePrice: number;
  canExceed: boolean;
  /** 동시 사용 가능한 한의사 시트 수 (-1 = 무제한) */
  seats?: number;
  /** 케이스 저장 한도 (-1 = 무제한) */
  caseSaveLimit?: number;
  /** 추천 플랜 표시 */
  recommended?: boolean;
  /** 별도 문의 플랜 (Enterprise) */
  isCustom?: boolean;
}

/** 메인 구독에 얹는 부가서비스 (보험청구 등) */
export interface PlanAddon {
  key: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  requiresTier: string; // 이 티어 이상에서 add-on 가능
  includedInTiers: string[]; // 이미 포함된 티어들
  features: string[];
}

export interface Usage {
  aiQuery: {
    used: number;
    limit: number;
    isTrial?: boolean;
    trialEndsAt?: string | null;
  };
  resetDate: string;
}

export interface SubscriptionInfo {
  tier: string;
  expiresAt: string | null;
  hasBillingKey: boolean;
  /** 백엔드가 계산해 내려준 사용자별 접근 가능 기능 목록 (PLAN_FEATURES + add-on 반영) */
  features?: string[];
  seats?: number;
  caseSaveLimit?: number;
  subscription: {
    id: string;
    status: string;
    billingInterval: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAt: string | null;
  } | null;
}

interface SubscriptionState {
  plans: Plan[];
  currentSubscription: SubscriptionInfo | null;
  usage: Usage | null;
  isLoading: boolean;
  error: string | null;

  setPlans: (plans: Plan[]) => void;
  setSubscription: (info: SubscriptionInfo) => void;
  setUsage: (usage: Usage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  plans: [],
  currentSubscription: null,
  usage: null,
  isLoading: false,
  error: null,

  setPlans: (plans) => set({ plans }),
  setSubscription: (info) => set({ currentSubscription: info }),
  setUsage: (usage) => set({ usage }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      plans: [],
      currentSubscription: null,
      usage: null,
      isLoading: false,
      error: null,
    }),
}));
