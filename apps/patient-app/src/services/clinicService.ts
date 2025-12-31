import api from './api';
import type {
  Clinic,
  Practitioner,
  AvailabilityResponse,
  PaginatedResponse,
  ClinicSearchParams,
} from '../types';

// 한의원 검색
export const searchClinics = async (
  params: ClinicSearchParams,
): Promise<PaginatedResponse<Clinic>> => {
  const response = await api.get('/clinics', { params });
  return response.data;
};

// 한의원 상세 조회
export const getClinicById = async (id: string): Promise<Clinic> => {
  const response = await api.get(`/clinics/${id}`);
  return response.data;
};

// 한의원 의료진 목록
export const getClinicPractitioners = async (
  clinicId: string,
): Promise<Practitioner[]> => {
  const response = await api.get(`/clinics/${clinicId}/practitioners`);
  return response.data;
};

// 예약 가능 시간 조회
export const getClinicAvailability = async (
  clinicId: string,
  startDate: string,
  endDate: string,
  practitionerId?: string,
): Promise<AvailabilityResponse> => {
  const response = await api.get(`/clinics/${clinicId}/availability`, {
    params: { startDate, endDate, practitionerId },
  });
  return response.data;
};

// 한의원 연결
export const connectToClinic = async (clinicId: string) => {
  const response = await api.post(`/clinics/${clinicId}/connect`);
  return response.data;
};

// 내가 연결된 한의원 목록
export const getMyClinics = async (): Promise<Clinic[]> => {
  const response = await api.get('/clinics/patient/my-clinics');
  return response.data;
};
