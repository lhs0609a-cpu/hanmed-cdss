import { create } from 'zustand';
import type { Clinic, Practitioner, AvailabilityResponse } from '../types';

interface ClinicState {
  // 검색 결과
  searchResults: Clinic[];
  searchMeta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  isSearching: boolean;

  // 선택된 한의원
  selectedClinic: Clinic | null;
  practitioners: Practitioner[];
  availability: AvailabilityResponse | null;

  // 내 한의원
  myClinics: Clinic[];

  // Actions
  setSearchResults: (clinics: Clinic[], meta: any) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSelectedClinic: (clinic: Clinic | null) => void;
  setPractitioners: (practitioners: Practitioner[]) => void;
  setAvailability: (availability: AvailabilityResponse | null) => void;
  setMyClinics: (clinics: Clinic[]) => void;
  clearSearch: () => void;
}

export const useClinicStore = create<ClinicState>((set) => ({
  searchResults: [],
  searchMeta: null,
  isSearching: false,
  selectedClinic: null,
  practitioners: [],
  availability: null,
  myClinics: [],

  setSearchResults: (clinics, meta) =>
    set({ searchResults: clinics, searchMeta: meta }),

  setIsSearching: (isSearching) => set({ isSearching }),

  setSelectedClinic: (clinic) => set({ selectedClinic: clinic }),

  setPractitioners: (practitioners) => set({ practitioners }),

  setAvailability: (availability) => set({ availability }),

  setMyClinics: (clinics) => set({ myClinics: clinics }),

  clearSearch: () =>
    set({ searchResults: [], searchMeta: null, isSearching: false }),
}));
