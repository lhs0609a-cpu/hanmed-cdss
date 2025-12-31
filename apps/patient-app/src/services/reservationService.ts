import api from './api';
import type { Reservation, ReservationStatus } from '../types';

// 예약 생성
export const createReservation = async (data: {
  clinicId: string;
  practitionerId?: string;
  reservationDate: string;
  reservationTime: string;
  visitType?: 'initial' | 'follow_up' | 'consultation';
  visitReason?: string;
  symptomsNote?: string;
}): Promise<Reservation> => {
  const response = await api.post('/reservations', data);
  return response.data;
};

// 내 예약 목록 조회
export const getMyReservations = async (params?: {
  status?: ReservationStatus;
  startDate?: string;
  endDate?: string;
  clinicId?: string;
}): Promise<Reservation[]> => {
  const response = await api.get('/reservations', { params });
  return response.data;
};

// 다가오는 예약 조회
export const getUpcomingReservations = async (): Promise<Reservation[]> => {
  const response = await api.get('/reservations/upcoming');
  return response.data;
};

// 예약 상세 조회
export const getReservationById = async (id: string): Promise<Reservation> => {
  const response = await api.get(`/reservations/${id}`);
  return response.data;
};

// 예약 변경
export const updateReservation = async (
  id: string,
  data: {
    reservationDate?: string;
    reservationTime?: string;
    practitionerId?: string;
    visitReason?: string;
    symptomsNote?: string;
  },
): Promise<Reservation> => {
  const response = await api.patch(`/reservations/${id}`, data);
  return response.data;
};

// 예약 취소
export const cancelReservation = async (
  id: string,
  cancellationReason?: string,
): Promise<Reservation> => {
  const response = await api.delete(`/reservations/${id}`, {
    data: { cancellationReason },
  });
  return response.data;
};
