import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

// Types
export interface SymptomSummary {
  patientId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  symptoms: Array<{
    name: string;
    avgSeverity: number;
    trend: 'improving' | 'stable' | 'worsening';
    occurrences: number;
    lastRecorded: string;
  }>;
  overallTrend: 'improving' | 'stable' | 'worsening';
  healthScoreHistory: Array<{
    date: string;
    score: number;
    factors: Record<string, number>;
  }>;
  keyInsights: string[];
  recommendations: string[];
}

export interface PreVisitAnalysis {
  patientId: string;
  reservationId: string;
  summary: {
    lastVisitDate: string;
    daysSinceLastVisit: number;
    currentHealthScore: number;
    scoreChange: number;
  };
  symptomChanges: Array<{
    symptom: string;
    previousSeverity: number;
    currentSeverity: number;
    trend: 'better' | 'same' | 'worse';
  }>;
  medicationAdherence: {
    overallRate: number;
    missedDoses: number;
    totalDoses: number;
    pattern: string;
  };
  alerts: Array<{
    type: 'warning' | 'info' | 'critical';
    message: string;
    data?: any;
  }>;
  suggestedQuestions: string[];
  previousTreatmentSummary: string;
}

export interface AdherenceReport {
  patientId: string;
  prescriptionId?: string;
  period: {
    startDate: string;
    endDate: string;
  };
  overall: {
    adherenceRate: number;
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    lateDoses: number;
  };
  daily: Array<{
    date: string;
    scheduled: number;
    taken: number;
    missed: number;
    late: number;
  }>;
  patterns: {
    bestDays: string[];
    worstDays: string[];
    commonMissedTimes: string[];
    insights: string[];
  };
  byMedication?: Array<{
    medicationName: string;
    adherenceRate: number;
    missedCount: number;
  }>;
}

export interface PatientAlert {
  id: string;
  patientId: string;
  type: 'symptom_worsening' | 'low_adherence' | 'health_score_drop' | 'missed_appointment' | 'no_journal' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  createdAt: string;
  isRead: boolean;
  patient?: {
    name: string;
  };
}

// 환자 증상 요약 (한의사용)
export function usePatientSymptomSummary(patientId: string, days: number = 30) {
  return useQuery({
    queryKey: ['patient-symptom-summary', patientId, days],
    queryFn: async () => {
      const { data } = await api.get(`/patient-insights/${patientId}/symptoms?days=${days}`);
      return data.data as SymptomSummary;
    },
    enabled: !!patientId,
  });
}

// 진료 전 AI 사전 분석
export function usePreVisitAnalysis(patientId: string, reservationId?: string) {
  return useQuery({
    queryKey: ['pre-visit-analysis', patientId, reservationId],
    queryFn: async () => {
      const params = reservationId ? `?reservationId=${reservationId}` : '';
      const { data } = await api.get(`/patient-insights/${patientId}/pre-visit${params}`);
      return data.data as PreVisitAnalysis;
    },
    enabled: !!patientId,
  });
}

// 복약 순응도 리포트
export function useAdherenceReport(patientId: string, prescriptionId?: string) {
  return useQuery({
    queryKey: ['adherence-report', patientId, prescriptionId],
    queryFn: async () => {
      const params = prescriptionId ? `?prescriptionId=${prescriptionId}` : '';
      const { data } = await api.get(`/patient-insights/${patientId}/adherence${params}`);
      return data.data as AdherenceReport;
    },
    enabled: !!patientId,
  });
}

// 환자 알림 목록
export function usePatientAlerts(options?: { unreadOnly?: boolean; severity?: string }) {
  return useQuery({
    queryKey: ['patient-alerts', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.unreadOnly) params.append('unreadOnly', 'true');
      if (options?.severity) params.append('severity', options.severity);

      const { data } = await api.get(`/patient-insights/alerts?${params.toString()}`);
      return data.data as PatientAlert[];
    },
  });
}

// 특정 환자의 알림
export function usePatientAlertsForPatient(patientId: string) {
  return useQuery({
    queryKey: ['patient-alerts', patientId],
    queryFn: async () => {
      const { data } = await api.get(`/patient-insights/${patientId}/alerts`);
      return data.data as PatientAlert[];
    },
    enabled: !!patientId,
  });
}

// 전체 인사이트 대시보드
export function useInsightsDashboard() {
  return useQuery({
    queryKey: ['insights-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/patient-insights/dashboard');
      return data.data as {
        totalActivePatients: number;
        patientsNeedingAttention: number;
        upcomingAppointments: number;
        recentAlerts: PatientAlert[];
        lowAdherencePatients: Array<{
          patientId: string;
          patientName: string;
          adherenceRate: number;
        }>;
        worseningPatients: Array<{
          patientId: string;
          patientName: string;
          healthScoreChange: number;
        }>;
      };
    },
  });
}

// 건강 점수 히스토리
export function useHealthScoreHistory(patientId: string, days: number = 90) {
  return useQuery({
    queryKey: ['health-score-history', patientId, days],
    queryFn: async () => {
      const { data } = await api.get(`/patient-insights/${patientId}/health-score?days=${days}`);
      return data.data as Array<{
        date: string;
        score: number;
        components: Record<string, number>;
      }>;
    },
    enabled: !!patientId,
  });
}

// 증상 일지 엔트리 목록
export function useJournalEntries(patientId: string, limit: number = 30) {
  return useQuery({
    queryKey: ['journal-entries', patientId, limit],
    queryFn: async () => {
      const { data } = await api.get(`/patient-insights/${patientId}/journal?limit=${limit}`);
      return data.data as Array<{
        id: string;
        date: string;
        symptoms: Array<{ name: string; severity: number }>;
        mood: number;
        sleep: number;
        notes?: string;
      }>;
    },
    enabled: !!patientId,
  });
}
