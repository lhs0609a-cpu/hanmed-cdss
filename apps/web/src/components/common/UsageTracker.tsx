import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useFeatureTracking } from '@/hooks/useFeatureTracking'

/**
 * 화면 이동을 기록한다.
 *
 * useFeatureTracking 훅은 진작 있었는데 어디에서도 부르지 않았다. 이벤트
 * 표(analytics_events)가 0행이었던 첫 번째 이유다. 그래서 DAU·리텐션·기능별
 * 사용량을 물으면 아무도 답할 수 없었다.
 *
 * 여기서는 페이지 뷰만 남긴다. 클릭 하나하나를 담으면 표가 금세 수백만 행이
 * 되는데, 지금 필요한 질문은 "누가 며칠에 왔나" 와 "어느 화면을 쓰나" 다.
 * 그 둘은 페이지 뷰로 답이 된다.
 *
 * 창을 닫을 때 버퍼를 비운다. 그러지 않으면 5건이 모이기 전에 닫은 세션은
 * 통째로 사라진다 — 처음 한 번 보고 떠난 사람이 정확히 그런 경우다.
 */
export function UsageTracker() {
  const location = useLocation()
  const { trackPageView, flushBuffer } = useFeatureTracking()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (lastPath.current === location.pathname) return
    lastPath.current = location.pathname
    trackPageView()
  }, [location.pathname, trackPageView])

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flushBuffer()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [flushBuffer])

  return null
}

export default UsageTracker
