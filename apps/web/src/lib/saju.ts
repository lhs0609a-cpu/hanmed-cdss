/**
 * 사주(四柱) 팔자 계산 엔진
 * 생년월일시 → 사주 팔자, 오행 밸런스, 사상체질 도출
 * 엔터테인먼트 목적의 간이 계산 (만세력 기반 근사치)
 */

// ─── 기본 데이터 ─────────────────────────────────────

/** 천간 (Heavenly Stems) */
export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const
export const STEM_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const

/** 지지 (Earthly Branches) */
export const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const
export const BRANCH_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

/** 오행 (Five Elements) */
export type Element = '목' | '화' | '토' | '금' | '수'
export const ELEMENTS: Element[] = ['목', '화', '토', '금', '수']
export const ELEMENT_NAMES: Record<Element, string> = { 목: '木 (나무)', 화: '火 (불)', 토: '土 (흙)', 금: '金 (쇠)', 수: '水 (물)' }
export const ELEMENT_COLORS: Record<Element, string> = { 목: '#22c55e', 화: '#ef4444', 토: '#eab308', 금: '#f8fafc', 수: '#3b82f6' }
export const ELEMENT_BG: Record<Element, string> = { 목: '#dcfce7', 화: '#fee2e2', 토: '#fef9c3', 금: '#f1f5f9', 수: '#dbeafe' }
export const ELEMENT_EMOJI: Record<Element, string> = { 목: '🌳', 화: '🔥', 토: '⛰️', 금: '⚔️', 수: '💧' }

/** 천간 → 오행 매핑 */
const STEM_TO_ELEMENT: Element[] = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수']

/** 지지 → 오행 매핑 */
const BRANCH_TO_ELEMENT: Element[] = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수']

/** 지지 → 띠 이름 */
export const ZODIAC_ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'] as const
export const ZODIAC_EMOJI = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷'] as const

/** 절기(월) 시작일 근사값 [month, day] */
const SOLAR_TERM_STARTS: [number, number][] = [
  [2, 4],   // 1월 인(寅) - 입춘
  [3, 6],   // 2월 묘(卯) - 경칩
  [4, 5],   // 3월 진(辰) - 청명
  [5, 6],   // 4월 사(巳) - 입하
  [6, 6],   // 5월 오(午) - 망종
  [7, 7],   // 6월 미(未) - 소서
  [8, 8],   // 7월 신(申) - 입추
  [9, 8],   // 8월 유(酉) - 백로
  [10, 8],  // 9월 술(戌) - 한로
  [11, 7],  // 10월 해(亥) - 입동
  [12, 7],  // 11월 자(子) - 대설
  [1, 5],   // 12월 축(丑) - 소한
]

/** 오호연원법 - 년간으로 월간 시작 천간 결정 */
const MONTH_STEM_OFFSET = [2, 4, 6, 8, 0] // 갑기→병, 을경→무, 병신→경, 정임→임, 무계→갑

/** 오자연원법 - 일간으로 시간 시작 천간 결정 */
const HOUR_STEM_OFFSET = [0, 2, 4, 6, 8] // 갑기→갑, 을경→병, 병신→무, 정임→경, 무계→임

// ─── 타입 정의 ─────────────────────────────────────

export interface Pillar {
  stem: number    // 천간 인덱스 (0-9)
  branch: number  // 지지 인덱스 (0-11)
}

export interface SajuResult {
  year: Pillar    // 년주
  month: Pillar   // 월주
  day: Pillar     // 일주
  hour: Pillar | null // 시주 (시간 미입력시 null)
  zodiac: string  // 띠
  zodiacEmoji: string
}

export interface ElementBalance {
  목: number
  화: number
  토: number
  금: number
  수: number
}

export type ConstitutionType = 'taeyang' | 'taeeum' | 'soyang' | 'soeum'

export interface HealthProfile {
  constitution: ConstitutionType
  dominantElement: Element
  weakElement: Element
  strongOrgan: string
  weakOrgan: string
  yearFortune: string    // 올해 세운
  luckyElement: Element  // 용신 (간이)
}

// ─── 계산 함수 ─────────────────────────────────────

/** 율리우스 일수 (Julian Day Number) 계산 */
function getJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

/** 입춘 이전이면 전년으로 보정 */
function getAdjustedYear(year: number, month: number, day: number): number {
  if (month < 2 || (month === 2 && day < 4)) return year - 1
  return year
}

