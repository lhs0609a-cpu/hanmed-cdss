import { create } from 'zustand';

export interface Plan {
  tier: string;
  name: string;
  description: string;
  features: string[];
  monthlyPrice: number;
  yearlyPrice: number;
  aiQueryLimit: number;
}

export interface Usage {
  aiQuery: { used: number; limit: number };
  resetDate: string;
}

export interface SubscriptionInfo {
  tier: string;
  expiresAt: string | null;
  hasBillingKey: boolean;
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
