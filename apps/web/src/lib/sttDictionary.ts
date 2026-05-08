/**
 * 음성차트 STT 후처리용 한의 용어 사전.
 *
 * 한의사 가정: STT 엔진(Web Speech API 등)은 한의학 전문용어에 약하다.
 * 자주 들리는 오인식 패턴을 사후 치환한다.
 *
 * 정책:
 *  - 길이 우선 매칭 (긴 단어부터 — 부분 치환으로 인한 의도치 않은 변경 방지)
 *  - 사용자별 사전 추가 가능 (localStorage 저장 → 재진료에서 재사용)
 *  - 변환 결과는 사용자에게 항상 표시되어야 한다 (자동 적용 + 되돌리기 버튼)
 */

export interface CorrectionPair {
  /** STT 가 자주 잘못 인식한 표현 */
  from: string
  /** 표준 한의 용어 */
  to: string
  category?: 'pattern' | 'pulse' | 'tongue' | 'symptom' | 'formula' | 'herb'
}

/** 핵심 사전 — 임상에서 빈번한 오인식 위주. 운영하며 보강. */
export const DEFAULT_STT_CORRECTIONS: CorrectionPair[] = [
  // 변증 관련 — 받침/모음 오인식
  { from: '기흐', to: '기허', category: 'pattern' },
  { from: '혀럴', to: '혈허', category: 'pattern' },
  { from: '으믈', to: '음허', category: 'pattern' },
  { from: '양허이', to: '양허', category: 'pattern' },
  { from: '습너', to: '습열', category: 'pattern' },
  { from: '간기 울결', to: '간기울결', category: 'pattern' },
  { from: '풍 한', to: '풍한', category: 'pattern' },
  { from: '풍 열', to: '풍열', category: 'pattern' },
  { from: '담 음', to: '담음', category: 'pattern' },

  // 맥진
  { from: '부맥', to: '부맥(浮)', category: 'pulse' },
  { from: '침맥', to: '침맥(沈)', category: 'pulse' },
  { from: '활맥', to: '활맥(滑)', category: 'pulse' },
  { from: '세맥', to: '세맥(細)', category: 'pulse' },
  { from: '현맥', to: '현맥(弦)', category: 'pulse' },
  { from: '꼬맥', to: '고맥', category: 'pulse' },

  // 설진
  { from: '백태 두꺼움', to: '백태(厚)', category: 'tongue' },
  { from: '황태', to: '황태(黃)', category: 'tongue' },
  { from: '설질 홍', to: '설홍', category: 'tongue' },

  // 처방 — 음운 오인식 빈출
  { from: '보충익기탕', to: '보중익기탕', category: 'formula' },
  { from: '보중이기탕', to: '보중익기탕', category: 'formula' },
  { from: '육미 지황 탕', to: '육미지황탕', category: 'formula' },
  { from: '팔미 지황 환', to: '팔미지황탕', category: 'formula' },
  { from: '소요 산', to: '소요산', category: 'formula' },
  { from: '귀비 탕', to: '귀비탕', category: 'formula' },
  { from: '시 오 소간 산', to: '시호소간탕', category: 'formula' },

  // 약재
  { from: '단귀', to: '당귀', category: 'herb' },
  { from: '핸기', to: '황기', category: 'herb' },
  { from: '인 삼', to: '인삼', category: 'herb' },
  { from: '백 출', to: '백출', category: 'herb' },
]

const USER_DICT_KEY = 'ongojisin:stt-dict:v1'

export function loadUserCorrections(): CorrectionPair[] {
  try {
    const raw = localStorage.getItem(USER_DICT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CorrectionPair[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveUserCorrections(items: CorrectionPair[]): void {
  try {
    localStorage.setItem(USER_DICT_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export function addUserCorrection(pair: CorrectionPair): void {
  const existing = loadUserCorrections()
  const exists = existing.some((p) => p.from === pair.from)
  const next = exists ? existing.map((p) => (p.from === pair.from ? pair : p)) : [...existing, pair]
  saveUserCorrections(next)
}

export interface CorrectionResult {
  text: string
  appliedCorrections: Array<{ from: string; to: string }>
}

/**
 * STT 결과 텍스트에 사전을 적용한다.
 * - 길이 내림차순으로 정렬 후 1회 치환 (overlap 방지).
 * - 사용자 사전이 우선.
 */
export function applyCorrections(
  text: string,
  options: { extra?: CorrectionPair[] } = {},
): CorrectionResult {
  if (!text) return { text, appliedCorrections: [] }
  const dict = [
    ...(options.extra ?? []),
    ...loadUserCorrections(),
    ...DEFAULT_STT_CORRECTIONS,
  ]
  const sorted = [...dict].sort((a, b) => b.from.length - a.from.length)
  let out = text
  const applied: Array<{ from: string; to: string }> = []
  for (const pair of sorted) {
    if (!pair.from || !pair.to || pair.from === pair.to) continue
    const escaped = pair.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(escaped, 'g')
    if (re.test(out)) {
      out = out.replace(re, pair.to)
      applied.push({ from: pair.from, to: pair.to })
    }
  }
  return { text: out, appliedCorrections: applied }
}