/** 절기월 인덱스 (0-11) 결정 */
function getSolarMonth(month: number, day: number): number {
  for (let i = 0; i < 12; i++) {
    const [sm, sd] = SOLAR_TERM_STARTS[i]
    const nextIdx = (i + 1) % 12
    const [nm, nd] = SOLAR_TERM_STARTS[nextIdx]

    if (sm <= nm) {
      // 같은 해 내
      if ((month > sm || (month === sm && day >= sd)) &&
          (month < nm || (month === nm && day < nd))) {
        return i
      }
    } else {
      // 연도를 넘는 경우 (12월→1월)
      if ((month > sm || (month === sm && day >= sd)) ||
          (month < nm || (month === nm && day < nd))) {
        return i
      }
    }
  }
  return 0 // fallback
}

/** 년주 계산 */
function getYearPillar(year: number, month: number, day: number): Pillar {
  const adj = getAdjustedYear(year, month, day)
  return {
    stem: ((adj % 10) + 6) % 10,     // 갑=4에 해당하므로 보정
    branch: ((adj % 12) + 8) % 12,   // 자=4에 해당하므로 보정
  }
}

/** 월주 계산 */
function getMonthPillar(year: number, month: number, day: number): Pillar {
  const yearPillar = getYearPillar(year, month, day)
  const solarMonth = getSolarMonth(month, day)

  // 지지: 인(2)부터 시작
  const branch = (solarMonth + 2) % 12

  // 천간: 오호연원법
  const yearStemGroup = yearPillar.stem % 5
  const startStem = MONTH_STEM_OFFSET[yearStemGroup]
  const stem = (startStem + solarMonth) % 10

  return { stem, branch }
}

/** 일주 계산 (JDN 기반) */
function getDayPillar(year: number, month: number, day: number): Pillar {
  const jdn = getJDN(year, month, day)
  // 기준점: JDN 2299161 (1582-10-15) = 갑자일 근처
  // 실용 공식: (JDN + 9) % 60
  const idx = ((jdn + 9) % 60 + 60) % 60
  return {
    stem: idx % 10,
    branch: idx % 12,
  }
}

/** 시주 계산 */
function getHourPillar(dayStem: number, hour: number): Pillar {
  // 시간 → 지지 (23시=자시, 1시=축시, ...)
  // 자시(23-1), 축시(1-3), 인시(3-5), ...
  const branchIdx = Math.floor(((hour + 1) % 24) / 2)

  // 오자연원법으로 천간 결정
  const dayStemGroup = dayStem % 5
  const startStem = HOUR_STEM_OFFSET[dayStemGroup]
  const stem = (startStem + branchIdx) % 10

  return { stem, branch: branchIdx }
}

// ─── 메인 API ─────────────────────────────────────

/**
 * 사주 팔자 계산
 * @param birthDate 'YYYY-MM-DD' 형식 생년월일
 * @param birthHour 0-23 시간 (선택)
 */
export function calculateSaju(birthDate: string, birthHour?: number): SajuResult {
  const [year, month, day] = birthDate.split('-').map(Number)

  const yearPillar = getYearPillar(year, month, day)
  const monthPillar = getMonthPillar(year, month, day)
  const dayPillar = getDayPillar(year, month, day)
  const hourPillar = birthHour != null ? getHourPillar(dayPillar.stem, birthHour) : null

  const zodiacIdx = yearPillar.branch
  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    zodiac: ZODIAC_ANIMALS[zodiacIdx],
    zodiacEmoji: ZODIAC_EMOJI[zodiacIdx],
  }
}

/**
 * 오행 밸런스 계산
 */
export function getElementBalance(saju: SajuResult): ElementBalance {
  const balance: ElementBalance = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }

  const addPillar = (p: Pillar, weight: number) => {
    balance[STEM_TO_ELEMENT[p.stem]] += weight
    balance[BRANCH_TO_ELEMENT[p.branch]] += weight
  }

  // 각 주에 가중치 부여 (일주가 가장 중요)
  addPillar(saju.year, 1.0)
  addPillar(saju.month, 1.2)
  addPillar(saju.day, 1.5)   // 일주(본인) 가장 중요
  if (saju.hour) addPillar(saju.hour, 1.0)

  // 정규화 (합계 100)
  const total = Object.values(balance).reduce((a, b) => a + b, 0)
  if (total > 0) {
    for (const key of ELEMENTS) {
      balance[key] = Math.round((balance[key] / total) * 100)
    }
  }

  // 합계 보정 (반올림 오차)
  const sum = Object.values(balance).reduce((a, b) => a + b, 0)
  if (sum !== 100) {
    const maxKey = ELEMENTS.reduce((a, b) => balance[a] >= balance[b] ? a : b)
    balance[maxKey] += 100 - sum
  }

  return balance
}

