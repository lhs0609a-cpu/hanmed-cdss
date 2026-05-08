import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

// ============== Types ==============

export interface MfdsListItem {
  ITEM_SEQ: string
  ITEM_NAME: string
  ITEM_ENG_NAME?: string | null
  ENTP_NAME: string
  ENTP_ENG_NAME?: string | null
  ITEM_PERMIT_DATE?: string
  SPCLTY_PBLC?: string         // 일반의약품/전문의약품
  PRDUCT_TYPE?: string         // 분류
  PRDUCT_PRMISN_NO?: string    // 허가번호
  ITEM_INGR_NAME?: string      // 주성분
  ITEM_INGR_CNT?: string
  PERMIT_KIND_CODE?: string    // 신고/허가
  CANCEL_DATE?: string | null
  CANCEL_NAME?: string         // 정상/취소
}

export interface MfdsDetailItem {
  ITEM_SEQ: string
  ITEM_NAME: string
  ENTP_NAME: string
  ITEM_PERMIT_DATE?: string
  CHART?: string
  MATERIAL_NAME?: string
  STORAGE_METHOD?: string
  VALID_TERM?: string
  PACK_UNIT?: string
  EE_DOC_DATA?: string  // 효능효과 XML
  UD_DOC_DATA?: string  // 용법용량 XML
  NB_DOC_DATA?: string  // 사용상의 주의사항 XML
  MAIN_ITEM_INGR?: string
  INGR_NAME?: string
  ATC_CODE?: string
  ITEM_ENG_NAME?: string
  RARE_DRUG_YN?: string
}

export interface MfdsSearchResponse {
  totalCount: number
  pageNo: number
  numOfRows: number
  items: MfdsListItem[]
}

export interface MfdsDetailResponse {
  totalCount: number
  pageNo: number
  numOfRows: number
  items: MfdsDetailItem[]
}

// ============== Hooks ==============

/** 제품명/주성분/제조사로 식약처 의약품 검색 */
export function useMfdsDrugSearch(itemName: string | null, options?: { limit?: number }) {
  return useQuery({
    queryKey: ['mfds-drug-search', itemName, options?.limit ?? 20],
    queryFn: async () => {
      if (!itemName?.trim()) return null
      const params = new URLSearchParams()
      params.set('item_name', itemName)
      params.set('limit', String(options?.limit ?? 20))
      const { data } = await api.get(`/mfds-drug/search?${params}`)
      return data.data as MfdsSearchResponse
    },
    enabled: !!itemName?.trim(),
    staleTime: 60 * 60 * 1000, // 1시간 캐시 (백엔드도 24h 캐시)
    retry: 1,
  })
}

/** 제품명으로 식약처 상세 정보 (효능/용법/주의) */
export function useMfdsDrugDetail(itemName: string | null, options?: { limit?: number }) {
  return useQuery({
    queryKey: ['mfds-drug-detail', itemName, options?.limit ?? 5],
    queryFn: async () => {
      if (!itemName?.trim()) return null
      const params = new URLSearchParams()
      params.set('item_name', itemName)
      params.set('limit', String(options?.limit ?? 5))
      const { data } = await api.get(`/mfds-drug/detail?${params}`)
      return data.data as MfdsDetailResponse
    },
    enabled: !!itemName?.trim(),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })
}

/** ITEM_SEQ로 직접 상세 정보 */
export function useMfdsDrugDetailBySeq(itemSeq: string | null) {
  return useQuery({
    queryKey: ['mfds-drug-detail-seq', itemSeq],
    queryFn: async () => {
      if (!itemSeq) return null
      const { data } = await api.get(`/mfds-drug/detail?item_seq=${itemSeq}`)
      return data.data as MfdsDetailResponse
    },
    enabled: !!itemSeq,
    staleTime: 60 * 60 * 1000,
  })
}

// ============== XML 파싱 헬퍼 ==============

/**
 * 식약처 EE/UD/NB XML 텍스트에서 PARAGRAPH 본문만 추출 (CDATA 포함)
 * 입력 예: <DOC><SECTION><ARTICLE title="..."><PARAGRAPH>...</PARAGRAPH></ARTICLE></SECTION></DOC>
 */
export function parseMfdsDocXml(xml: string | undefined | null): Array<{
  articleTitle: string
  paragraphs: string[]
}> {
  if (!xml) return []

  const articles: Array<{ articleTitle: string; paragraphs: string[] }> = []
  const articleRegex = /<ARTICLE\s+title="([^"]*)"[^>]*>([\s\S]*?)<\/ARTICLE>/g
  let match: RegExpExecArray | null

  while ((match = articleRegex.exec(xml)) !== null) {
    const articleTitle = match[1] || ''
    const articleBody = match[2] || ''

    const paragraphs: string[] = []
    const paraRegex = /<PARAGRAPH[^>]*>([\s\S]*?)<\/PARAGRAPH>/g
    let pMatch: RegExpExecArray | null
    while ((pMatch = paraRegex.exec(articleBody)) !== null) {
      let text = pMatch[1] || ''
      // CDATA 제거
      text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      // HTML 엔티티 디코딩
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
      // 공백 정리
      text = text.trim()
      if (text) paragraphs.push(text)
    }

    if (paragraphs.length > 0) {
      articles.push({ articleTitle, paragraphs })
    }
  }

  // ARTICLE이 하나도 없을 때는 PARAGRAPH만 직접 추출
  if (articles.length === 0) {
    const paragraphs: string[] = []
    const paraRegex = /<PARAGRAPH[^>]*>([\s\S]*?)<\/PARAGRAPH>/g
    let pMatch: RegExpExecArray | null
    while ((pMatch = paraRegex.exec(xml)) !== null) {
      let text = pMatch[1] || ''
      text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
      if (text) paragraphs.push(text)
    }
    if (paragraphs.length > 0) {
      articles.push({ articleTitle: '', paragraphs })
    }
  }

  return articles
}

/**
 * MATERIAL_NAME 문자열을 파싱 (예: "총량:1회4그램|성분명:반하사심탕 연조엑스|분량:1517|단위:밀리그램|...")
 */
export function parseMaterialName(material: string | undefined | null): Array<{
  totalAmount?: string
  ingredient?: string
  amount?: string
  unit?: string
  spec?: string
}> {
  if (!material) return []
  const groups = material.split(';').map((s) => s.trim()).filter(Boolean)
  return groups.map((g) => {
    const fields: Record<string, string> = {}
    g.split('|').forEach((kv) => {
      const [k, v] = kv.split(':').map((s) => s.trim())
      if (k && v !== undefined) fields[k] = v
    })
    return {
      totalAmount: fields['총량'],
      ingredient: fields['성분명'],
      amount: fields['분량'],
      unit: fields['단위'],
      spec: fields['규격'],
    }
  })
}
