import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'

/**
 * 다중 환자 진료 동시 처리.
 *
 * 한의사 사용 환경 가정:
 *   - 진료실에서 두 환자를 동시에 다루는 경우가 있다 (가족 단위 진료, 응급 환자 끼어들기 등).
 *   - 탭 두 개로 같은 환자를 여는 사고를 막아야 한다 (저장 충돌 → 데이터 덮어쓰기).
 *
 * 정책:
 *   - 환자 ID 별로 ‘세션 스냅샷’을 하나만 active 로 잡는다.
 *   - 탭/창 간 BroadcastChannel 로 active 환자를 동기화하여, 동일 환자가 두 탭에서 열리면
 *     나중에 연 탭에서 경고를 띄우고 read-only 모드 권장.
 *   - 새 환자로 이동 시 이전 환자의 미저장 입력은 formDraft 가 별도로 보존.
 */

interface ActivePatient {
  patientId: string
  openedAt: number
  tabId: string
}

interface MultiPatientContextType {
  activePatient: ActivePatient | null
  conflictingTab: ActivePatient | null
  openPatient: (patientId: string) => void
  closePatient: () => void
}

const STORAGE_KEY = 'ongojisin:active-patient:v1'
const CHANNEL_NAME = 'ongojisin:patients'

const TAB_ID = (() => {
  try {
    return crypto.randomUUID?.() ?? `tab-${Math.random().toString(36).slice(2)}`
  } catch {
    return `tab-${Math.random().toString(36).slice(2)}`
  }
})()

const Ctx = createContext<MultiPatientContextType | undefined>(undefined)

export function MultiPatientProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActivePatient | null>(null)
  const [conflict, setConflict] = useState<ActivePatient | null>(null)

  const channel = useMemo(() => {
    try {
      return typeof window !== 'undefined' && 'BroadcastChannel' in window
        ? new BroadcastChannel(CHANNEL_NAME)
        : null
    } catch {
      return null
    }
  }, [])

  // 다른 탭이 같은 환자를 열면 conflict 표시
  useEffect(() => {
    if (!channel) return
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { type: string; payload: ActivePatient }
      if (msg.type === 'open-patient') {
        if (active && active.patientId === msg.payload.patientId && msg.payload.tabId !== TAB_ID) {
          setConflict(msg.payload)
        }
      }
      if (msg.type === 'close-patient') {
        if (conflict && msg.payload.patientId === conflict.patientId) setConflict(null)
      }
    }
    channel.addEventListener('message', onMessage)
    return () => channel.removeEventListener('message', onMessage)
  }, [channel, active, conflict])

  const openPatient = useCallback(
    (patientId: string) => {
      const next: ActivePatient = { patientId, openedAt: Date.now(), tabId: TAB_ID }
      setActive(next)
      setConflict(null)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      channel?.postMessage({ type: 'open-patient', payload: next })
    },
    [channel],
  )

  const closePatient = useCallback(() => {
    if (!active) return
    channel?.postMessage({ type: 'close-patient', payload: active })
    setActive(null)
    setConflict(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [active, channel])

  const value: MultiPatientContextType = {
    activePatient: active,
    conflictingTab: conflict,
    openPatient,
    closePatient,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMultiPatient() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMultiPatient must be used within MultiPatientProvider')
  return v
}