/**
 * 오행 밸런스 → 사상체질 추론
 */
export function deriveConstitution(balance: ElementBalance): ConstitutionType {
  // 사상체질 매핑 (오행 기반 간이 추론)
  // 태양인: 화 + 목 강 / 수 약 → 외향, 열정적
  // 소양인: 화 + 토 강 / 금 약 → 활발, 급함
  // 태음인: 토 + 금 강 / 목 약 → 듬직, 인내
  // 소음인: 수 + 금 강 / 화 약 → 섬세, 차분

  const scores = {
    taeyang: balance.화 * 1.5 + balance.목 * 1.0 - balance.수 * 0.5,
    soyang:  balance.화 * 1.0 + balance.토 * 1.2 - balance.금 * 0.3 + balance.목 * 0.5,
    taeeum:  balance.토 * 1.5 + balance.금 * 1.0 - balance.목 * 0.3 + balance.수 * 0.3,
    soeum:   balance.수 * 1.5 + balance.금 * 1.0 - balance.화 * 0.5,
  }

  return (Object.entries(scores) as [ConstitutionType, number][])
    .sort(([, a], [, b]) => b - a)[0][0]
}

/**
 * 건강 프로필 생성
 */
export function getHealthProfile(balance: ElementBalance): HealthProfile {
  const constitution = deriveConstitution(balance)

  // 가장 강한/약한 오행
  const sorted = ELEMENTS.slice().sort((a, b) => balance[b] - balance[a])
  const dominant = sorted[0]
  const weak = sorted[sorted.length - 1]

  // 오행 → 장부 매핑
  const organMap: Record<Element, [string, string]> = {
    목: ['간(肝)', '담(膽)'],
    화: ['심장(心)', '소장(小腸)'],
    토: ['비장(脾)', '위(胃)'],
    금: ['폐(肺)', '대장(大腸)'],
    수: ['신장(腎)', '방광(膀胱)'],
  }

  // 용신 (부족한 오행을 보충)
  const luckyElement = weak

  // 올해(2026) 세운 분석
  const thisYear = 2026
  const thisYearStem = ((thisYear % 10) + 6) % 10
  const thisYearBranch = ((thisYear % 12) + 8) % 12
  const yearElement = STEM_TO_ELEMENT[thisYearStem]
  const yearBranchElement = BRANCH_TO_ELEMENT[thisYearBranch]

  let yearFortune: string
  if (yearElement === luckyElement || yearBranchElement === luckyElement) {
    yearFortune = '올해는 부족한 기운이 채워지는 행운의 해! 적극적으로 도전하세요.'
  } else if (yearElement === dominant) {
    yearFortune = '올해는 본래 강한 기운이 더 강해져요. 과욕은 금물, 균형이 중요합니다.'
  } else {
    yearFortune = '올해는 안정적인 흐름이에요. 꾸준한 건강관리가 빛을 발합니다.'
  }

  return {
    constitution,
    dominantElement: dominant,
    weakElement: weak,
    strongOrgan: organMap[dominant][0],
    weakOrgan: organMap[weak][0],
    yearFortune,
    luckyElement,
  }
}

// ─── 포맷팅 헬퍼 ─────────────────────────────────

/** 주(柱) 한글 표시 */
export function formatPillar(p: Pillar): string {
  return `${STEMS[p.stem]}${BRANCHES[p.branch]}`
}

/** 주(柱) 한자 표시 */
export function formatPillarHanja(p: Pillar): string {
  return `${STEM_HANJA[p.stem]}${BRANCH_HANJA[p.branch]}`
}

/** 주(柱) 오행 색상 */
export function getPillarColors(p: Pillar): [string, string] {
  return [
    ELEMENT_COLORS[STEM_TO_ELEMENT[p.stem]],
    ELEMENT_COLORS[BRANCH_TO_ELEMENT[p.branch]],
  ]
}

/** 주(柱)의 오행 */
export function getPillarElements(p: Pillar): [Element, Element] {
  return [STEM_TO_ELEMENT[p.stem], BRANCH_TO_ELEMENT[p.branch]]
}

