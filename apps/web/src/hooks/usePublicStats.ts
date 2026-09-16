import { useEffect, useState } from 'react'
import api from '@/services/api'
import { BASE_STATS } from '@/config/stats.config'

/**
 * 홈페이지 지표 — API 실측값을 받아 온다.
 *
 * 예전에는 stats.config.ts 의 하드코딩 값을 그대로 찍었다. 사람이 기억날
 * 때만 고치니 반드시 어긋난다 — 실제로 치험례를 8,579 건까지 모아 놓고
 * 홈페이지는 6,454 건이라고 적고 있었다.
 *
 * 첫 페인트는 BASE_STATS 로 그린다. 히어로 숫자가 빈칸이었다가 튀어나오면
 * 레이아웃이 흔들리고, 로딩 스피너를 넣기엔 숫자 네 개가 너무 작다.
 * API 가 답하면 조용히 갈아 끼운다. 실패하면 하드코딩 값 그대로 둔다 —
 * 지표 하나 때문에 랜딩이 깨지는 것이 더 나쁘다.
 */

export interface PublicStats {
  cases: number
  classicalCases: number
  formulas: number
  herbs: number
  references: number
  countedAt: string | null
}

const FALLBACK: PublicStats = {
  cases: BASE_STATS.cases,
  classicalCases: BASE_STATS.classicalCases,
  formulas: BASE_STATS.formulas,
  herbs: BASE_STATS.herbs,
  references: BASE_STATS.references,
  countedAt: null,
}

/** 탭을 옮겨 다닐 때마다 다시 부르지 않는다. 랜딩은 한 세션에 여러 번 열린다. */
let cached: PublicStats | null = null
let inflight: Promise<PublicStats> | null = null

async function fetchStats(): Promise<PublicStats> {
  if (cached) return cached
  if (inflight) return inflight

  inflight = api
    .get<Partial<PublicStats>>('/stats/public')
    .then(({ data }) => {
      // 서버가 테이블 하나를 못 세면 0 을 준다. 0 을 그대로 찍으면
      // "치험례 0건" 이 걸리므로, 값이 있는 것만 갈아 끼운다.
      const merged: PublicStats = {
        cases: data.cases || FALLBACK.cases,
        classicalCases: data.classicalCases || FALLBACK.classicalCases,
        formulas: data.formulas || FALLBACK.formulas,
        herbs: data.herbs || FALLBACK.herbs,
        references: data.references || FALLBACK.references,
        countedAt: data.countedAt ?? null,
      }
      cached = merged
      return merged
    })
    .catch(() => FALLBACK)
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function usePublicStats(): { stats: PublicStats; isLive: boolean } {
  const [stats, setStats] = useState<PublicStats>(cached ?? FALLBACK)

  useEffect(() => {
    let alive = true
    fetchStats().then((s) => {
      if (alive) setStats(s)
    })
    return () => {
      alive = false
    }
  }, [])

  return { stats, isLive: stats.countedAt !== null }
}
