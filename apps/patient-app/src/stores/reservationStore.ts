import { create } from 'zustand';
import type { Reservation } from '../types';

interface ReservationState {
  // 예약 목록
  reservations: Reservation[];
  upcomingReservations: Reservation[];
  isLoading: boolean;

  // 새 예약 정보
  newReservation: {
    clinicId: string | null;
    practitionerId: string | null;
    date: string | null;
    time: string | null;
    visitType: 'initial' | 'follow_up' | 'consultation' | null;
    visitReason: string;
    symptomsNote: string;
  };

  // Actions
  setReservations: (reservations: Reservation[]) => void;
  setUpcomingReservations: (reservations: Reservation[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  updateNewReservation: (data: Partial<ReservationState['newReservation']>) => void;
  resetNewReservation: () => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: string, data: Partial<Reservation>) => void;
  removeReservation: (id: string) => void;
}

const initialNewReservation = {
  clinicId: null,
  practitionerId: null,
  date: null,
  time: null,
  visitType: null,
  visitReason: '',
  symptomsNote: '',
};

export const useReservationStore = create<ReservationState>((set, get) => ({
  reservations: [],
  upcomingReservations: [],
  isLoading: false,
  newReservation: initialNewReservation,

  setReservations: (reservations) => set({ reservations }),

  setUpcomingReservations: (reservations) =>
    set({ upcomingReservations: reservations }),

  setIsLoading: (isLoading) => set({ isLoading }),

  updateNewReservation: (data) =>
    set((state) => ({
      newReservation: { ...state.newReservation, ...data },
    })),

  resetNewReservation: () => set({ newReservation: initialNewReservation }),

  addReservation: (reservation) =>
    set((state) => ({
      reservations: [reservation, ...state.reservations],
    })),

  updateReservation: (id, data) =>
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, ...data } : r,
      ),
      upcomingReservations: state.upcomingReservations.map((r) =>
        r.id === id ? { ...r, ...data } : r,
      ),
    })),

  removeReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
      upcomingReservations: state.upcomingReservations.filter((r) => r.id !== id),
    })),
}));