/** 나이 계산 */
export function getAge(birthDate: string): number {
  const [y, m, d] = birthDate.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) {
    age--
  }
  return age
}

/** 한국 나이 (만나이+1 or 2) */
export function getKoreanAge(birthDate: string): number {
  const [y] = birthDate.split('-').map(Number)
  return new Date().getFullYear() - y + 1
}

/**
 * 궁합 점수 계산 (두 사람의 오행 밸런스 기반)
 */
export function calculateCompatibility(
  balance1: ElementBalance,
  balance2: ElementBalance
): { score: number; description: string; details: string[] } {
  // 상생 관계: 목→화→토→금→수→목
  const generatingPairs: [Element, Element][] = [
    ['목', '화'], ['화', '토'], ['토', '금'], ['금', '수'], ['수', '목'],
  ]
  // 상극 관계: 목→토→수→화→금→목
  const overcomingPairs: [Element, Element][] = [
    ['목', '토'], ['토', '수'], ['수', '화'], ['화', '금'], ['금', '목'],
  ]

  let harmonyScore = 50 // 기본 점수
  const details: string[] = []

  // 보완 관계 (한 쪽이 약한 오행을 다른 쪽이 강하게 가짐)
  for (const el of ELEMENTS) {
    const diff = Math.abs(balance1[el] - balance2[el])
    if (diff > 20) {
      const stronger = balance1[el] > balance2[el] ? '첫째' : '둘째'
      harmonyScore += 3
      details.push(`${ELEMENT_EMOJI[el]} ${el}(${ELEMENT_NAMES[el].split(' ')[0]}) 기운을 ${stronger}가 보완해줌`)
    }
  }

  // 상생 체크
  for (const [a, b] of generatingPairs) {
    if ((balance1[a] > 25 && balance2[b] > 25) || (balance1[b] > 25 && balance2[a] > 25)) {
      harmonyScore += 5
      details.push(`${ELEMENT_EMOJI[a]}→${ELEMENT_EMOJI[b]} 상생: ${a}이 ${b}를 도와줌`)
    }
  }

  // 상극 체크
  for (const [a, b] of overcomingPairs) {
    if (balance1[a] > 30 && balance2[b] > 30) {
      harmonyScore -= 3
      details.push(`${ELEMENT_EMOJI[a]}⚡${ELEMENT_EMOJI[b]} 상극: 의견 충돌 가능성`)
    }
  }

  // 비슷한 오행 분포 → 공감 능력
  const similarity = ELEMENTS.reduce((acc, el) =>
    acc + (100 - Math.abs(balance1[el] - balance2[el])), 0) / 500
  harmonyScore += Math.round(similarity * 20)

  // 점수 범위 조정 (40-99)
  harmonyScore = Math.min(99, Math.max(40, harmonyScore))

  let description: string
  if (harmonyScore >= 90) description = '천생연분! 서로의 부족한 기운을 완벽히 채워주는 환상의 궁합'
  else if (harmonyScore >= 80) description = '아주 좋은 궁합! 함께하면 시너지가 폭발하는 사이'
  else if (harmonyScore >= 70) description = '좋은 궁합! 서로 다른 매력으로 끌리는 관계'
  else if (harmonyScore >= 60) description = '무난한 궁합! 노력하면 좋은 파트너가 될 수 있어요'
  else if (harmonyScore >= 50) description = '보통 궁합! 서로 이해하려는 노력이 필요해요'
  else description = '도전적인 궁합! 다름을 인정하면 성장의 기회가 될 수 있어요'

  if (details.length === 0) {
    details.push('서로 다른 오행 에너지를 가지고 있어요')
  }

  return { score: harmonyScore, description, details }
}

/**
 * 체질별 재미 포인트 생성 (자동 생성)
 */
