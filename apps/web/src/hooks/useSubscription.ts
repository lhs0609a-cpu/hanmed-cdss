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
      const { data } = await api.get<{ data: PlansResponse }>('/subscription/plans');
      const plans = data.data.plans;
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
      const { data } = await api.get<{ data: SubscriptionInfo }>('/subscription/info');
      const info = data.data;
      setSubscription(info);
      return info;
    },
  });
}

// 사용량 조회
export function useUsage() {
  const setUsage = useSubscriptionStore((state) => state.setUsage);

  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Usage }>('/subscription/usage');
      const usage = data.data;
      setUsage(usage);
      return usage;
    },
    refetchInterval: 1000 * 60 * 5, // 5분마다 갱신
  });
}

// 카드 등록 (빌링키 발급)
export function useRegisterCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: RegisterCardDto) => {
      const { data } = await api.post<{
        data: { success: boolean; message: string; cardNumber: string };
      }>('/subscription/register-card', dto);
      return data.data;
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
      const { data } = await api.post<{
        data: { success: boolean; message: string; paymentKey: string };
      }>('/subscription/subscribe', dto);
      return data.data;
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
      const { data } = await api.post<{
        data: { success: boolean; message: string };
      }>('/subscription/cancel');
      return data.data;
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
      const { data } = await api.delete<{
        data: { success: boolean; message: string };
      }>('/subscription/cancel-immediately');
      return data.data;
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
