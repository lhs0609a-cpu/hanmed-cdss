import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useSubscriptionStore, Plan, SubscriptionInfo, Usage } from '@/stores/subscriptionStore';

interface PlansResponse {
  plans: Plan[];
}

interface RegisterCardDto {
  cardNumber: string;
  expirationYear: string;
  expirationMonth: string;
  cardPassword: string;
  customerIdentityNumber: string;
}

interface SubscribeDto {
  tier: 'basic' | 'professional' | 'clinic';
  interval: 'monthly' | 'yearly';
}

// 요금제 목록 조회
export function usePlans() {
  const setPlans = useSubscriptionStore((state) => state.setPlans);

  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await api.get<PlansResponse>('/subscription/plans');
      const plans = data.plans;
      setPlans(plans);
      return plans;
    },
    staleTime: 1000 * 60 * 60, // 1시간
  });
}

// 현재 구독 정보 조회
export function useSubscriptionInfo() {
  const setSubscription = useSubscriptionStore((state) => state.setSubscription);

  return useQuery({
    queryKey: ['subscription-info'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionInfo>('/subscription/info');
      setSubscription(data);
      return data;
    },
  });
}

// 사용량 조회
export function useUsage() {
  const setUsage = useSubscriptionStore((state) => state.setUsage);

  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const { data } = await api.get<Usage>('/subscription/usage');
      setUsage(data);
      return data;
    },
    refetchInterval: 1000 * 60 * 5, // 5분마다 갱신
  });
}

// 카드 등록 (빌링키 발급)
export function useRegisterCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: RegisterCardDto) => {
      const { data } = await api.post<{ success: boolean; message: string; cardNumber: string }>(
        '/subscription/register-card',
        dto
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
    },
  });
}

// 구독 결제
export function useSubscribe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: SubscribeDto) => {
      const { data } = await api.post<{ success: boolean; message: string; paymentKey: string }>(
        '/subscription/subscribe',
        dto
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

// 구독 취소 (기간 종료 시)
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: boolean; message: string }>(
        '/subscription/cancel'
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
    },
  });
}

// 구독 즉시 취소
export function useCancelSubscriptionImmediately() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<{ success: boolean; message: string }>(
        '/subscription/cancel-immediately'
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

// 구독 정보 새로고침
export function useRefreshSubscription() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
    queryClient.invalidateQueries({ queryKey: ['usage'] });
  };
}

// 결제 내역 관련 타입
export interface PaymentRecord {
  id: string;
  orderId: string;
  orderName: string;
  amount: number;
  baseAmount: number;
  overageAmount: number;
  overageCount: number;
  refundedAmount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  cardCompany: string | null;
  cardNumber: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt: string | null;
  createdAt: string;
}

interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RefundRequestDto {
  paymentId: string;
  reason: string;
  amount?: number;
}

// 결제 내역 조회
export function usePaymentHistory(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ['payment-history', page, limit],
    queryFn: async () => {
      const { data } = await api.get<PaymentHistoryResponse>(
        `/subscription/payments?page=${page}&limit=${limit}`
      );
      return data;
    },
  });
}

// 환불 요청
export function useRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: RefundRequestDto) => {
      const { data } = await api.post<{ success: boolean; refundAmount: number; refundId: string }>(
        '/subscription/refund',
        dto
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['refund-history'] });
    },
  });
}

// 환불 내역 조회
export function useRefundHistory() {
  return useQuery({
    queryKey: ['refund-history'],
    queryFn: async () => {
      const { data } = await api.get<{ refunds: RefundRecord[] }>(
        '/subscription/refunds'
      );
      return data;
    },
  });
}

// ========== 무료 체험 관련 ==========

export interface TrialStatus {
  isTrialing: boolean;
  daysRemaining: number | null;
  trialEndsAt: string | null;
  canStartTrial: boolean;
  aiUsed?: number;
  aiLimit?: number;
}

// 무료 체험 상태 조회
export function useTrialStatus() {
  return useQuery({
    queryKey: ['trial-status'],
    queryFn: async () => {
      const { data } = await api.get<TrialStatus>('/subscription/trial/status');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 무료 체험 시작
export function useStartFreeTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: boolean; trialEndsAt: string; message: string }>(
        '/subscription/trial/start'
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      queryClient.invalidateQueries({ queryKey: ['trial-status'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}