export function generateFunFacts(constitution: ConstitutionType, balance: ElementBalance, name: string): string[] {
  const facts: string[] = []
  const dominant = ELEMENTS.slice().sort((a, b) => balance[b] - balance[a])[0]
  const weak = ELEMENTS.slice().sort((a, b) => balance[a] - balance[b])[0]

  const constitutionFacts: Record<ConstitutionType, string[]> = {
    taeyang: [
      `${name}의 추진력은 강한 화(火) 기운에서 나온다`,
      '카리스마가 넘치지만 가끔 너무 앞서나갈 때가 있음',
      '더운 거 잘 참지만 추위에는 약할 수 있음',
      '일단 시작하면 끝을 봐야 직성이 풀리는 스타일',
    ],
    soyang: [
      `${name}은(는) 활발한 소양인 에너지의 소유자`,
      '사교적이고 순발력이 뛰어남',
      '매운 음식보다 시원한 음식이 잘 맞음',
      '열정적이지만 꾸준함이 과제',
    ],
    taeeum: [
      `${name}의 든든한 존재감은 토(土) 기운 덕분`,
      '인내심과 끈기로 큰 일을 이뤄내는 타입',
      '먹는 걸 좋아하고 체중 관리가 과제일 수 있음',
      '한번 마음 먹으면 뚝심 있게 밀고 나감',
    ],
    soeum: [
      `${name}은(는) 섬세한 감성의 소음인`,
      '디테일에 강하고 분석력이 뛰어남',
      '따뜻한 음식과 환경이 잘 맞음',
      '내면의 에너지를 잘 관리하면 큰 힘을 발휘함',
    ],
  }

  facts.push(...constitutionFacts[constitution])

  // 오행 기반 추가 팩트
  if (dominant === '화' && balance.화 >= 30) facts.push('🔥 불 기운이 강해서 에너지가 넘침!')
  if (dominant === '수' && balance.수 >= 30) facts.push('💧 물 기운이 강해서 지혜롭고 유연함')
  if (dominant === '목' && balance.목 >= 30) facts.push('🌳 나무 기운이 강해서 성장과 도전을 즐김')
  if (dominant === '금' && balance.금 >= 30) facts.push('⚔️ 금 기운이 강해서 결단력이 있음')
  if (dominant === '토' && balance.토 >= 30) facts.push('⛰️ 흙 기운이 강해서 안정감과 포용력이 큼')

  if (weak === '수') facts.push('💧 수분 섭취와 신장 건강에 신경쓰면 좋아요')
  if (weak === '화') facts.push('🔥 체온 관리와 심장 건강 체크 추천')
  if (weak === '목') facts.push('🌳 간 건강과 스트레칭을 신경쓰면 좋아요')
  if (weak === '금') facts.push('⚔️ 호흡기 건강과 피부 관리 추천')
  if (weak === '토') facts.push('⛰️ 소화기 건강과 규칙적 식사가 중요해요')

  return facts.slice(0, 6) // 최대 6개
}

/**
 * 체질 근거 생성 (자동)
 */
export function generateConstitutionEvidence(
  constitution: ConstitutionType,
  _balance: ElementBalance,
  name: string
): string[] {
  const evidenceMap: Record<ConstitutionType, string[]> = {
    taeyang: [
      `오행에서 화(火)·목(木)이 강하게 나타남`,
      '진취적이고 창의적인 에너지가 사주에 드러남',
      '외향적이고 리더십이 강한 기질',
      '뜨거운 열정과 추진력의 소유자',
      '상체가 발달하고 하체 관리가 필요한 체질',
    ],
    soyang: [
      `오행에서 화(火)·토(土)가 고르게 분포`,
      '활발하고 사교적인 기운이 강함',
      '순발력과 재치가 뛰어난 기질',
      '가슴이 넓고 엉덩이가 좁은 체형 경향',
      '비장과 위장이 강하고 신장 관리 필요',
    ],
    taeeum: [
      `오행에서 토(土)·금(金)이 두드러짐`,
      '든든하고 안정적인 에너지가 사주 전체에 흐름',
      '인내심과 끈기가 강한 기질',
      '체격이 좋고 식욕이 왕성한 경향',
      '간과 폐가 강하고 심장 관리가 필요',
    ],
    soeum: [
      `오행에서 수(水)·금(金)이 강하게 나타남`,
      '섬세하고 분석적인 에너지가 사주에 드러남',
      '내성적이지만 깊은 사고력의 소유자',
      '체격이 작고 소화기가 약한 경향',
      '신장이 강하고 비장·위장 관리가 필요',
    ],
  }

  return evidenceMap[constitution].map(e => `${name}: ${e}`)
}

/**
 * 전체 분석 한번에 수행
 */
export function analyzeProfile(birthDate: string, birthHour?: number) {
  const saju = calculateSaju(birthDate, birthHour)
  const balance = getElementBalance(saju)
  const health = getHealthProfile(balance)
  return { saju, balance, health }
}
