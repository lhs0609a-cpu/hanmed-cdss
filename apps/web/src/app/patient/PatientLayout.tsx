import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

/**
 * 환자용 PWA 레이아웃 — /patient 스코프 전용.
 *
 * - Service Worker (/patient-sw.js) 등록
 * - 한의사 앱과 시각적으로 분리된 톤(밝고 단순한 UI)
 * - 모바일 first
 *
 * 한의사용 앱 (/dashboard) 과 라우트가 분리되어 있고,
 * service worker 도 별도 스코프이므로 양쪽이 독립적으로 동작한다.
 */
export default function PatientLayout() {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/patient-sw.js', { scope: '/patient' })
        .catch(() => {
          // SW 등록 실패는 무시 — 앱은 그대로 동작
        })
    }
  }, [])

  // 환자 앱은 manifest 도 별도로 사용
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (link) link.href = '/patient-manifest.webmanifest'
    return () => {
      if (link) link.href = '/manifest.webmanifest'
    }
  }, [])

  return (
    <div
      className="min-h-screen bg-white text-gray-900 flex flex-col"
      data-route={location.pathname}
    >
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
