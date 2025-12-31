import api from './api';

export interface HerbDetail {
  herbId: string;
  name: string;
  amount: string;
  purpose: string;
  efficacy: string;
  scientificInfo?: {
    activeCompounds?: string[];
    mechanism?: string;
    studies?: Array<{
      title: string;
      pmid?: string;
      summary: string;
    }>;
  };
}

export interface DrugInteraction {
  drugName: string;
  herbName: string;
  severity: 'critical' | 'warning' | 'info';
  mechanism: string;
  recommendation: string;
}

export interface Prescription {
  id: string;
  recordId: string;
  patientId: string;
  clinicId: string;
  formulaId?: string;
  formulaName?: string;
  customFormulaName?: string;
  herbs: HerbDetail[];
  dosageInstructions: string;
  duration: number;
  startDate: string;
  endDate: string;
  patientExplanation?: string;
  drugInteractions?: DrugInteraction[];
  scientificEvidence?: {
    overallEfficacy: string;
    keyStudies: Array<{
      title: string;
      conclusion: string;
    }>;
  };
  status: 'active' | 'completed' | 'cancelled';
  isSharedWithPatient: boolean;
  createdAt: string;
  clinic?: {
    id: string;
    name: string;
  };
  record?: {
    id: string;
    visitDate: string;
    chiefComplaint: string;
    diagnosis: string;
  };
}

export interface PrescriptionListResponse {
  data: Prescription[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 처방 목록 조회
export const getMyPrescriptions = async (params?: {
  status?: 'active' | 'completed' | 'cancelled';
  page?: number;
  limit?: number;
}): Promise<PrescriptionListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await api.get(`/patient-prescriptions?${queryParams.toString()}`);
  return response.data;
};

// 처방 상세 조회
export const getPrescriptionDetail = async (prescriptionId: string): Promise<Prescription> => {
  const response = await api.get(`/patient-prescriptions/${prescriptionId}`);
  return response.data;
};

// 활성 처방 목록
export const getActivePrescriptions = async (): Promise<Prescription[]> => {
  const response = await api.get('/patient-prescriptions/active');
  return response.data;
};

// 약재 상세 정보 조회
export const getHerbDetail = async (herbId: string): Promise<{
  id: string;
  koreanName: string;
  chineseName?: string;
  scientificName?: string;
  efficacy: string;
  indications: string[];
  contraindications?: string[];
  scientificEvidence?: Array<{
    title: string;
    summary: string;
    pmid?: string;
  }>;
}> => {
  const response = await api.get(`/patient-prescriptions/herb/${herbId}`);
  return response.data;
};

// 약물 상호작용 확인
export const checkDrugInteractions = async (prescriptionId: string): Promise<DrugInteraction[]> => {
  const response = await api.get(`/patient-prescriptions/${prescriptionId}/interactions`);
  return response.data;
};
