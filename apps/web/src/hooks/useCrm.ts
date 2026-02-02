import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Mock Data for Demo Mode
const MOCK_DASHBOARD: CrmDashboard = {
  activeCampaigns: 3,
  totalMessages: 1247,
  conversionRate: 12.5,
  topSegments: [
    { name: '30일 미방문', count: 89 },
    { name: '소화기 환자', count: 156 },
    { name: '정기 고객', count: 234 },
    { name: '체질 치료중', count: 45 },
    { name: '신규 환자', count: 67 },
  ],
  recentActivity: [
    { id: '1', patientId: 'p1', channel: 'kakao', status: '발송완료', sentAt: new Date().toISOString(), patient: { name: '김*민' } },
    { id: '2', patientId: 'p2', channel: 'sms', status: '발송완료', sentAt: new Date(Date.now() - 3600000).toISOString(), patient: { name: '이*영' } },
    { id: '3', patientId: 'p3', channel: 'kakao', status: '발송완료', sentAt: new Date(Date.now() - 7200000).toISOString(), patient: { name: '박*수' } },
  ],
};

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: '환절기 건강 캠페인',
    description: '환절기 건강관리 안내 메시지',
    type: 'seasonal',
    status: 'active',
    targetingRules: { symptoms: ['감기', '알레르기'] },
    statistics: { targetCount: 156, sentCount: 142, deliveredCount: 138, openedCount: 89, clickedCount: 34, convertedCount: 12, unsubscribedCount: 2 },
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '30일 미방문 환자 리마인드',
    description: '장기 미방문 환자 대상 건강 체크 안내',
    type: 'reactivation',
    status: 'active',
    targetingRules: { lastVisitDaysAgo: { min: 30 } },
    statistics: { targetCount: 89, sentCount: 85, deliveredCount: 82, openedCount: 56, clickedCount: 23, convertedCount: 8, unsubscribedCount: 1 },
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: '치료 완료 팔로업',
    description: '치료 완료 후 경과 체크',
    type: 'followup',
    status: 'paused',
    targetingRules: {},
    statistics: { targetCount: 45, sentCount: 45, deliveredCount: 44, openedCount: 32, clickedCount: 15, convertedCount: 5, unsubscribedCount: 0 },
    createdAt: new Date().toISOString(),
  },
];

const MOCK_AUTO_MESSAGES: AutoMessage[] = [
  {
    id: '1',
    name: '치료 완료 후 안내',
    triggerType: 'treatment_complete',
    triggerConditions: { daysAfterTreatment: 7 },
    channel: 'kakao',
    messageTemplate: '#{환자명}님, 치료 후 경과는 어떠신가요? 궁금한 점이 있으시면 언제든 연락주세요.',
    isActive: true,
    statistics: { sentCount: 234, deliveredCount: 230, clickedCount: 78, convertedCount: 23 },
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '복약 종료 리마인드',
    triggerType: 'medication_end',
    triggerConditions: { daysAfterMedicationEnd: 3 },
    channel: 'sms',
    messageTemplate: '#{환자명}님, 처방받으신 한약 복용이 완료되었습니다. 경과 확인을 위해 내원 부탁드립니다.',
    isActive: true,
    statistics: { sentCount: 156, deliveredCount: 152, clickedCount: 45, convertedCount: 18 },
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: '생일 축하',
    triggerType: 'birthday',
    triggerConditions: { beforeBirthdayDays: 0 },
    channel: 'kakao',
    messageTemplate: '#{환자명}님, 생일 축하드립니다! 건강한 한 해 되시길 바랍니다.',
    isActive: false,
    statistics: { sentCount: 67, deliveredCount: 65, clickedCount: 12, convertedCount: 3 },
    createdAt: new Date().toISOString(),
  },
];

const MOCK_SEGMENTS: PatientSegment[] = [
  { id: '1', name: '30일 미방문 환자', description: '최근 30일 이상 방문하지 않은 환자', rules: { conditions: [], logic: 'and' }, patientCount: 89, autoUpdate: true, lastUpdatedAt: new Date().toISOString() },
  { id: '2', name: '소화기 질환', description: '소화불량, 위염 등 소화기 증상 환자', rules: { conditions: [], logic: 'and' }, patientCount: 156, autoUpdate: true, lastUpdatedAt: new Date().toISOString() },
  { id: '3', name: 'VIP 고객', description: '월 2회 이상 방문 정기 고객', rules: { conditions: [], logic: 'and' }, patientCount: 234, autoUpdate: true, lastUpdatedAt: new Date().toISOString() },
  { id: '4', name: '체질 치료중', description: '사상체질 치료 진행중인 환자', rules: { conditions: [], logic: 'and' }, patientCount: 45, autoUpdate: false },
  { id: '5', name: '신규 환자', description: '최근 한달 내 첫 방문 환자', rules: { conditions: [], logic: 'and' }, patientCount: 67, autoUpdate: true, lastUpdatedAt: new Date().toISOString() },
];

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
      try {
        const { data } = await api.get('/crm/dashboard');
        return data.data as CrmDashboard;
      } catch {
        // Return mock data for demo mode
        return MOCK_DASHBOARD;
      }
    },
  });
}

// 캠페인 목록
export function useCampaigns(status?: string) {
  return useQuery({
    queryKey: ['campaigns', status],
    queryFn: async () => {
      try {
        const params = status ? `?status=${status}` : '';
        const { data } = await api.get(`/crm/campaigns${params}`);
        return data.data as Campaign[];
      } catch {
        // Return mock data for demo mode
        if (status) {
          return MOCK_CAMPAIGNS.filter(c => c.status === status);
        }
        return MOCK_CAMPAIGNS;
      }
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
      try {
        const { data } = await api.get('/crm/auto-messages');
        return data.data as AutoMessage[];
      } catch {
        // Return mock data for demo mode
        return MOCK_AUTO_MESSAGES;
      }
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
      try {
        const { data } = await api.get('/crm/segments');
        return data.data as PatientSegment[];
      } catch {
        // Return mock data for demo mode
        return MOCK_SEGMENTS;
      }
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
