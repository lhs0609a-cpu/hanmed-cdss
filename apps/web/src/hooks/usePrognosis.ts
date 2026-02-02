import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Types
export interface PrognosisPrediction {
  id: string;
  recordId: string;
  patientId: string;
  prediction: {
    expectedDuration: {
      optimistic: number;
      typical: number;
      conservative: number;
    };
    improvementRate: {
      week1: number;
      week2: number;
      week4: number;
      week8: number;
    };
    confidenceScore: number;
    relapseProbability: number;
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative';
      weight: number;
    }>;
  };
  evidence: {
    similarCases: number;
    avgOutcome: number;
    dataSource: string;
    modelVersion: string;
  };
  actualOutcome?: {
    recordedAt: string;
    actualDuration: number;
    actualImprovement: number;
    notes: string;
  };
  createdAt: string;
}

export interface SimilarCaseStats {
  totalCases: number;
  avgDuration: number;
  avgImprovement: number;
  successRate: number;
  commonTreatments: Array<{ treatment: string; count: number; successRate: number }>;
  outcomeDistribution: Array<{ outcome: string; percentage: number }>;
}

// 예후 예측 생성
export function useGeneratePrognosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data } = await api.post(`/prognosis/predict/${recordId}`);
      return data.data as PrognosisPrediction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prognosis', data.recordId] });
      queryClient.invalidateQueries({ queryKey: ['prognosis-list'] });
    },
  });
}

// 예측 결과 조회
export function usePrognosis(predictionId: string) {
  return useQuery({
    queryKey: ['prognosis-detail', predictionId],
    queryFn: async () => {
      const { data } = await api.get(`/prognosis/${predictionId}`);
      return data.data as PrognosisPrediction;
    },
    enabled: !!predictionId,
  });
}

// 진료 기록의 예측 조회
export function usePrognosisByRecord(recordId: string) {
  return useQuery({
    queryKey: ['prognosis', recordId],
    queryFn: async () => {
      const { data } = await api.get(`/prognosis/record/${recordId}`);
      return data.data as PrognosisPrediction | null;
    },
    enabled: !!recordId,
  });
}

// 환자의 모든 예측 조회
export function usePatientPrognoses(patientId: string) {
  return useQuery({
    queryKey: ['prognosis-list', patientId],
    queryFn: async () => {
      const { data } = await api.get(`/prognosis/patient/${patientId}`);
      return data.data as PrognosisPrediction[];
    },
    enabled: !!patientId,
  });
}

// 실제 결과 기록
export function useRecordOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      predictionId,
      outcome,
    }: {
      predictionId: string;
      outcome: { actualDuration: number; actualImprovement: number; notes?: string };
    }) => {
      const { data } = await api.post(`/prognosis/${predictionId}/outcome`, outcome);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prognosis-detail', variables.predictionId] });
    },
  });
}

// 유사 케이스 통계
export function useSimilarCaseStats(symptoms: string[], constitution?: string, formula?: string) {
  return useQuery({
    queryKey: ['similar-case-stats', symptoms, constitution, formula],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('symptoms', symptoms.join(','));
      if (constitution) params.append('constitution', constitution);
      if (formula) params.append('formula', formula);

      const { data } = await api.get(`/prognosis/similar-stats?${params.toString()}`);
      return data.data as SimilarCaseStats;
    },
    enabled: symptoms.length > 0,
  });
}

// PDF 리포트 다운로드
export function usePrognosisReport(predictionId: string) {
  return useQuery({
    queryKey: ['prognosis-report', predictionId],
    queryFn: async () => {
      const { data } = await api.get(`/prognosis/${predictionId}/report`, {
        responseType: 'blob',
      });
      return data;
    },
    enabled: false, // 수동 트리거
  });
}
