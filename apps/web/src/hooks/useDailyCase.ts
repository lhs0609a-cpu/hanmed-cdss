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
  /** 감별 포인트 앞부분만 — 전문은 GET /cases/:id/full 로만 나간다 */
  distinctivePreview: string | null
  keyFindings: string[]
}

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
 * 서버 전용 엔드포인트를 쓴다 — 목록 페이지네이션으로 뽑지 않는다.
 *
 * 목록(`/cases`)은 무료 회원에게 앞 3페이지까지만 열려 있다. 예전처럼 page N 을
 * 계산해서 부르면 무료 회원 대시보드에서 402 가 떨어지고 카드가 통째로 사라진다.
 * 반대로 뽑는 범위를 앞 60건으로 좁히면 매일 같은 사례가 돌아 "이게 다인가" 가
 * 된다 — 첫 화면에서 그 인상은 치명적이다.
 *
 * 그래서 서버가 날짜 시드로 코퍼스 전체에서 뽑아 주는 `/cases/daily` 를 쓴다.
 * 시드를 서버가 만들기 때문에 이걸로 전량을 긁을 수는 없다.
 */
export function useDailyCases() {
  const seed = daySeed()

  return useQuery({
    queryKey: ['daily-cases', seed],
    queryFn: async (): Promise<DailyCase[]> => {
      const { data } = await api.get(`/cases/daily?count=${DAILY_PICK_COUNT}`)
      const rows: DailyCase[] = Array.isArray(data?.data) ? data.data : []
      return rows.filter(readable)
    },
    staleTime: 60 * 60_000,
    retry: 1,
  })
}
