import api from './api';

// ===== 건강 일지 =====

export interface HealthJournal {
  id: string;
  patientId: string;
  recordedDate: string;
  recordedTime?: string;
  overallCondition?: number;
  painLevel?: number;
  energyLevel?: number;
  sleepQuality?: number;
  sleepHours?: number;
  symptoms?: Array<{
    name: string;
    severity: number;
    location?: string;
    duration?: string;
    notes?: string;
  }>;
  medicationTaken?: boolean;
  medicationNotes?: string;
  meals?: Array<{
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    time?: string;
    description: string;
    appetite?: number;
  }>;
  exerciseDone?: boolean;
  exerciseNotes?: string;
  exerciseDuration?: number;
  stressLevel?: number;
  mood?: string;
  notes?: string;
  createdAt: string;
}

export interface JournalListResponse {
  data: HealthJournal[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateJournalDto {
  recordedDate: string;
  recordedTime?: string;
  overallCondition?: number;
  painLevel?: number;
  energyLevel?: number;
  sleepQuality?: number;
  sleepHours?: number;
  symptoms?: Array<{
    name: string;
    severity: number;
    location?: string;
    duration?: string;
    notes?: string;
  }>;
  medicationTaken?: boolean;
  medicationNotes?: string;
  meals?: Array<{
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    time?: string;
    description: string;
    appetite?: number;
  }>;
  exerciseDone?: boolean;
  exerciseNotes?: string;
  exerciseDuration?: number;
  stressLevel?: number;
  mood?: string;
  notes?: string;
}

// 건강 일지 목록 조회
export const getJournals = async (params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<JournalListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await api.get(`/patient-health/journal?${queryParams.toString()}`);
  return response.data;
};

// 특정 날짜 건강 일지
export const getJournalByDate = async (date: string): Promise<HealthJournal | null> => {
  const response = await api.get(`/patient-health/journal/date/${date}`);
  return response.data;
};

// 건강 일지 작성
export const createJournal = async (data: CreateJournalDto): Promise<HealthJournal> => {
  const response = await api.post('/patient-health/journal', data);
  return response.data;
};

// 건강 일지 수정
export const updateJournal = async (id: string, data: Partial<CreateJournalDto>): Promise<HealthJournal> => {
  const response = await api.patch(`/patient-health/journal/${id}`, data);
  return response.data;
};

// 건강 리포트 조회
export const getHealthReport = async (startDate: string, endDate: string) => {
  const response = await api.get(`/patient-health/report?startDate=${startDate}&endDate=${endDate}`);
  return response.data;
};

// ===== 복약 알림 =====

export interface MedicationReminder {
  id: string;
  patientId: string;
  prescriptionId?: string;
  title: string;
  reminderTime: string;
  reminderDays: number[];
  isActive: boolean;
  notes?: string;
  prescription?: {
    id: string;
    formulaName: string;
  };
}

// 알림 목록 조회
export const getReminders = async (): Promise<MedicationReminder[]> => {
  const response = await api.get('/patient-health/reminders');
  return response.data;
};

// 활성 알림 목록
export const getActiveReminders = async (): Promise<MedicationReminder[]> => {
  const response = await api.get('/patient-health/reminders/active');
  return response.data;
};

// 알림 생성
export const createReminder = async (data: {
  prescriptionId?: string;
  title: string;
  reminderTime: string;
  reminderDays?: number[];
  notes?: string;
}): Promise<MedicationReminder> => {
  const response = await api.post('/patient-health/reminders', data);
  return response.data;
};

// 알림 수정
export const updateReminder = async (id: string, data: Partial<{
  title: string;
  reminderTime: string;
  reminderDays: number[];
  isActive: boolean;
  notes: string;
}>): Promise<MedicationReminder> => {
  const response = await api.patch(`/patient-health/reminders/${id}`, data);
  return response.data;
};

// 알림 삭제
export const deleteReminder = async (id: string): Promise<void> => {
  await api.delete(`/patient-health/reminders/${id}`);
};

// ===== 복약 기록 =====

export interface MedicationLog {
  id: string;
  patientId: string;
  prescriptionId?: string;
  reminderId?: string;
  takenAt: string;
  status: 'taken' | 'skipped' | 'delayed';
  notes?: string;
  sideEffects?: Array<{
    symptom: string;
    severity: number;
    notes?: string;
  }>;
}

// 복약 기록 조회
export const getMedicationLogs = async (params?: {
  prescriptionId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<MedicationLog[]> => {
  const queryParams = new URLSearchParams();
  if (params?.prescriptionId) queryParams.append('prescriptionId', params.prescriptionId);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const response = await api.get(`/patient-health/medication-logs?${queryParams.toString()}`);
  return response.data;
};

// 오늘 복약 기록
export const getTodayLogs = async (): Promise<MedicationLog[]> => {
  const response = await api.get('/patient-health/medication-logs/today');
  return response.data;
};

// 복약 기록 생성
export const createMedicationLog = async (data: {
  prescriptionId?: string;
  reminderId?: string;
  takenAt: string;
  status?: 'taken' | 'skipped' | 'delayed';
  notes?: string;
  sideEffects?: Array<{
    symptom: string;
    severity: number;
    notes?: string;
  }>;
}): Promise<MedicationLog> => {
  const response = await api.post('/patient-health/medication-logs', data);
  return response.data;
};

// 복약 통계
export const getMedicationStats = async (
  prescriptionId: string,
  startDate: string,
  endDate: string
) => {
  const response = await api.get(
    `/patient-health/medication-stats/${prescriptionId}?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data;
};
