/**
 * 진료 입력 중 세션 만료/네트워크 단절로부터 폼 상태를 보호한다.
 *
 * 사용 시나리오:
 *   - 환자 차트, 진료 기록, 변증 추론 입력 폼
 *   - 401 발생 시 api 인터셉터가 saveAllDrafts() 호출 → 재로그인 후 자동 복원
 *
 * 정책: 키별로 저장, 24시간 이상 된 드래프트는 GC 시 폐기.
 */

const PREFIX = 'ongojisin:draft:'
const TTL_MS = 24 * 60 * 60 * 1000

interface DraftRecord<T = unknown> {
  v: 1
  t: number
  data: T
}

export function saveDraft<T>(key: string, data: T): void {
  try {
    const record: DraftRecord<T> = { v: 1, t: Date.now(), data }
    localStorage.setItem(PREFIX + key, JSON.stringify(record))
  } catch {
    // localStorage 가득 등 예외는 무시. 데이터 손실 방지가 best-effort.
  }
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const record = JSON.parse(raw) as DraftRecord<T>
    if (Date.now() - record.t > TTL_MS) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return record.data
  } catch {
    return null
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}

export function listDraftKeys(): Array<{ key: string; savedAt: number }> {
  const out: Array<{ key: string; savedAt: number }> = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      const raw = localStorage.getItem(k)
      if (!raw) continue
      try {
        const r = JSON.parse(raw) as DraftRecord
        out.push({ key: k.slice(PREFIX.length), savedAt: r.t })
      } catch {
        // skip malformed
      }
    }
  } catch {
    // ignore
  }
  return out
}

/** GC: 24시간 이상 경과 드래프트 정리 */
export function gcDrafts(): number {
  let cleared = 0
  for (const { key, savedAt } of listDraftKeys()) {
    if (Date.now() - savedAt > TTL_MS) {
      clearDraft(key)
      cleared += 1
    }
  }
  return cleared
}
