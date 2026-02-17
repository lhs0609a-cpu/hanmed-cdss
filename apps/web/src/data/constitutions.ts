/**
 * 사상체질 상세 정보
 * 태양인 / 태음인 / 소양인 / 소음인
 */
import type { ConstitutionType } from '@/lib/saju'

export interface ConstitutionInfo {
  type: ConstitutionType
  name: string
  nameHanja: string
  nickname: string
  emoji: string
  color: string
  bgColor: string
  gradientFrom: string
  gradientTo: string
  description: string
  personality: string[]
  strengths: string[]
  weaknesses: string[]
  strongOrgan: string
  weakOrgan: string
  goodFoods: string[]
  badFoods: string[]
  exercises: string[]
  healthTips: string[]
  compatibility: { best: ConstitutionType; good: ConstitutionType; caution: ConstitutionType }
  percentage: string // 인구 비율
  keywords: string[]
}

export const CONSTITUTIONS: Record<ConstitutionType, ConstitutionInfo> = {
  taeyang: {
    type: 'taeyang',
    name: '태양인',
    nameHanja: '太陽人',
    nickname: '불꽃 리더',
    emoji: '🌞',
    color: '#dc2626',
    bgColor: '#fef2f2',
    gradientFrom: '#ef4444',
    gradientTo: '#f97316',
    description:
      '태양인은 진취적이고 창의적인 리더형입니다. 강한 카리스마와 추진력으로 주변을 이끄는 타입이에요. 폐의 기운이 강하고 간의 기운이 약합니다.',
    personality: [
      '강한 카리스마와 리더십',
      '진취적이고 창의적',
      '자존심이 강하고 독립적',
      '결단력이 빠르고 추진력 있음',
      '남에게 지기 싫어하는 승부욕',
    ],
    strengths: ['리더십', '창의력', '추진력', '카리스마', '결단력'],
    weaknesses: ['고집', '독선적', '타인 의견 무시', '과욕'],
    strongOrgan: '폐(肺)',
    weakOrgan: '간(肝)',
    goodFoods: [
      '모과', '포도', '다래', '앵두', '감',
      '메밀', '냉면', '새우', '조개', '굴',
      '솔잎', '오가피',
    ],
    badFoods: [
      '맵고 뜨거운 음식', '기름진 음식', '인삼', '꿀',
      '땅콩', '잣',
    ],
    exercises: ['수영', '요가', '산책', '스트레칭', '태극권'],
    healthTips: [
      '간 기능 강화에 신경 쓸 것',
      '화를 다스리고 마음을 편안히',
      '시원한 음식이 체질에 맞음',
      '하체 운동을 꾸준히 할 것',
    ],
    compatibility: { best: 'soeum', good: 'taeeum', caution: 'soyang' },
    percentage: '약 5%',
    keywords: ['리더', '카리스마', '추진력', '독립적', '불꽃'],
  },

  taeeum: {
    type: 'taeeum',
    name: '태음인',
    nameHanja: '太陰人',
    nickname: '듬직한 산',
    emoji: '⛰️',
    color: '#ca8a04',
    bgColor: '#fefce8',
    gradientFrom: '#eab308',
    gradientTo: '#84cc16',
    description:
      '태음인은 인내심이 강하고 듬직한 노력형입니다. 끈기와 포용력으로 큰 일을 해내는 타입이에요. 간의 기운이 강하고 폐의 기운이 약합니다.',
    personality: [
      '듬직하고 포용력이 큼',
      '인내심과 끈기가 강함',
      '꼼꼼하고 계획적',
      '한번 시작하면 끝까지 밀어붙임',
      '겉으로는 무뚝뚝하지만 속정이 깊음',
    ],
    strengths: ['인내심', '끈기', '포용력', '실행력', '안정감'],
    weaknesses: ['우유부단', '게으름', '고집', '변화 거부'],
    strongOrgan: '간(肝)',
    weakOrgan: '폐(肺)',
    goodFoods: [
      '소고기', '콩', '밤', '호두', '은행',
      '무', '도라지', '율무', '들깨', '배',
      '잣', '녹두',
    ],
    badFoods: [
      '닭고기', '삼겹살', '맥주', '라면',
      '밀가루 음식', '계란 노른자',
    ],
    exercises: ['등산', '달리기', '웨이트', '줄넘기', '자전거'],
    healthTips: [
      '폐 건강과 호흡기 관리 중요',
      '땀을 많이 흘리는 운동이 좋음',
      '과식 주의, 체중 관리 필수',
      '규칙적인 운동 습관 만들기',
    ],
    compatibility: { best: 'soyang', good: 'taeyang', caution: 'soeum' },
    percentage: '약 40%',
    keywords: ['듬직', '인내', '끈기', '포용', '노력형'],
  },

  soyang: {
    type: 'soyang',
    name: '소양인',
    nameHanja: '少陽人',
    nickname: '열정 파이터',
    emoji: '⚡',
    color: '#059669',
    bgColor: '#ecfdf5',
    gradientFrom: '#10b981',
    gradientTo: '#06b6d4',
    description:
      '소양인은 활발하고 사교적인 행동파입니다. 순발력과 재치로 어디서든 분위기 메이커가 되는 타입이에요. 비장의 기운이 강하고 신장의 기운이 약합니다.',
    personality: [
      '밝고 활발한 성격',
      '사교적이고 친화력이 뛰어남',
      '순발력과 재치가 넘침',
      '정의감이 강하고 봉사정신이 있음',
      '급한 성격, 끈기가 부족할 수 있음',
    ],
    strengths: ['사교성', '순발력', '재치', '열정', '행동력'],
    weaknesses: ['성급함', '끈기 부족', '감정 기복', '산만'],
    strongOrgan: '비장(脾)',
    weakOrgan: '신장(腎)',
    goodFoods: [
      '보리', '팥', '녹두', '오이', '배추',
      '수박', '참외', '딸기', '해삼', '전복',
      '돼지고기', '굴',
    ],
    badFoods: [
      '닭고기', '인삼', '꿀', '고추',
      '마늘', '생강', '카레',
    ],
    exercises: ['수영', '산책', '요가', '필라테스', '볼링'],
    healthTips: [
      '신장 기능 강화에 신경 쓸 것',
      '찬 성질의 음식이 체질에 맞음',
      '과로를 피하고 충분히 쉬기',
      '명상으로 마음 안정시키기',
    ],
    compatibility: { best: 'taeeum', good: 'soeum', caution: 'taeyang' },
    percentage: '약 25%',
    keywords: ['활발', '사교적', '순발력', '열정', '행동파'],
  },

  soeum: {
    type: 'soeum',
    name: '소음인',
    nameHanja: '少陰人',
    nickname: '감성 분석가',
    emoji: '🌊',
    color: '#2563eb',
    bgColor: '#eff6ff',
    gradientFrom: '#3b82f6',
    gradientTo: '#8b5cf6',
    description:
      '소음인은 섬세하고 분석적인 감성파입니다. 깊은 사고력과 꼼꼼함으로 디테일에 강한 타입이에요. 신장의 기운이 강하고 비장의 기운이 약합니다.',
    personality: [
      '섬세하고 감성적',
      '분석력이 뛰어남',
      '꼼꼼하고 정리정돈을 잘함',
      '내성적이지만 친한 사람에게는 다정',
      '걱정이 많고 소심한 면이 있음',
    ],
    strengths: ['분석력', '섬세함', '성실함', '감수성', '꼼꼼함'],
    weaknesses: ['소심함', '걱정 과다', '내성적', '소화 불량'],
    strongOrgan: '신장(腎)',
    weakOrgan: '비장(脾)',
    goodFoods: [
      '인삼', '꿀', '대추', '생강', '계피',
      '닭고기', '양고기', '찹쌀', '감자',
      '시금치', '미역', '부추',
    ],
    badFoods: [
      '차가운 음식', '냉면', '수박', '빙과류',
      '보리', '팥', '돼지고기',
    ],
    exercises: ['산책', '가벼운 조깅', '스트레칭', '필라테스', '탁구'],
    healthTips: [
      '비장(소화기) 건강 관리 중요',
      '따뜻한 음식이 체질에 맞음',
      '스트레스 관리 필수',
      '과도한 걱정을 줄이는 연습',
    ],
    compatibility: { best: 'taeyang', good: 'soyang', caution: 'taeeum' },
    percentage: '약 30%',
    keywords: ['섬세', '감성', '분석적', '꼼꼼', '다정'],
  },
}

