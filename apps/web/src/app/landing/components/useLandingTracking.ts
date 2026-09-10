import { useCallback, useEffect, useRef } from 'react'

type LandingProperties = Record<string, string | number | boolean>
type AnalyticsWindow = Window & {
  gtag?: (command: 'event', name: string, parameters: LandingProperties) => void
}

/** Public marketing events never use the authenticated clinical analytics API. */
function emit(name: string, properties: LandingProperties = {}) {
  if (navigator.doNotTrack === '1') return
  const detail = {
    name,
    properties: { surface: 'landing', ...properties },
    timestamp: new Date().toISOString(),
  }
  // An existing GA installation can consume these directly. This does not install trackers.
  try {
    const analyticsWindow = window as AnalyticsWindow
    analyticsWindow.gtag?.('event', name, detail.properties)
  } catch {
    /* Analytics must not interrupt navigation. */
  }
  window.dispatchEvent(new CustomEvent('ongojisin:landing-event', { detail }))
  // Bounded, per-tab diagnostics also work without an external analytics provider.
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem('ongojisin_landing_events') || '[]',
    )
    const events = Array.isArray(raw) ? raw.slice(-49) : []
    sessionStorage.setItem(
      'ongojisin_landing_events',
      JSON.stringify([...events, detail]),
    )
  } catch {
    /* The product remains usable when browser storage is unavailable. */
  }
}

export function useLandingTracking() {
  const viewed = useRef(false)
  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    emit('landing_page_view')
  }, [])
  const trackButtonClick = useCallback((name: string) => emit(name), [])
  const trackFeatureUsed = useCallback(
    (name: string, properties: LandingProperties) => emit(name, properties),
    [],
  )
  return { trackButtonClick, trackFeatureUsed }
}
