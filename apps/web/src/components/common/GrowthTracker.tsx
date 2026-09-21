import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  flushGrowth,
  growthAllowed,
  growthPage,
  isMarketingPage,
  trackGrowth,
} from '@/lib/growth'
import { startWebVitals } from '@/lib/vitals'

export function GrowthTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!growthAllowed() || !growthPage(pathname)) return
    let active = 0
    let last = performance.now()
    let scroll = 0
    let started = false
    let viewed = false
    let clickTime = 0
    let viewId = crypto.randomUUID()
    let hiddenAt = 0
    const update = () => {
      const now = performance.now()
      if (document.visibilityState === 'visible')
        active += Math.min(now - last, 15000)
      last = now
      const height = document.documentElement.scrollHeight
      scroll = Math.max(
        scroll,
        Math.min(100, ((window.scrollY + innerHeight) / height) * 100),
      )
    }
    const engagement = () => {
      if (!viewed) return
      update()
      trackGrowth(
        'page_engagement',
        { viewId, duration: Math.min(1800, Math.round(active / 1000)), scroll },
        pathname,
      )
      void flushGrowth()
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        active += Math.min(performance.now() - last, 15000)
        engagement()
      } else {
        last = performance.now()
        if (hiddenAt && Date.now() - hiddenAt > 1800000) {
          active = 0
          scroll = 0
          started = false
          viewId = crypto.randomUUID()
          trackGrowth('page_view', { viewId }, pathname)
        }
      }
    }
    const click = (e: MouseEvent) => {
      if (!isMarketingPage(pathname) || performance.now() - clickTime < 150)
        return
      const el = e.target instanceof Element ? e.target : null
      if (
        !el ||
        el.closest(
          'input, textarea, select, [contenteditable], [data-growth-private]',
        )
      )
        return
      clickTime = performance.now()
      const action = el.closest('[data-growth], a, button')
      let target =
        action?.getAttribute('data-growth') ||
        action?.tagName.toLowerCase() ||
        'surface'
      if (action instanceof HTMLAnchorElement && !action.hasAttribute('data-growth')) {
        const p = new URL(action.href).pathname
        if (isMarketingPage(p))
          target = `link:${p.replace(/\//g, '') || 'home'}`
      }
      trackGrowth('click', {
        target,
        x: (e.pageX / document.documentElement.scrollWidth) * 100,
        y: (e.pageY / document.documentElement.scrollHeight) * 100,
        width: innerWidth,
        height: document.documentElement.scrollHeight,
      })
    }
    const formStart = (event: FocusEvent) => {
      const field = event.target
      if (pathname === '/register' && !started && field instanceof Element && field.matches('input:not([type="submit"]):not([type="button"]), select, textarea')) {
        started = true
        trackGrowth('signup_start')
      }
    }
    const invalid = () => {
      if (pathname === '/register')
        trackGrowth('signup_error', { code: 'browser_validation' })
    }
    // 'runtime' 하나로 뭉뚱그리면 재현할 수 없다. 오류 이름은 알파벳만
    // 남겨 보내고, 다른 출처 스크립트가 가려 버린 오류는 따로 표시한다.
    const errorCode = (value: unknown, event?: ErrorEvent) => {
      if (value instanceof Error) {
        const name = value.name.replace(/[^a-zA-Z]/g, '').toLowerCase()
        return `runtime_${name || 'error'}`.slice(0, 80)
      }
      if (event && !event.filename) return 'runtime_crossorigin'
      return 'runtime'
    }
    const error = (event: ErrorEvent) => {
      trackGrowth('client_error', {
        code: errorCode(event.error, event),
        target: 'landing_20260916',
      })
    }
    const rejection = (event: PromiseRejectionEvent) =>
      trackGrowth('client_error', {
        code: `rejection_${errorCode(event.reason)}`.slice(0, 80),
        target: 'landing_20260916',
      })
    // Delay initial event so StrictMode's discarded effect cannot double-count views.
    const first = setTimeout(() => {
      viewed = true
      trackGrowth('page_view', { viewId })
      update()
      startWebVitals()
    }, 0)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') engagement()
    }, 15000)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', engagement)
    document.addEventListener('click', click, true)
    document.addEventListener('focusin', formStart)
    document.addEventListener('invalid', invalid, true)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('error', error)
    window.addEventListener('unhandledrejection', rejection)
    return () => {
      clearTimeout(first)
      clearInterval(interval)
      // Preserve the departed path: React cleanup runs after history has changed.
      engagement()
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', engagement)
      document.removeEventListener('click', click, true)
      document.removeEventListener('focusin', formStart)
      document.removeEventListener('invalid', invalid, true)
      window.removeEventListener('scroll', update)
      window.removeEventListener('error', error)
      window.removeEventListener('unhandledrejection', rejection)
    }
  }, [pathname])
  return null
}
