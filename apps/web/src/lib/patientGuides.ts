/**
 * 환자 기기에 저장하는 복약 안내서 보관함.
 *
 * 서버에 환자 계정을 만들지 않는다. 안내서는 원래 링크만 알면 열리는 문서이고,
 * "내가 받은 안내서 목록" 은 그 링크를 기억해 두는 것 이상이 아니다. 그걸 위해
 * 회원가입을 시키면 아무도 안 쓴다.
 *
 * 그래서 보관함은 환자 본인 기기의 localStorage 에 둔다. 기기를 바꾸면 사라지지만,
 * 안내서 자체는 링크(약봉투의 QR)로 언제든 다시 열 수 있으므로 잃는 것이 없다.
 * 이 저장소에는 토큰과 표시용 문구만 들어간다 — 진료 내용은 서버에서 그때그때 읽는다.
 */

const KEY = 'ongojisin:patient:guides'

export interface SavedGuide {
  token: string
  formulaName: string
  clinicName: string | null
  issuedAt: string
  savedAt: number
}

export function listSavedGuides(): SavedGuide[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as SavedGuide[])
      .filter((g) => typeof g?.token === 'string' && g.token.length > 0)
      .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))
  } catch {
    // 깨진 값 때문에 보관함 화면 전체가 죽지 않게 한다.
    return []
  }
}

/** 같은 안내서를 다시 열면 내용만 갱신한다(중복으로 쌓이지 않게). */
export function saveGuide(guide: Omit<SavedGuide, 'savedAt'>): void {
  try {
    const rest = listSavedGuides().filter((g) => g.token !== guide.token)
    const next = [{ ...guide, savedAt: Date.now() }, ...rest].slice(0, 50)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // 저장 실패(용량 초과·프라이빗 모드)는 무시한다. 안내서는 링크로 열린다.
  }
}

export function removeGuide(token: string): SavedGuide[] {
  const next = listSavedGuides().filter((g) => g.token !== token)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* 위와 같음 */
  }
  return next
}

/** 붙여넣은 링크나 코드에서 토큰만 뽑는다. */
export function extractGuideToken(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  const fromUrl = raw.match(/\/guide\/([A-Za-z0-9_-]+)/)
  const token = fromUrl ? fromUrl[1] : raw
  return /^[A-Za-z0-9_-]{16,64}$/.test(token) ? token : null
}
