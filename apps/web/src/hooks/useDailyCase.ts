import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

/**
 * 오늘의 치험례 — 매일 한 건씩, 코퍼스에서 날짜로 뽑는다.
 *
 * 왜 —
 * 한의사가 다른 데서 못 구하는 것이 남의 실제 진료 기록이다. 이미 수천 건을
 * 갖고 있으면서 첫 화면에서는 링크로만 안내하고 있었다. 매일 바뀌는 한 건을
 * 그냥 펼쳐 두면 무료로 줄 수 있는 가장 강한 훅이 되고, 다시 열 이유가 된다.
 *
 * 무작위가 아니라 날짜 시드다. 같은 날 몇 번을 새로고침해도 같은 사례가 나와야
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

/** YYYYMMDD 를 정수로. 로컬 자정 기준으로 하루 한 번 바뀐다. */
export function daySeed(d: Date = new Date()): number {
  return (
    d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  )
}

/**
 * total 이 정해진 뒤에만 돈다 — 몇 건 중에서 뽑을지 알아야 페이지를 정할 수 있다.
 * 목록은 createdAt DESC 로 정렬이 고정돼 있어 page N 은 매번 같은 사례를 준다.
 */
export function useDailyCase(total: number | null | undefined) {
  const seed = daySeed()
  const usable = typeof total === 'number' && total > 0

  return useQuery({
    queryKey: ['daily-case', seed, total],
    enabled: usable,
    queryFn: async (): Promise<DailyCase | null> => {
      const page = (seed % (total as number)) + 1
      const { data } = await api.get(`/cases?page=${page}&limit=1`)
      const row = Array.isArray(data?.data) ? data.data[0] : null
      return (row as DailyCase) ?? null
    },
    staleTime: 60 * 60_000,
    retry: 1,
  })
}
