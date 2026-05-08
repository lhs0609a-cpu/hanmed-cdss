import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import api from '@/services/api'

/**
 * 필수 시스템 공지 — 점검·약관 변경·신기능 안내.
 *
 * 정책:
 *   - severity='blocking' 공지는 닫을 수 없다 (점검 안내 등).
 *   - severity='dismissible' 공지는 사용자가 닫으면 ID 별로 24시간 숨김.
 *   - 마케팅·뉴스레터는 별도 채널 (이 컴포넌트는 운영/규제 공지 전용).
 *
 * 백엔드: GET /api/v1/notices?audience=app — 페이지 진입 시 한 번 + 30분마다 폴링.
 */

export interface SystemNotice {
  id: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical' | 'blocking'
  link?: { href: string; label: string }
  startsAt?: string
  endsAt?: string
}

interface SystemNoticeContextType {
  notices: SystemNotice[]
  visibleNotices: SystemNotice[]
  dismiss: (id: string) => void
  refetch: () => Promise<void>
}

const STORAGE_KEY = 'ongojisin:notices:dismissed:v1'
const POLL_INTERVAL_MS = 30 * 60 * 1000

const SystemNoticeContext = createContext<SystemNoticeContextType | undefined>(undefined)

function loadDismissed(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveDismissed(map: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function SystemNoticeProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<SystemNotice[]>([])
  const [dismissed, setDismissed] = useState<Record<string, number>>(loadDismissed)

  const refetch = useCallback(async () => {
    try {
      const res = await api.get<SystemNotice[]>('/notices', { params: { audience: 'app' } })
      const items = Array.isArray(res.data) ? res.data : []
      setNotices(items)
    } catch {
      // 백엔드 미배포 환경에서는 조용히 무시 (UI 동작은 유지).
    }
  }, [])

  useEffect(() => {
    refetch()
    const t = setInterval(refetch, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [refetch])

  const dismiss = useCallback((id: string) => {
    const next = { ...loadDismissed(), [id]: Date.now() }
    saveDismissed(next)
    setDismissed(next)
  }, [])

  const visibleNotices = useMemo(() => {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    return notices.filter((n) => {
      if (n.severity === 'blocking') return true
      const d = dismissed[n.id]
      if (d && d > oneDayAgo) return false
      if (n.startsAt && now < new Date(n.startsAt).getTime()) return false
      if (n.endsAt && now > new Date(n.endsAt).getTime()) return false
      return true
    })
  }, [notices, dismissed])

  const value: SystemNoticeContextType = { notices, visibleNotices, dismiss, refetch }

  return <SystemNoticeContext.Provider value={value}>{children}</SystemNoticeContext.Provider>
}

export function useSystemNotices() {
  const ctx = useContext(SystemNoticeContext)
  if (!ctx) throw new Error('useSystemNotices must be used within SystemNoticeProvider')
  return ctx
}

const severityStyle: Record<SystemNotice['severity'], string> = {
  info: 'bg-blue-50 text-blue-900 border-blue-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  critical: 'bg-red-50 text-red-900 border-red-200',
  blocking: 'bg-red-600 text-white border-red-700',
}

export function SystemNoticeBanner() {
  const { visibleNotices, dismiss } = useSystemNotices()
  if (!visibleNotices.length) return null
  return (
    <div className="space-y-2 px-4 py-2">
      {visibleNotices.map((n) => {
        const Icon = n.severity === 'critical' || n.severity === 'blocking' ? AlertTriangle : Info
        return (
          <div
            key={n.id}
            data-status={n.severity === 'blocking' ? 'danger' : n.severity === 'critical' ? 'warning' : 'info'}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${severityStyle[n.severity]}`}
            role={n.severity === 'blocking' ? 'alertdialog' : 'status'}
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">{n.title}</p>
              <p className="opacity-90 mt-0.5">{n.body}</p>
              {n.link && (
                <a href={n.link.href} className="underline mt-1 inline-block font-medium">
                  {n.link.label}
                </a>
              )}
            </div>
            {n.severity !== 'blocking' && (
              <button
                onClick={() => dismiss(n.id)}
                aria-label="공지 닫기"
                className="rounded-md p-1 hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
