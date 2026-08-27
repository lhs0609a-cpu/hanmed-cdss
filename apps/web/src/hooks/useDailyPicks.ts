import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { DAILY_PICK_COUNT, daySeed, fullPages } from './useDailyCase'

/**
 * 매일 하나씩 펴 보는 카탈로그 항목 — 처방과 약재.
 *
 * 오늘의 치험례와 같은 원리다. 무작위가 아니라 날짜 시드라, 같은 날 몇 번을
 * 새로고침해도 같은 것이 나온다. "오늘의" 라는 말이 거짓이 되지 않아야 하고,
 * 방금 본 것을 다시 찾을 수 없으면 읽을 이유도 사라진다.
 *
 * 하루에 하나가 아니라 다섯을 준다. 치험례 카드와 같은 이유다 — 첫 화면에
 * 머무는 몇 초 동안 하나만 보는 것과 다섯이 스치는 것은 "여기 쌓여 있다" 는
 * 인상에서 차이가 크다. 카드가 그 자리에서 돌린다.
 *
 * 창(window)을 넉넉히 받아 **읽을 내용이 있는 것만** 걸러 다섯을 채운다.
 * 카탈로그가 고르게 채워져 있지 않기 때문이다 —
 *   · 약재 636종 중 성미·귀경·효능 중 하나라도 있는 것은 253종(40%)
 *   · 처방 404종 중 약재 구성이 있는 것은 344종, 주치가 있는 것은 41종뿐
 * 거르지 않으면 이름만 있는 빈 카드가 절반 이상의 날에 뜬다. 첫 화면에
 * 빈 카드가 뜨는 것은 카드가 없는 것보다 나쁘다. 창을 30칸으로 잡은 것도
 * 그래서다 — 약재는 40%만 쓸 만해서 12칸으로는 다섯이 안 찬다(기댓값 4.8건).
 *
 * 창 안에 쓸 만한 것이 하나도 없으면 빈 배열을 주고 카드는 숨는다.
 *
 * 사용자 데이터에 전혀 의존하지 않는다 — 가입 첫날에도 비지 않는 것이 요점이다.
 */

const WINDOW = 30

export interface DailyFormulaHerb {
  id?: string
  name: string
  hanja?: string | null
  /** 고전 표기 용량(二錢半, 各一錢半). 한의사가 보는 화면이라 그대로 쓴다. */
  amount?: string | null
}

export interface DailyFormula {
  id: string
  name: string
  hanja: string | null
  category: string | null
  /** 출전 — 方藥合編 같은 원전 */
  source: string | null
  /** 주치. 카탈로그 404종 중 41종에만 있다. */
  indication: string | null
  herbs: DailyFormulaHerb[]
}

export interface DailyHerb {
  id: string
  standardName: string
  hanjaName: string | null
  category: string | null
  properties: {
    nature?: string | null
    taste?: string[] | string | null
    toxicity?: string | null
  } | null
  meridianTropism: string[] | null
  efficacy: string | null
}

function useDailyPickList<T>(
  key: string,
  path: string,
  total: number | null | undefined,
  isUsable: (row: T) => boolean,
) {
  const seed = daySeed()
  const usable = typeof total === 'number' && total > 0

  return useQuery({
    queryKey: [key, seed, total],
    enabled: usable,
    queryFn: async (): Promise<T[]> => {
      const pages = fullPages(total as number, WINDOW)
      const page = (seed % pages) + 1
      const { data } = await api.get(`${path}?page=${page}&limit=${WINDOW}`)
      const rows: T[] = Array.isArray(data?.data) ? data.data : []
      return rows.filter(isUsable).slice(0, DAILY_PICK_COUNT)
    },
    // 자정에 바뀌므로 한 시간 캐시로 충분하다.
    staleTime: 60 * 60_000,
    retry: 1,
  })
}

const hasText = (v: unknown): boolean => {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  return true
}

/** 약재 구성이 있어야 처방 카드로 읽을 것이 생긴다. */
export function useDailyFormulas(total: number | null | undefined) {
  return useDailyPickList<DailyFormula>(
    'daily-formulas',
    '/formulas',
    total,
    (f) => Boolean(f?.name?.trim()) && (f.herbs ?? []).some((h) => h?.name?.trim()),
  )
}

/** 성미·귀경·효능 중 하나라도 있어야 약재 카드가 이름만 남지 않는다. */
export function useDailyHerbs(total: number | null | undefined) {
  return useDailyPickList<DailyHerb>(
    'daily-herbs',
    '/herbs',
    total,
    (h) =>
      Boolean(h?.standardName?.trim()) &&
      (hasText(h.efficacy) || hasText(h.properties) || hasText(h.meridianTropism)),
  )
}
