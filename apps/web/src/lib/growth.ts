import { useAuthStore } from '@/stores/authStore'

const PUBLIC = [
  '/',
  '/go',
  '/start',
  '/trial',
  '/register',
  '/login',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/refund-policy',
  '/subscription-terms',
]
export const isMarketingPage = (page: string) => PUBLIC.includes(page)
export const growthPage = (page = location.pathname) =>
  isMarketingPage(page) || /^\/dashboard(?:\/[a-z-]+)?$/.test(page)
    ? page
    : null
type Event = Record<string, string | number>
const KEY = 'ongojisin_growth_v1'
const endpoint = `${(import.meta.env.VITE_API_URL || 'https://api.ongojisin.co.kr/api/v1').replace(/\/$/, '')}/analytics/growth/events`
let queue: Event[] = []
const inFlight = new Set<string | number>()
let memory:
  | {
      visitor: string
      session: string
      last: number
      attribution: Record<string, string>
    }
  | undefined
let timer: ReturnType<typeof setTimeout> | undefined
const slug = (value: string | null) =>
  value && /^[a-zA-Z0-9_.:-]{1,80}$/.test(value) ? value : undefined
export function growthAllowed() {
  const user = useAuthStore.getState().user
  try {
    if (localStorage.getItem('ongojisin_growth_optout') === '1') return false
  } catch {
    /* optional storage */
  }
  return (
    navigator.doNotTrack !== '1' &&
    !(navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl &&
    !['admin', 'super_admin', 'support', 'content_manager'].includes(
      user?.role || '',
    ) &&
    !location.pathname.startsWith('/admin')
  )
}
export function setGrowthOptOut(value: boolean) {
  try {
    localStorage.setItem('ongojisin_growth_optout', value ? '1' : '0')
    if (value) {
      localStorage.removeItem(`${KEY}_visitor`)
      sessionStorage.removeItem(KEY)
    }
  } catch {
    /* optional storage */
  }
  if (value) {
    queue = []
    memory = undefined
  }
}
function context() {
  const now = Date.now()
  if (!memory) {
    try {
      memory = JSON.parse(sessionStorage.getItem(KEY) || 'null') || undefined
    } catch {
      /* memory fallback */
    }
  }
  if (!memory || now - memory.last > 1800000) {
    let visitor = memory?.visitor
    let visitorExpires = now + 90 * 86400000
    try {
      const stored = JSON.parse(
        localStorage.getItem(`${KEY}_visitor`) || 'null',
      )
      if (stored?.expires > now) { visitor = stored.id; visitorExpires = stored.expires }
      else visitor = undefined
    } catch {
      /* memory fallback */
    }
    visitor ||= crypto.randomUUID()
    const params = new URLSearchParams(location.search)
    let ref = 'direct'
    try {
      const url = new URL(document.referrer)
      if (url.hostname !== location.hostname) ref = url.hostname
    } catch {
      /* no referrer */
    }
    const attribution: Record<string, string> = {
      source:
        slug(params.get('utm_source')) ||
        (params.has('gclid') ? 'google' : params.has('fbclid') ? 'meta' : ref),
      medium:
        slug(params.get('utm_medium')) ||
        (params.has('gclid') ? 'cpc' : ref === 'direct' ? 'none' : 'referral'),
    }
    for (const key of ['campaign', 'content']) {
      const value = slug(params.get(`utm_${key}`))
      if (value) attribution[key] = value
    }
    memory = { visitor, session: crypto.randomUUID(), last: now, attribution }
    try {
      localStorage.setItem(
        `${KEY}_visitor`,
        JSON.stringify({ id: visitor, expires: visitorExpires }),
      )
    } catch {
      /* optional storage */
    }
  }
  memory.last = now
  try {
    sessionStorage.setItem(KEY, JSON.stringify(memory))
  } catch {
    /* optional storage */
  }
  return memory
}
export function trackGrowth(
  type: string,
  properties: Event = {},
  route?: string,
) {
  if (!growthAllowed()) {
    queue = []
    return
  }
  const page = growthPage(route)
  if (!page) return
  try {
    const c = context()
    queue.push({
      ...properties,
      id: crypto.randomUUID(),
      type,
      page,
      timestamp: new Date().toISOString(),
      sessionId: c.session,
      visitorId: c.visitor,
      device:
        innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop',
      ...c.attribution,
    })
    queue = queue.slice(-100)
    if (!timer)
      timer = setTimeout(() => {
        timer = undefined
        void flushGrowth()
      }, 1500)
  } catch {
    /* Tracking must never block a user action. */
  }
}
export async function flushGrowth() {
  if (!queue.length) return
  if (!growthAllowed()) {
    queue = []
    return
  }
  // A pagehide flush must also send new events while an earlier batch is in flight.
  const batch = queue.filter((e) => !inFlight.has(e.id)).slice(0, 30)
  if (!batch.length) return
  batch.forEach((e) => inFlight.add(e.id))
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
      credentials: 'omit',
      signal: AbortSignal.timeout(10000),
    })
    if (
      response.ok ||
      (response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429)
    ) {
      const ids = new Set(batch.map((e) => e.id))
      queue = queue.filter((e) => !ids.has(e.id))
    }
  } catch {
    /* Keep bounded batch for the next heartbeat; event IDs deduplicate retries. */
  } finally {
    batch.forEach((e) => inFlight.delete(e.id))
  }
}
export function growthErrorCode(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status ? `http_${status}` : 'network'
}
