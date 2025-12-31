// 환자 계정
export interface PatientAccount {
  id: string;
  phone: string;
  email?: string;
  name: string;
  birthDate: string;
  gender?: 'male' | 'female';
  profileImageUrl?: string;
  constitution?: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  pushEnabled: boolean;
  isVerified: boolean;
  createdAt: string;
}

// 한의원
export interface Clinic {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  addressRoad?: string;
  addressDetail?: string;
  latitude?: number;
  longitude?: number;
  operatingHours?: OperatingHours;
  specialties: string[];
  description?: string;
  images: ClinicImage[];
  isHanmedVerified: boolean;
  reservationEnabled: boolean;
  reservationInterval: number;
  ratingAverage: number;
  reviewCount: number;
  distance?: number;
}

export interface OperatingHours {
  [key: string]: {
    open: string;
    close: string;
    break?: { start: string; end: string };
    closed?: boolean;
  };
}

export interface ClinicImage {
  url: string;
  type: 'exterior' | 'interior' | 'treatment' | 'other';
  caption?: string;
}

// 의료진
export interface Practitioner {
  id: string;
  userId: string;
  displayName: string;
  role: 'owner' | 'practitioner';
  specialties: string[];
  bio?: string;
  profileImageUrl?: string;
  isAcceptingPatients: boolean;
}

// 예약
export interface Reservation {
  id: string;
  clinicId: string;
  clinic?: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
  };
  practitionerId?: string;
  practitioner?: {
    id: string;
    name: string;
  };
  reservationDate: string;
  reservationTime: string;
  durationMinutes: number;
  visitType?: 'initial' | 'follow_up' | 'consultation';
  visitReason?: string;
  symptomsNote?: string;
  status: ReservationStatus;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

// 예약 가능 시간
export interface AvailabilityResponse {
  available: boolean;
  message?: string;
  clinicId?: string;
  operatingHours?: OperatingHours;
  reservationInterval?: number;
  slots?: Record<string, string[]>;
}

// API 응답
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  patient: PatientAccount;
  accessToken: string;
  refreshToken: string;
}

// 검색 필터
export interface ClinicSearchParams {
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  specialties?: string[];
  hanmedVerifiedOnly?: boolean;
  reservationEnabledOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'distance' | 'rating' | 'reviewCount' | 'name';
}
