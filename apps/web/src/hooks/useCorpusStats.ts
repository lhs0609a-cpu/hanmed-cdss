import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

/**
 * 코퍼스 규모 — 대시보드 첫 화면에서 "이 판단을 받치는 근거가 얼마나 있는가" 를 대는 숫자.
 *
 * 왜 첫 화면에 있어야 하나 —
 * 대시보드의 다른 카드(경과 확인·환자 리포트·이탈 환자·최근 진료)는 전부 사용자
 * 데이터에 의존해서, 신규 한의사에게는 넷이 동시에 빈다. 가입 직후가 제품이 가장
 * 초라해 보이는 순간인데 하필 그때가 "쓸만한가" 를 판단하는 순간이다.
 * 코퍼스는 사용자 데이터가 비어도 절대 비지 않는 유일한 자산이라 그 구멍을 메운다.
 *
 * 숫자는 전부 서버에서 실제로 세어 온다. 예전에 하드코딩 통계로 한 번 데였으므로
 * 여기에 상수를 박지 않는다 — 세지 못하면 그 항목만 숨긴다(null).
 *
 * 목록 엔드포인트는 limit=1 로 meta.total 만 받는다. 서버가 캐시하고 있어 비용이 거의 없다.
 */

export interface CorpusStats {
  cases: number | null
  formulas: number | null
  herbs: number | null
}

interface StatisticsResponse {
  total?: number
}

/** 목록 엔드포인트에서 meta.total 만 뽑는다. 실패하면 null — 그 칸만 안 그린다. */
async function totalOf(path: string): Promise<number | null> {
  try {
    const { data } = await api.get(`${path}?page=1&limit=1`)
    const total = data?.meta?.total
    return typeof total === 'number' ? total : null
  } catch {
    return null
  }
}

async function fetchCorpusStats(): Promise<CorpusStats> {
  // 각각 독립적으로 실패시킨다. 하나가 죽어도 나머지는 그려야 하므로
  // Promise.all 안에서 각자 catch 한다.
  const [casesTotal, formulas, herbs, stats] = await Promise.all([
    totalOf('/cases'),
    totalOf('/formulas'),
    totalOf('/herbs'),
    api
      .get<StatisticsResponse>('/cases/statistics')
      .then((r) => r.data)
      .catch(() => null),
  ])

  return {
    // /cases/statistics 쪽이 캐시된 정확한 count 라 우선. 실패 시 목록 meta 로 폴백.
    cases: typeof stats?.total === 'number' ? stats.total : casesTotal,
    formulas,
    herbs,
  }
}

export function useCorpusStats() {
  return useQuery({
    queryKey: ['corpus-stats'],
    queryFn: fetchCorpusStats,
    // 코퍼스는 시딩할 때나 바뀐다. 자주 물어볼 이유가 없다.
    staleTime: 30 * 60_000,
    retry: 1,
  })
}
