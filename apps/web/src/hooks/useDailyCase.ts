import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

/**
 * 오늘의 치험례 — 매일 몇 건씩, 코퍼스에서 날짜로 뽑는다.
 *
 * 왜 —
 * 한의사가 다른 데서 못 구하는 것이 남의 실제 진료 기록이다. 이미 수천 건을
 * 갖고 있으면서 첫 화면에서는 링크로만 안내하고 있었다. 매일 바뀌는 사례를
 * 그냥 펼쳐 두면 무료로 줄 수 있는 가장 강한 훅이 되고, 다시 열 이유가 된다.
 *
 * 한 건이 아니라 한 묶음을 준다. 카드가 그 자리에서 돌아가며 보여주기 때문이다 —
 * 첫 화면에 머무는 몇 초 동안 한 건만 보고 나가는 것과 다섯 건을 스치는 것은
 * "여기 사례가 쌓여 있다" 는 인상에서 차이가 크다.
 *
 * 무작위가 아니라 날짜 시드다. 같은 날 몇 번을 새로고침해도 같은 묶음이 나와야
 * "오늘의" 라는 말이 거짓이 안 된다. 자정에 바뀐다.
 *
 * Math.random() 을 쓰지 않는 또 다른 이유 — 새로고침마다 바뀌면 방금 본 사례를
 * 다시 찾을 수 없다.
 */

export interface DailyCase {
  id: string
  title: string
  chiefComplaint: string
  symptoms: string[]
  formulaName: string
  formulaHanja: string
  constitution: string
  diagnosis: string
  patientAge: number | null
  patientGender: string | null
  outcome: string | null
  summaryOneLine: string | null
  distinctive: string | null
  keyFindings: string[]
}

/** 한 번에 받아 오는 창. 읽을 내용 없는 건을 걸러내고도 5건이 남을 만큼 넉넉히. */
const WINDOW = 10

/** 카드 하나가 하루에 돌리는 건수. 치험례·처방·약재가 같은 수로 돈다. */
export const DAILY_PICK_COUNT = 5

/**
 * 창을 꽉 채우는 페이지 수.
 *
 * ceil 로 나누면 마지막 페이지가 몇 건만 남은 자투리가 되고, 하필 그 페이지가
 * 걸린 날은 걸러낸 뒤 한두 건밖에 안 남아 카드가 초라해진다. 자투리를 버리고
 * 꽉 찬 창에서만 뽑는다 — 못 보게 되는 건 마지막 WINDOW 미만의 몇 건뿐이다.
 */
export function fullPages(total: number, window: number): number {
  return Math.max(1, Math.floor(total / window))
}

/** YYYYMMDD 를 정수로. 로컬 자정 기준으로 하루 한 번 바뀐다. */
export function daySeed(d: Date = new Date()): number {
  return (
    d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  )
}

/** 제목도 본문도 없는 건은 카드에서 빈 칸으로 보인다 — 돌릴 대상에서 뺀다. */
function readable(c: DailyCase): boolean {
  return Boolean(
    (c.summaryOneLine || c.title || c.chiefComplaint || '').trim(),
  )
}

/**
 * total 이 정해진 뒤에만 돈다 — 몇 건 중에서 뽑을지 알아야 페이지를 정할 수 있다.
 * 목록은 createdAt DESC 로 정렬이 고정돼 있어 page N 은 매번 같은 묶음을 준다.
 */
export function useDailyCases(total: number | null | undefined) {
  const seed = daySeed()
  const usable = typeof total === 'number' && total > 0

  return useQuery({
    queryKey: ['daily-cases', seed, total],
    enabled: usable,
    queryFn: async (): Promise<DailyCase[]> => {
      const pages = fullPages(total as number, WINDOW)
      const page = (seed % pages) + 1
      const { data } = await api.get(`/cases?page=${page}&limit=${WINDOW}`)
      const rows: DailyCase[] = Array.isArray(data?.data) ? data.data : []
      return rows.filter(readable).slice(0, DAILY_PICK_COUNT)
    },
    staleTime: 60 * 60_000,
    retry: 1,
  })
}
