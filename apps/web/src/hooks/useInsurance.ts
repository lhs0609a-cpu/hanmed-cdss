import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Types
export interface DiagnosisCode {
  code: string;
  name: string;
  isPrimary: boolean;
  confidence?: number;
}

export interface TreatmentItem {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  recordId: string;
  insuranceType: string;
  status: 'draft' | 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'partial' | 'paid';
  treatmentDate: string;
  diagnosisCodes: DiagnosisCode[];
  treatmentItems: TreatmentItem[];
  totalAmount: number;
  patientCopay: number;
  insuranceAmount: number;
  aiAnalysis?: {
    suggestedCodes: DiagnosisCode[];
    riskScore: number;
    warnings: string[];
    suggestions: string[];
    missingItems: string[];
  };
  reviewResult?: {
    reviewedAt: string;
    status: string;
    approvedAmount: number;
    rejectedAmount: number;
    rejectionReason?: string;
  };
  createdAt: string;
  patient?: {
    name: string;
  };
}

export interface ClaimSummary {
  totalClaims: number;
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  byStatus: Record<string, { count: number; amount: number }>;
}

// 청구서 자동 생성
export function useAutoCreateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data } = await api.post(`/insurance/claims/auto-create/${recordId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
    },
  });
}

// 청구서 목록 조회
export function useInsuranceClaims(options?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  return useQuery({
    queryKey: ['insurance-claims', options],
    queryFn: async () => {
      const { data } = await api.get(`/insurance/claims?${params.toString()}`);
      return data.data as { claims: InsuranceClaim[]; total: number; page: number; limit: number };
    },
  });
}

// 청구서 상세 조회
export function useInsuranceClaim(claimId: string) {
  return useQuery({
    queryKey: ['insurance-claim', claimId],
    queryFn: async () => {
      const { data } = await api.get(`/insurance/claims/${claimId}`);
      return data.data as InsuranceClaim;
    },
    enabled: !!claimId,
  });
}

// 청구서 수정
export function useUpdateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ claimId, ...dto }: { claimId: string; diagnosisCodes?: DiagnosisCode[]; treatmentItems?: TreatmentItem[]; notes?: string }) => {
      const { data } = await api.put(`/insurance/claims/${claimId}`, dto);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claim', variables.claimId] });
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
    },
  });
}

// 청구서 제출
export function useSubmitClaims() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimIds: string[]) => {
      const { data } = await api.post('/insurance/claims/submit', { claimIds });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
    },
  });
}

// 심사 결과 기록
export function useRecordReviewResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ claimId, ...dto }: { claimId: string; status: string; approvedAmount: number; rejectionReason?: string }) => {
      const { data } = await api.post(`/insurance/claims/${claimId}/review-result`, dto);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claim', variables.claimId] });
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
    },
  });
}

// 청구 통계
export function useClaimSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['claim-summary', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get(`/insurance/summary?startDate=${startDate}&endDate=${endDate}`);
      return data.data as ClaimSummary;
    },
    enabled: !!startDate && !!endDate,
  });
}

// 누락 청구 감지
export function useMissingClaims(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['missing-claims', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get(`/insurance/missing?startDate=${startDate}&endDate=${endDate}`);
      return data.data as { count: number; records: any[] };
    },
    enabled: !!startDate && !!endDate,
  });
}
