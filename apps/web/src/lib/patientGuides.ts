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

// ── 복용 기록 (기기 저장) ──────────────────────────────────────
// 복용 시작일과 오늘 먹었는지는 서버가 알 수 없다. 처방일이 곧 복용 시작일은
// 아니고(며칠 뒤부터 먹는 경우가 흔하다), 발행일로 추정하면 틀린 날짜를
// 자신 있게 보여주게 된다. 그래서 환자가 직접 누른 값만 쓴다.
//
// 서버로 보내지 않는다. 복약 순응도를 한의사에게 자동으로 넘기는 건
// 환자가 동의한 적 없는 감시다. 알릴지 말지는 환자가 자가 기록에서 정한다.

const DOSE_KEY = 'ongojisin:patient:doses'

export interface DoseLog {
  /** 복용 시작일 (YYYY-MM-DD). 안 눌렀으면 null */
  startedOn: string | null
  /** 복용한 날짜들 (YYYY-MM-DD) */
  takenDates: string[]
}

type DoseMap = Record<string, DoseLog>

function readDoseMap(): DoseMap {
  try {
    const raw = localStorage.getItem(DOSE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as DoseMap) : {}
  } catch {
    return {}
  }
}

function writeDoseMap(map: DoseMap): void {
  try {
    localStorage.setItem(DOSE_KEY, JSON.stringify(map))
  } catch {
    /* 저장 실패는 무시 — 안내서 본문은 그대로 보인다 */
  }
}

/** 오늘 날짜를 기기 시간대 기준 YYYY-MM-DD 로. UTC 로 자르면 하루가 밀린다. */
export function todayKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function getDoseLog(token: string): DoseLog {
  return readDoseMap()[token] ?? { startedOn: null, takenDates: [] }
}

export function startDosing(token: string): DoseLog {
  const map = readDoseMap()
  const today = todayKey()
  const next: DoseLog = {
    startedOn: today,
    takenDates: Array.from(new Set([...(map[token]?.takenDates ?? []), today])),
  }
  map[token] = next
  writeDoseMap(map)
  return next
}

/** 오늘 복용 체크를 켜고 끈다. */
export function toggleTakenToday(token: string): DoseLog {
  const map = readDoseMap()
  const today = todayKey()
  const current = map[token] ?? { startedOn: today, takenDates: [] }
  const taken = current.takenDates.includes(today)
  const next: DoseLog = {
    startedOn: current.startedOn ?? today,
    takenDates: taken
      ? current.takenDates.filter((d) => d !== today)
      : [...current.takenDates, today],
  }
  map[token] = next
  writeDoseMap(map)
  return next
}

/** 복용 시작일로부터 오늘이 며칠째인지(시작일이 1일째). */
export function daysSinceStart(startedOn: string | null): number | null {
  if (!startedOn) return null
  const start = new Date(`${startedOn}T00:00:00`)
  const today = new Date(`${todayKey()}T00:00:00`)
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000)
  return diff >= 0 ? diff + 1 : null
}
