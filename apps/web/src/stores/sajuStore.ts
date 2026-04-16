import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SajuTier = 'mini' | 'standard' | 'premium'

export interface SajuInputData {
  name: string
  birthDate: string
  birthHour?: number
  gender?: string
  tier: SajuTier
  email?: string
}

export interface SajuOrderInfo {
  orderId: string
  orderName: string
  amount: number
  clientKey: string
  reportId: string
  purchaseId: string
}

export type SajuReportStatus =
  | 'pending_payment'
  | 'generating'
  | 'completed'
  | 'failed'

export interface SajuReportInfo {
  id: string
  status: SajuReportStatus
  completedSections: number
  totalSections: number
  accessToken: string
  tier: SajuTier
  name: string
  // 확장 필드 (결제 직후에는 빈 값, 이후 리포트 조회로 채워짐)
  birthDate?: string
  birthHour?: number | null
  gender?: string | null
  constitution?: string
  dominantElement?: string
  weakElement?: string
}

interface SajuState {
  // 입력 데이터
  inputData: SajuInputData | null
  setInputData: (data: SajuInputData) => void

  // 주문 정보
  orderInfo: SajuOrderInfo | null
  setOrderInfo: (info: SajuOrderInfo) => void

  // 리포트 정보
  currentReport: SajuReportInfo | null
  setCurrentReport: (report: SajuReportInfo | null) => void

  // 초기화
  reset: () => void
}

export const useSajuStore = create<SajuState>()(
  persist(
    (set) => ({
      inputData: null,
      setInputData: (data) => set({ inputData: data }),

      orderInfo: null,
      setOrderInfo: (info) => set({ orderInfo: info }),

      currentReport: null,
      setCurrentReport: (report) => set({ currentReport: report }),

      reset: () =>
        set({
          inputData: null,
          orderInfo: null,
          currentReport: null,
        }),
    }),
    {
      name: 'saju-storage',
      partialize: (state) => ({
        inputData: state.inputData,
        orderInfo: state.orderInfo,
        currentReport: state.currentReport,
      }),
    },
  ),
)
