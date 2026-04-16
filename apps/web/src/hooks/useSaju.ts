import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useSajuStore, SajuTier } from '@/stores/sajuStore'
import { getSajuProduct } from '@/lib/saju-products'

interface SajuProduct {
  tier: SajuTier
  name: string
  price: number
  sectionCount: number
  features: string[]
  badge?: string | null
}

interface ProductsResponse {
  products: SajuProduct[]
}

interface CreateOrderResponse {
  orderId: string
  orderName: string
  amount: number
  clientKey: string
  reportId: string
  purchaseId: string
}

interface ConfirmPaymentResponse {
  success: boolean
  message: string
  reportId?: string
  accessToken?: string
}

interface ReportResponse {
  report: {
    id: string
    status: 'pending_payment' | 'generating' | 'completed' | 'failed'
    completedSections: number
    totalSections: number
    accessToken: string
    tier: SajuTier
    name: string
    birthDate: string
    birthHour: number | null
    gender: string | null
    sajuData: any
    elementBalance: Record<string, number>
    constitution: string
    dominantElement: string
    weakElement: string
    pdfUrl: string | null
    createdAt: string
  }
  sections: {
    id: string
    sectionType: string
    sectionOrder: number
    title: string
    content: string
    imageUrl: string | null
    isCompleted: boolean
  }[]
}

// 상품 목록 조회
export function useSajuProducts() {
  return useQuery({
    queryKey: ['saju-products'],
    queryFn: async () => {
      const { data } = await api.get<ProductsResponse>('/saju/products')
      return data.products
    },
    staleTime: 1000 * 60 * 60, // 1시간
  })
}

// 주문 생성
export function useCreateSajuOrder() {
  const setOrderInfo = useSajuStore((s) => s.setOrderInfo)

  return useMutation({
    mutationFn: async (params: {
      name: string
      birthDate: string
      birthHour?: number
      gender?: string
      tier: SajuTier
      email?: string
      userId?: string
    }) => {
      const { data } = await api.post<CreateOrderResponse>('/saju/order', params)
      return data
    },
    onSuccess: (data) => {
      setOrderInfo(data)
    },
  })
}

// 결제 승인
export function useConfirmSajuPayment() {
  const setCurrentReport = useSajuStore((s) => s.setCurrentReport)
  const inputData = useSajuStore((s) => s.inputData)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      paymentKey: string
      orderId: string
      amount: number
    }) => {
      const { data } = await api.post<ConfirmPaymentResponse>('/saju/confirm', params)
      return data
    },
    onSuccess: (data) => {
      if (data.reportId) {
        const tier = inputData?.tier ?? 'standard'
        const product = getSajuProduct(tier)
        setCurrentReport({
          id: data.reportId,
          status: 'generating',
          completedSections: 0,
          totalSections: product?.sectionCount ?? 0,
          accessToken: data.accessToken || '',
          tier,
          name: inputData?.name ?? '',
          birthDate: inputData?.birthDate,
          birthHour: inputData?.birthHour,
          gender: inputData?.gender,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['saju-reports'] })
    },
  })
}

// 리포트 조회
export function useSajuReport(reportId: string | undefined, token?: string) {
  return useQuery({
    queryKey: ['saju-report', reportId, token],
    queryFn: async () => {
      if (!reportId) return null
      const params = token ? `?token=${token}` : ''
      const { data } = await api.get<ReportResponse>(
        `/saju/reports/${reportId}${params}`,
      )
      return data
    },
    enabled: !!reportId,
    refetchInterval: (query) => {
      const status = query.state.data?.report?.status
      // 생성 중일 때 5초마다 폴링
      if (status === 'generating') return 5000
      return false
    },
  })
}

// 공유 링크로 조회
export function useSajuReportByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['saju-report-token', token],
    queryFn: async () => {
      if (!token) return null
      const { data } = await api.get<ReportResponse>(
        `/saju/reports/access/${token}`,
      )
      return data
    },
    enabled: !!token,
    refetchInterval: (query) => {
      const status = query.state.data?.report?.status
      if (status === 'generating') return 5000
      return false
    },
  })
}

// 내 리포트 목록
export function useMyReports() {
  return useQuery({
    queryKey: ['saju-reports', 'my'],
    queryFn: async () => {
      const { data } = await api.get<{ reports: ReportResponse['report'][] }>(
        '/saju/reports/my',
      )
      return data.reports
    },
  })
}

// PDF 생성
export function useGeneratePdf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      reportId,
      token,
    }: {
      reportId: string
      token: string
    }) => {
      const { data } = await api.post<{ url: string }>(
        `/saju/reports/${reportId}/pdf?token=${encodeURIComponent(token)}`,
      )
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['saju-report', vars.reportId] })
    },
  })
}

// Toss 클라이언트키 조회
export function useTossClientKey() {
  return useQuery({
    queryKey: ['saju-toss-client-key'],
    queryFn: async () => {
      const { data } = await api.get<{ clientKey: string }>('/saju/client-key')
      return data.clientKey
    },
    staleTime: Infinity,
  })
}
