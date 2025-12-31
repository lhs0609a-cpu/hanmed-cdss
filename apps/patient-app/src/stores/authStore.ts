import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { PatientAccount } from '../types';

const PATIENT_KEY = 'hanmed_patient';

interface AuthState {
  patient: PatientAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setPatient: (patient: PatientAccount) => void;
  updatePatient: (data: Partial<PatientAccount>) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  patient: null,
  isAuthenticated: false,
  isLoading: true,

  setPatient: async (patient: PatientAccount) => {
    await SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(patient));
    set({ patient, isAuthenticated: true, isLoading: false });
  },

  updatePatient: async (data: Partial<PatientAccount>) => {
    const current = get().patient;
    if (current) {
      const updated = { ...current, ...data };
      await SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(updated));
      set({ patient: updated });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(PATIENT_KEY);
    set({ patient: null, isAuthenticated: false, isLoading: false });
  },

  loadStoredAuth: async () => {
    try {
      const stored = await SecureStore.getItemAsync(PATIENT_KEY);
      if (stored) {
        const patient = JSON.parse(stored) as PatientAccount;
        set({ patient, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
