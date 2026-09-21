import { flushGrowth, trackGrowth } from './growth'

/**
 * Core Web Vitals 수집.
 *
 * growth 이벤트에 `web_vital` 타입과 관리자 화면의 LCP/CLS/INP 패널이 이미
 * 있었지만 값을 보내는 쪽이 없어 늘 비어 있었다. 방문의 77% 가 모바일인데
 * 로딩 성능을 한 번도 재지 못한 상태였다.
 *
 * 외부 라이브러리를 쓰지 않는다. 랜딩은 광고로 들어오는 첫 화면이라
 * 계측 스크립트가 바로 그 지표를 깎으면 안 된다.
 */

interface ShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}
interface InteractionEntry extends PerformanceEntry {
  interactionId?: number
}

let started = false

function observe(
  type: string,
  callback: (entries: PerformanceEntry[]) => void,
  extra: Record<string, unknown> = {},
) {
  try {
    const observer = new PerformanceObserver((list) =>
      callback(list.getEntries()),
    )
    // durationThreshold 는 표준 PerformanceObserverInit 타입에 없지만
    // 브라우저는 받는다. 지원하지 않으면 observe 가 던지고 조용히 빠진다.
    const options: PerformanceObserverInit & Record<string, unknown> = {
      type,
      buffered: true,
      ...extra,
    }
    observer.observe(options)
    return observer
  } catch {
    // 브라우저가 해당 지표를 지원하지 않으면 그 지표만 조용히 빠진다.
    return null
  }
}

export function startWebVitals() {
  if (started || typeof PerformanceObserver === 'undefined') return
  started = true

  let lcp = 0
  observe('largest-contentful-paint', (entries) => {
    const last = entries[entries.length - 1]
    if (last) lcp = last.startTime
  })

  // CLS 는 합계가 아니라 세션 창의 최댓값이다. 1초 이상 끊기거나 5초를
  // 넘으면 새 창으로 친다 — web-vitals 가 쓰는 정의와 같다.
  let cls = 0
  let windowValue = 0
  let windowStart = 0
  let windowLast = 0
  observe('layout-shift', (entries) => {
    for (const entry of entries as ShiftEntry[]) {
      if (entry.hadRecentInput) continue
      if (
        windowValue &&
        (entry.startTime - windowLast > 1000 ||
          entry.startTime - windowStart > 5000)
      ) {
        windowValue = 0
      }
      if (!windowValue) windowStart = entry.startTime
      windowLast = entry.startTime
      windowValue += entry.value
      cls = Math.max(cls, windowValue)
    }
  })

  // INP 근사: 관측된 상호작용 중 가장 느린 것. 정확한 백분위수는 표본이
  // 많아야 의미가 있는데, 지금 필요한 건 "느린 화면이 어디냐" 다.
  let inp = 0
  observe(
    'event',
    (entries) => {
      for (const entry of entries as InteractionEntry[]) {
        if (entry.interactionId) inp = Math.max(inp, entry.duration)
      }
    },
    { durationThreshold: 40 },
  )

  let reported = false
  const report = () => {
    if (reported) return
    reported = true
    // 서버는 0~60000 만 받는다. CLS 는 비율이라 그대로 보낸다.
    if (lcp > 0) trackGrowth('web_vital', { metric: 'LCP', value: Math.min(60000, Math.round(lcp)) })
    if (cls > 0) trackGrowth('web_vital', { metric: 'CLS', value: Math.round(cls * 100) / 100 })
    if (inp > 0) trackGrowth('web_vital', { metric: 'INP', value: Math.min(60000, Math.round(inp)) })
    void flushGrowth()
  }

  // 탭을 닫을 때가 마지막 기회다. pagehide 만 믿으면 모바일에서 놓친다.
  addEventListener('pagehide', report)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') report()
  })
}
