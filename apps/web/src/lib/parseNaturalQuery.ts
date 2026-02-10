/**
 * 자연어 입력 파싱 유틸리티
 * "두통 소화불량 65세 여" → { age: 65, gender: 'female', symptoms: ['두통', '소화불량'] }
 */

export interface ParsedQuery {
  age?: number
  gender?: 'male' | 'female'
  constitution?: string
  symptoms: string[]
  raw: string
}

const GENDER_MAP: Record<string, 'male' | 'female'> = {
  '남': 'male',
  '남성': 'male',
  '남자': 'male',
  '여': 'female',
  '여성': 'female',
  '여자': 'female',
  'M': 'male',
  'F': 'female',
}

const CONSTITUTIONS = ['태양인', '태음인', '소양인', '소음인']

// 알려진 증상 목록 (자동완성 및 파싱용)
const KNOWN_SYMPTOMS = [
  '두통', '어지러움', '피로', '수면장애', '식욕부진', '소화불량',
  '복통', '설사', '변비', '구역', '오한', '발열', '기침', '가래',
  '호흡곤란', '심계', '흉통', '요통', '관절통', '부종', '자한', '도한',
  '불면', '불면증', '냉증', '수족냉증', '하체냉증', '상열감', '상열하한',
  '식체', '더부룩', '트림', '구토', '오심', '메스꺼움',
  '빈뇨', '야뇨', '월경통', '생리불순', '대하',
  '이명', '눈충혈', '안구건조', '코막힘', '비염', '인후통',
  '피부발진', '가려움', '습진', '두드러기',
  '근육통', '어깨통', '목통', '무릎통', '손발저림',
  '긴장', '불안', '우울', '스트레스', '짜증',
]

export function parseNaturalQuery(input: string): ParsedQuery {
  const raw = input.trim()
  if (!raw) return { symptoms: [], raw }

  let remaining = raw
  let age: number | undefined
  let gender: 'male' | 'female' | undefined
  let constitution: string | undefined

  // 1. 나이 추출: "65세", "65살", "만 65세"
  const ageMatch = remaining.match(/만?\s*(\d{1,3})\s*(세|살)/)
  if (ageMatch) {
    age = parseInt(ageMatch[1], 10)
    if (age > 0 && age <= 150) {
      remaining = remaining.replace(ageMatch[0], ' ')
    } else {
      age = undefined
    }
  }

  // 2. 성별 추출
  for (const [keyword, value] of Object.entries(GENDER_MAP)) {
    // 단어 경계 체크 (한글은 공백/시작/끝 기준)
    const regex = new RegExp(`(^|\\s)${keyword}($|\\s)`)
    if (regex.test(remaining)) {
      gender = value
      remaining = remaining.replace(regex, ' ')
      break
    }
  }

  // 3. 체질 추출
  for (const c of CONSTITUTIONS) {
    if (remaining.includes(c)) {
      constitution = c
      remaining = remaining.replace(c, ' ')
      break
    }
  }

  // 4. 나머지를 증상으로 파싱
  // 공백, 쉼표, "+" 등으로 분리
  const tokens = remaining
    .split(/[\s,+·、]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0)

  const symptoms: string[] = []
  for (const token of tokens) {
    // 숫자만 있는 토큰은 무시 (이미 나이로 처리됨)
    if (/^\d+$/.test(token)) continue
    // 빈 토큰 무시
    if (!token) continue
    symptoms.push(token)
  }

  return { age, gender, constitution, symptoms, raw }
}

export function getGenderLabel(gender: 'male' | 'female'): string {
  return gender === 'male' ? '남성' : '여성'
}

export function formatParsedQuery(parsed: ParsedQuery): string {
  const parts: string[] = []
  if (parsed.symptoms.length > 0) parts.push(`증상: ${parsed.symptoms.join(', ')}`)
  if (parsed.age) parts.push(`${parsed.age}세`)
  if (parsed.gender) parts.push(getGenderLabel(parsed.gender))
  if (parsed.constitution) parts.push(parsed.constitution)
  return parts.join(' / ')
}

export { KNOWN_SYMPTOMS }
