import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Types
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: 'seasonal' | 'followup' | 'reactivation' | 'birthday' | 'wellness' | 'promotion' | 'custom';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  targetingRules: {
    segments?: string[];
    symptoms?: string[];
    constitutions?: string[];
    lastVisitDaysAgo?: { min?: number; max?: number };
    ageRange?: { min?: number; max?: number };
    gender?: 'male' | 'female' | 'all';
  };
  scheduledAt?: string;
  startDate?: string;
  endDate?: string;
  statistics: {
    targetCount: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    clickedCount: number;
    convertedCount: number;
    unsubscribedCount: number;
  };
  createdAt: string;
}

export interface AutoMessage {
  id: string;
  name: string;
  triggerType: 'scheduled' | 'treatment_complete' | 'medication_end' | 'no_visit' | 'symptom_season' | 'health_score_drop' | 'birthday' | 'custom_date';
  triggerConditions: {
    daysAfterTreatment?: number;
    daysAfterMedicationEnd?: number;
    noVisitDays?: number;
    seasonMonth?: number[];
    symptoms?: string[];
    healthScoreDropThreshold?: number;
    beforeBirthdayDays?: number;
  };
  channel: 'sms' | 'kakao' | 'push' | 'email';
  messageTemplate: string;
  actionButtons?: Array<{ text: string; url?: string; action?: string }>;
  isActive: boolean;
  statistics: {
    sentCount: number;
    deliveredCount: number;
    clickedCount: number;
    convertedCount: number;
  };
  createdAt: string;
}

export interface PatientSegment {
  id: string;
  name: string;
  description?: string;
  rules: {
    conditions: Array<{ field: string; operator: string; value: any }>;
    logic: 'and' | 'or';
  };
  patientCount: number;
  autoUpdate: boolean;
  lastUpdatedAt?: string;
}

export interface CrmDashboard {
  activeCampaigns: number;
  totalMessages: number;
  conversionRate: number;
  topSegments: Array<{ name: string; count: number }>;
  recentActivity: Array<{
    id: string;
    patientId: string;
    channel: string;
    status: string;
    sentAt: string;
    patient?: { name: string };
  }>;
}

export interface CampaignAnalytics {
  campaign: Campaign;
  metrics: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
  timeline: Array<{ date: string; sent: number; opened: number; clicked: number }>;
}

// CRM 대시보드
export function useCrmDashboard() {
  return useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/crm/dashboard');
      return data.data as CrmDashboard;
    },
  });
}

// 캠페인 목록
export function useCampaigns(status?: string) {
  return useQuery({
    queryKey: ['campaigns', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const { data } = await api.get(`/crm/campaigns${params}`);
      return data.data as Campaign[];
    },
  });
}

// 캠페인 상세
export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const { data } = await api.get(`/crm/campaigns/${campaignId}`);
      return data.data as Campaign;
    },
    enabled: !!campaignId,
  });
}

// 캠페인 성과
export function useCampaignAnalytics(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: async () => {
      const { data } = await api.get(`/crm/campaigns/${campaignId}/analytics`);
      return data.data as CampaignAnalytics;
    },
    enabled: !!campaignId,
  });
}

// 캠페인 생성
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: Omit<Campaign, 'id' | 'status' | 'statistics' | 'createdAt'>) => {
      const { data } = await api.post('/crm/campaigns', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
    },
  });
}

// 캠페인 시작
export function useStartCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data } = await api.post(`/crm/campaigns/${campaignId}/start`);
      return data.data;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// 캠페인 일시정지
export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data } = await api.post(`/crm/campaigns/${campaignId}/pause`);
      return data.data;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// 자동 메시지 목록
export function useAutoMessages() {
  return useQuery({
    queryKey: ['auto-messages'],
    queryFn: async () => {
      const { data } = await api.get('/crm/auto-messages');
      return data.data as AutoMessage[];
    },
  });
}

// 자동 메시지 생성
export function useCreateAutoMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: Omit<AutoMessage, 'id' | 'statistics' | 'createdAt'>) => {
      const { data } = await api.post('/crm/auto-messages', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-messages'] });
    },
  });
}

// 자동 메시지 토글
export function useToggleAutoMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data } = await api.post(`/crm/auto-messages/${messageId}/toggle`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-messages'] });
    },
  });
}

// 세그먼트 목록
export function useSegments() {
  return useQuery({
    queryKey: ['segments'],
    queryFn: async () => {
      const { data } = await api.get('/crm/segments');
      return data.data as PatientSegment[];
    },
  });
}

// 세그먼트 생성
export function useCreateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { name: string; description?: string; conditions: any[]; logic: 'and' | 'or'; autoUpdate?: boolean }) => {
      const { data } = await api.post('/crm/segments', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}

// 메시지 발송
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { patientIds: string[]; channel: string; message: string }) => {
      const { data } = await api.post('/crm/messages/send', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
    },
  });
}
