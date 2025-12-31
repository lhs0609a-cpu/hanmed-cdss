import api from './api';

export interface HealthRecord {
  id: string;
  patientId: string;
  clinicId: string;
  practitionerId: string;
  visitDate: string;
  chiefComplaint: string;
  symptoms?: Array<{
    name: string;
    severity?: number;
    duration?: string;
  }>;
  diagnosis?: string;
  diagnosisCode?: string;
  treatment?: string;
  practitionerNotes?: string;
  patientExplanation?: string;
  aiHealthInsights?: {
    summary: string;
    keyFindings: string[];
    riskFactors?: string[];
    improvements?: string[];
    lifestyleAdvice?: string[];
  };
  isSharedWithPatient: boolean;
  sharedAt?: string;
  createdAt: string;
  clinic?: {
    id: string;
    name: string;
  };
  practitioner?: {
    id: string;
    name: string;
  };
}

export interface RecordListResponse {
  data: HealthRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RecordFilters {
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// 진료 기록 목록 조회
export const getMyRecords = async (filters?: RecordFilters): Promise<RecordListResponse> => {
  const params = new URLSearchParams();
  if (filters?.clinicId) params.append('clinicId', filters.clinicId);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await api.get(`/patient-records?${params.toString()}`);
  return response.data;
};

// 진료 기록 상세 조회
export const getRecordDetail = async (recordId: string): Promise<HealthRecord> => {
  const response = await api.get(`/patient-records/${recordId}`);
  return response.data;
};

// 최근 진료 기록 조회
export const getRecentRecords = async (limit: number = 5): Promise<HealthRecord[]> => {
  const response = await api.get(`/patient-records/recent?limit=${limit}`);
  return response.data;
};

// 진료 기록 요약 조회
export const getRecordSummary = async (startDate: string, endDate: string) => {
  const response = await api.get(`/patient-records/summary?startDate=${startDate}&endDate=${endDate}`);
  return response.data;
};
