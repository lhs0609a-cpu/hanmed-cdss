import { useEffect, useRef, useState } from 'react'
import { saveDraft, loadDraft, clearDraft } from '@/lib/formDraft'

/**
 * 폼 상태를 자동으로 localStorage 드래프트에 저장한다.
 *
 * 사용:
 *   const [form, setForm, draftMeta] = useFormDraft<MyForm>('patient-chart:abc-123', initial)
 *   // 1초 무입력 시 자동 저장
 *   // 페이지 재진입 / 세션 만료 후 재로그인 시 자동 복원
 *
 * 정책:
 *   - 키는 형태별 + ID 조합 (예: `consultation:patient:42`)
 *   - 비어있는 폼이면 저장하지 않음 (false-positive 복원 방지)
 *   - submitCommit() 호출 시 드래프트 삭제
 */

interface DraftMeta {
  restoredAt: number | null
  isDirty: boolean
  lastSavedAt: number | null
  clear: () => void
  commit: () => void
}

export function useFormDraft<T extends object>(
  key: string,
  initial: T,
  options: { debounceMs?: number; isEmpty?: (v: T) => boolean } = {},
): [T, React.Dispatch<React.SetStateAction<T>>, DraftMeta] {
  const debounceMs = options.debounceMs ?? 1000
  const isEmpty = options.isEmpty ?? ((v: T) => Object.values(v).every((x) => !x))

  const [restoredAt, setRestoredAt] = useState<number | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [value, setValue] = useState<T>(() => {
    const restored = loadDraft<T>(key)
    if (restored) {
      // 비동기로 알림 표시할 수 있게 setState 마킹
      setTimeout(() => setRestoredAt(Date.now()), 0)
      return restored
    }
    return initial
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isEmpty(value)) {
      // 빈 상태는 저장하지 않음. 기존 드래프트도 정리.
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    setIsDirty(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveDraft(key, value)
      setLastSavedAt(Date.now())
      setIsDirty(false)
    }, debounceMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key, debounceMs])

  // 페이지 이탈 직전 즉시 저장 (Tab 전환·새로고침)
  useEffect(() => {
    const handler = () => {
      if (!isEmpty(value)) saveDraft(key, value)
    }
    window.addEventListener('beforeunload', handler)
    window.addEventListener('pagehide', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
      window.removeEventListener('pagehide', handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key])

  const meta: DraftMeta = {
    restoredAt,
    isDirty,
    lastSavedAt,
    clear: () => {
      clearDraft(key)
      setLastSavedAt(null)
      setRestoredAt(null)
    },
    commit: () => {
      clearDraft(key)
      setLastSavedAt(null)
      setIsDirty(false)
    },
  }

  return [value, setValue, meta]
}
