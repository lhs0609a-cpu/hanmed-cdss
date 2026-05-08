import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

// ============== Types ==============

export type DurTypeName =
  | '병용금기'
  | '임부금기'
  | '특정연령대금기'
  | '노인주의'
  | '용량주의'
  | '투여기간주의'
  | '효능군중복'
  | '서방형분할주의'

export interface DurProductItem {
  TYPE_NAME?: string
  MIX_TYPE?: string
  INGR_CODE?: string
  INGR_KOR_NAME?: string
  INGR_ENG_NAME?: string
  INGR_NAME?: string
  ITEM_SEQ?: string
  ITEM_NAME?: string
  ENTP_NAME?: string
  FORM_NAME?: string
  ETC_OTC_CODE?: string
  CLASS_CODE?: string
  CLASS_NAME?: string
  PROHBT_CONTENT?: string
  REMARK?: string
  MIXTURE_INGR_CODE?: string
  MIXTURE_INGR_KOR_NAME?: string
  MIXTURE_INGR_ENG_NAME?: string
  MIXTURE_ITEM_SEQ?: string
  MIXTURE_ITEM_NAME?: string
}

export interface DurProductResponse {
  totalCount: number
  items: DurProductItem[]
  grouped: Record<string, DurProductItem[]>
  types: string[]
}

/** 품목 단위 DUR 통합 조회 (item_seq 또는 item_name) */
export function useMfdsDurProduct(args: {
  itemSeq?: string | null
  itemName?: string | null
  enabled?: boolean
}) {
  const { itemSeq, itemName, enabled = true } = args
  const key = itemSeq || itemName || null
  return useQuery({
    queryKey: ['mfds-dur-product', itemSeq, itemName],
    queryFn: async () => {
      if (!key) return null
      const params = new URLSearchParams()
      if (itemSeq) params.set('item_seq', itemSeq)
      if (itemName) params.set('item_name', itemName)
      params.set('limit', '50')
      const { data } = await api.get(`/mfds-dur/product?${params}`)
      return data.data as DurProductResponse
    },
    enabled: enabled && !!key,
    staleTime: 60 * 60 * 1000, // 백엔드 24h 캐시 + 프론트 1h
    retry: 1,
  })
}