/** 체질 이름으로 빠른 조회 */
export function getConstitution(type: ConstitutionType): ConstitutionInfo {
  return CONSTITUTIONS[type]
}

/** 궁합 설명 */
export function getCompatibilityDescription(type1: ConstitutionType, type2: ConstitutionType): string {
  const c1 = CONSTITUTIONS[type1]
  const c2 = CONSTITUTIONS[type2]

  if (c1.compatibility.best === type2) {
    return `${c1.name}과 ${c2.name}은 최고의 궁합! 서로의 부족한 기운을 완벽하게 채워줘요.`
  }
  if (c1.compatibility.good === type2) {
    return `${c1.name}과 ${c2.name}은 좋은 궁합! 함께하면 좋은 시너지를 냅니다.`
  }
  if (c1.compatibility.caution === type2) {
    return `${c1.name}과 ${c2.name}은 보완이 필요한 궁합. 서로의 다름을 이해하면 성장할 수 있어요.`
  }
  return `${c1.name}과 ${c2.name}은 비슷한 기운을 가진 동질 궁합이에요.`
}

/** 궁합 재미 포인트 */
export function getCompatibilityFunPoints(type1: ConstitutionType, type2: ConstitutionType): string[] {
  const points: string[] = []
  const c1 = CONSTITUTIONS[type1]
  const c2 = CONSTITUTIONS[type2]

  // 에어컨 전쟁
  if (
    (type1 === 'taeyang' || type1 === 'soyang') &&
    (type2 === 'soeum')
  ) {
    points.push('🌡️ 에어컨 전쟁 발생 확률 99%! 한 쪽은 덥고 한 쪽은 추워요')
  }

  // 식성 궁합
  if (c1.goodFoods.some(f => c2.badFoods.includes(f))) {
    points.push('🍽️ 식당 고를 때 의견 충돌 주의! 좋아하는 음식이 서로 다를 수 있어요')
  }

  // 운동 궁합
  const commonExercise = c1.exercises.filter(e => c2.exercises.includes(e))
  if (commonExercise.length > 0) {
    points.push(`🏃 함께 할 수 있는 운동: ${commonExercise.slice(0, 2).join(', ')}`)
  }

  // 성격 궁합
  if (
    (type1 === 'taeyang' && type2 === 'soeum') ||
    (type1 === 'soeum' && type2 === 'taeyang')
  ) {
    points.push('🎭 불꽃 리더 × 감성 분석가 = 완벽한 팀! 추진력과 섬세함의 조합')
  }
  if (
    (type1 === 'taeeum' && type2 === 'soyang') ||
    (type1 === 'soyang' && type2 === 'taeeum')
  ) {
    points.push('🎯 듬직한 산 × 열정 파이터 = 안정과 활력의 밸런스!')
  }

  // 여행 스타일
  if (type1 === 'soyang' || type2 === 'soyang') {
    points.push('✈️ 여행 가면 소양인이 일정을 주도할 확률 높음')
  }
  if (type1 === 'taeeum' || type2 === 'taeeum') {
    points.push('🍖 여행 가면 태음인이 맛집을 찾아낼 확률 높음')
  }

  return points.slice(0, 5)
}
