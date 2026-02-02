import { useState } from 'react'
import {
  User,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Heart,
  Utensils,
  AlertTriangle,
  Activity,
  RefreshCw,
  BarChart3,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Question {
  id: number
  category: string
  categoryWeight: number // 카테고리별 가중치
  question: string
  options: Array<{
    text: string
    scores: { taeyang: number; taeeum: number; soyang: number; soeum: number }
  }>
}

interface ConstitutionScores {
  taeyang: number
  taeeum: number
  soyang: number
  soeum: number
}

interface ConstitutionResult {
  type: 'taeyang' | 'taeeum' | 'soyang' | 'soeum'
  name: string
  hanja: string
  percentage: number
  allPercentages: ConstitutionScores
  confidence: 'high' | 'medium' | 'low'
  secondaryType?: {
    type: string
    name: string
    percentage: number
  }
  description: string
  bodyType: string
  personality: string
  strengths: string[]
  weaknesses: string[]
  recommendedFoods: string[]
  avoidFoods: string[]
  recommendedHerbs: string[]
  healthTips: string[]
}

// 카테고리별 가중치 (사상의학 문헌 기반)
const CATEGORY_WEIGHTS = {
  체형: 2.0,      // 가장 중요한 진단 기준
  용모: 1.8,      // 얼굴형, 눈매 등
  성격: 1.3,      // 심성
  소화: 1.4,      // 비위 기능
  대변: 1.2,
  한열: 1.3,      // 추위/더위, 땀
  수면: 1.0,
  스트레스: 1.0,
  음성: 1.2,      // 목소리 특성
  피부: 1.1,
}

// 확장된 질문 (24개)
const questions: Question[] = [
  // ===== 체형 (가중치 2.0) =====
  {
    id: 1,
    category: '체형',
    categoryWeight: CATEGORY_WEIGHTS.체형,
    question: '전체적인 체형은 어떤 편인가요?',
    options: [
      { text: '상체가 발달하고 하체가 약한 역삼각형', scores: { taeyang: 4, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '전체적으로 체격이 크고 튼튼한 편', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '가슴이 좁고 엉덩이/하체가 발달', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 1 } },
      { text: '전체적으로 마르고 체격이 작은 편', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 2,
    category: '체형',
    categoryWeight: CATEGORY_WEIGHTS.체형,
    question: '목과 어깨 부위는 어떤가요?',
    options: [
      { text: '목덜미가 굵고 발달, 어깨가 넓다', scores: { taeyang: 4, taeeum: 1, soyang: 0, soeum: 0 } },
      { text: '목이 짧고 굵으며 어깨가 벌어짐', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '목이 가늘고 긴 편, 어깨가 좁다', scores: { taeyang: 1, taeeum: 0, soyang: 1, soeum: 4 } },
      { text: '목이 길고 어깨가 처져 보임', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 1 } },
    ],
  },
  {
    id: 3,
    category: '체형',
    categoryWeight: CATEGORY_WEIGHTS.체형,
    question: '허리와 엉덩이 부위는 어떤가요?',
    options: [
      { text: '허리가 약하고 하체가 빈약한 편', scores: { taeyang: 4, taeeum: 0, soyang: 0, soeum: 1 } },
      { text: '허리 주위가 발달하고 배가 나옴', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '허리가 가늘고 엉덩이가 발달', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '허리와 엉덩이 모두 작은 편', scores: { taeyang: 0, taeeum: 0, soyang: 1, soeum: 4 } },
    ],
  },
  // ===== 용모 (가중치 1.8) =====
  {
    id: 4,
    category: '용모',
    categoryWeight: CATEGORY_WEIGHTS.용모,
    question: '얼굴형은 어떤 편인가요?',
    options: [
      { text: '이마가 넓고 턱이 좁은 역삼각형', scores: { taeyang: 4, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '둥글고 넓적한 편, 턱이 발달', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '광대뼈가 나오고 턱이 뾰족한 편', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 1 } },
      { text: '갸름하고 작은 편, 턱이 뾰족', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 5,
    category: '용모',
    categoryWeight: CATEGORY_WEIGHTS.용모,
    question: '눈매는 어떤 편인가요?',
    options: [
      { text: '눈이 크고 빛나며 날카로운 인상', scores: { taeyang: 4, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '눈이 작고 눈꼬리가 처진 편', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '눈이 크고 또렷하며 활기찬 인상', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '눈이 작고 그윽하며 부드러운 인상', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 6,
    category: '용모',
    categoryWeight: CATEGORY_WEIGHTS.용모,
    question: '입술과 입의 형태는?',
    options: [
      { text: '입이 크고 입술이 얇은 편', scores: { taeyang: 4, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '입이 크고 입술이 두꺼운 편', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '입이 작고 입술이 얇은 편', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 1 } },
      { text: '입이 작고 앙다문 듯한 인상', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  // ===== 성격 (가중치 1.3) =====
  {
    id: 7,
    category: '성격',
    categoryWeight: CATEGORY_WEIGHTS.성격,
    question: '본인의 기본 성격은 어떤 편인가요?',
    options: [
      { text: '진취적이고 창의적, 영웅심이 강하다', scores: { taeyang: 4, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '침착하고 꾸준하며 신중하다', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 1 } },
      { text: '활발하고 외향적, 봉사정신이 강하다', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '내성적이고 섬세하며 계획적이다', scores: { taeyang: 0, taeeum: 1, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 8,
    category: '성격',
    categoryWeight: CATEGORY_WEIGHTS.성격,
    question: '새로운 일을 시작할 때 어떤가요?',
    options: [
      { text: '과감하게 시작, 결과보다 시작이 중요', scores: { taeyang: 4, taeeum: 0, soyang: 2, soeum: 0 } },
      { text: '충분히 검토 후 신중하게 시작', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 1 } },
      { text: '일단 시작하고 중간에 방향 수정', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '여러 번 고민, 완벽한 준비 후 시작', scores: { taeyang: 0, taeeum: 1, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 9,
    category: '성격',
    categoryWeight: CATEGORY_WEIGHTS.성격,
    question: '대인관계에서 본인은?',
    options: [
      { text: '독립적이고 자기 주관이 뚜렷하다', scores: { taeyang: 4, taeeum: 1, soyang: 0, soeum: 0 } },
      { text: '무던하고 포용력이 있다', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '사교적이고 정이 많다', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '조용하고 소수의 깊은 관계를 선호', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  // ===== 소화 (가중치 1.4) =====
  {
    id: 10,
    category: '소화',
    categoryWeight: CATEGORY_WEIGHTS.소화,
    question: '평소 식사량과 소화력은?',
    options: [
      { text: '적게 먹어도 되고 소화가 잘 된다', scores: { taeyang: 4, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '많이 먹고 소화도 잘 되는 편', scores: { taeyang: 0, taeeum: 4, soyang: 1, soeum: 0 } },
      { text: '많이 먹지만 금방 배가 고프다', scores: { taeyang: 0, taeeum: 1, soyang: 4, soeum: 0 } },
      { text: '적게 먹고 소화가 잘 안되는 편', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 11,
    category: '소화',
    categoryWeight: CATEGORY_WEIGHTS.소화,
    question: '식사 후 주로 느끼는 증상은?',
    options: [
      { text: '별다른 불편함 없이 가볍다', scores: { taeyang: 3, taeeum: 2, soyang: 1, soeum: 0 } },
      { text: '포만감이 오래 가고 더부룩하다', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 1 } },
      { text: '금방 배가 고프고 속이 쓰릴 때 있음', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '체하기 쉽고 소화가 느리다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 12,
    category: '소화',
    categoryWeight: CATEGORY_WEIGHTS.소화,
    question: '음식 기호는 어떤 편인가요?',
    options: [
      { text: '시원하고 담백한 음식을 좋아함', scores: { taeyang: 4, taeeum: 0, soyang: 2, soeum: 0 } },
      { text: '기름진 고기류를 좋아함', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '찬 음식, 생채소를 좋아함', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '따뜻한 음식, 익힌 음식을 좋아함', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  // ===== 대변 (가중치 1.2) =====
  {
    id: 13,
    category: '대변',
    categoryWeight: CATEGORY_WEIGHTS.대변,
    question: '평소 대변 상태는?',
    options: [
      { text: '변비 있어도 크게 불편하지 않다', scores: { taeyang: 4, taeeum: 1, soyang: 0, soeum: 0 } },
      { text: '변비 경향, 대변이 굵고 단단하다', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '대변이 시원하고 약간 무른 편', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 1 } },
      { text: '무른 변이나 설사가 잦다', scores: { taeyang: 0, taeeum: 0, soyang: 1, soeum: 4 } },
    ],
  },
  {
    id: 14,
    category: '대변',
    categoryWeight: CATEGORY_WEIGHTS.대변,
    question: '배변 횟수는 하루에?',
    options: [
      { text: '1회 이하, 2-3일에 한 번도 괜찮음', scores: { taeyang: 3, taeeum: 3, soyang: 0, soeum: 0 } },
      { text: '1회, 규칙적인 편', scores: { taeyang: 1, taeeum: 2, soyang: 2, soeum: 1 } },
      { text: '1-2회, 시원하게 보는 편', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '2회 이상, 자주 화장실 감', scores: { taeyang: 0, taeeum: 0, soyang: 1, soeum: 4 } },
    ],
  },
  // ===== 한열/땀 (가중치 1.3) =====
  {
    id: 15,
    category: '한열',
    categoryWeight: CATEGORY_WEIGHTS.한열,
    question: '추위와 더위 중 어느 것에 약한가요?',
    options: [
      { text: '더위를 많이 타고 서늘한 것을 좋아함', scores: { taeyang: 4, taeeum: 2, soyang: 1, soeum: 0 } },
      { text: '더위를 많이 타지만 추위도 싫다', scores: { taeyang: 0, taeeum: 4, soyang: 1, soeum: 0 } },
      { text: '더위를 많이 타고 냉한 음식 선호', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '추위를 많이 타고 따뜻한 것 선호', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 16,
    category: '한열',
    categoryWeight: CATEGORY_WEIGHTS.한열,
    question: '땀은 어느 정도 흘리나요?',
    options: [
      { text: '땀이 많고 항상 더운 편', scores: { taeyang: 4, taeeum: 1, soyang: 1, soeum: 0 } },
      { text: '땀이 많고 조금만 움직여도 흘림', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '상체나 머리에 땀이 많다', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '땀을 잘 흘리지 않는다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 17,
    category: '한열',
    categoryWeight: CATEGORY_WEIGHTS.한열,
    question: '손발의 온도는?',
    options: [
      { text: '손발이 항상 따뜻하고 열감이 있음', scores: { taeyang: 4, taeeum: 1, soyang: 1, soeum: 0 } },
      { text: '손발은 따뜻한 편', scores: { taeyang: 1, taeeum: 4, soyang: 1, soeum: 0 } },
      { text: '손은 따뜻하고 발은 차가운 편', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '손발이 차갑고 냉하다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  // ===== 수면 (가중치 1.0) =====
  {
    id: 18,
    category: '수면',
    categoryWeight: CATEGORY_WEIGHTS.수면,
    question: '수면 상태는 어떤가요?',
    options: [
      { text: '잠이 적어도 개운하고 활력이 있다', scores: { taeyang: 4, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '잠이 많고 깊이 잔다', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '잠들기 어렵고 꿈이 많다', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 1 } },
      { text: '잠이 얕고 자주 깬다', scores: { taeyang: 0, taeeum: 0, soyang: 1, soeum: 4 } },
    ],
  },
  // ===== 스트레스 (가중치 1.0) =====
  {
    id: 19,
    category: '스트레스',
    categoryWeight: CATEGORY_WEIGHTS.스트레스,
    question: '스트레스를 받으면 주로 나타나는 증상은?',
    options: [
      { text: '화가 치밀고 머리가 아프다', scores: { taeyang: 4, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '가슴이 답답하고 한숨이 나온다', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 1 } },
      { text: '가슴이 두근거리고 열이 오른다', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '소화가 안되고 불안하다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 20,
    category: '스트레스',
    categoryWeight: CATEGORY_WEIGHTS.스트레스,
    question: '화가 나면 어떻게 표현하나요?',
    options: [
      { text: '바로 표출하고 직접적으로 표현', scores: { taeyang: 4, taeeum: 0, soyang: 2, soeum: 0 } },
      { text: '속으로 삭이고 참는 편', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 1 } },
      { text: '얼굴이 붉어지고 흥분하는 편', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '말수가 줄고 우울해지는 편', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  // ===== 음성 (가중치 1.2) =====
  {
    id: 21,
    category: '음성',
    categoryWeight: CATEGORY_WEIGHTS.음성,
    question: '목소리는 어떤 편인가요?',
    options: [
      { text: '목소리가 크고 우렁차다', scores: { taeyang: 4, taeeum: 1, soyang: 1, soeum: 0 } },
      { text: '목소리가 굵고 낮은 편', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '목소리가 밝고 높은 편', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '목소리가 가늘고 작은 편', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 22,
    category: '음성',
    categoryWeight: CATEGORY_WEIGHTS.음성,
    question: '말하는 속도와 스타일은?',
    options: [
      { text: '빠르고 단호하게 말한다', scores: { taeyang: 4, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '느리고 차분하게 말한다', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 1 } },
      { text: '빠르고 표현이 풍부하다', scores: { taeyang: 1, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '조용하고 말수가 적다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  // ===== 피부 (가중치 1.1) =====
  {
    id: 23,
    category: '피부',
    categoryWeight: CATEGORY_WEIGHTS.피부,
    question: '피부 상태는 어떤가요?',
    options: [
      { text: '피부가 거칠고 윤기가 없는 편', scores: { taeyang: 4, taeeum: 0, soyang: 0, soeum: 1 } },
      { text: '피부가 두껍고 땀구멍이 크다', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '피부가 매끄럽고 탄력이 있다', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 1 } },
      { text: '피부가 희고 차가우며 건조하다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
  {
    id: 24,
    category: '피부',
    categoryWeight: CATEGORY_WEIGHTS.피부,
    question: '피부에 자주 나타나는 문제는?',
    options: [
      { text: '여드름이나 뾰루지가 잘 난다', scores: { taeyang: 4, taeeum: 1, soyang: 1, soeum: 0 } },
      { text: '습진이나 가려움이 있다', scores: { taeyang: 0, taeeum: 4, soyang: 0, soeum: 0 } },
      { text: '열꽃이나 두드러기가 난다', scores: { taeyang: 0, taeeum: 0, soyang: 4, soeum: 0 } },
      { text: '건조하고 각질이 많다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 4 } },
    ],
  },
]

const constitutionData: Record<string, Omit<ConstitutionResult, 'percentage' | 'allPercentages' | 'confidence' | 'secondaryType'>> = {
  taeyang: {
    type: 'taeyang',
    name: '태양인',
    hanja: '太陽人',
    description: '폐대간소(肺大肝小)의 체질로, 상체가 발달하고 하체가 약합니다. 창의적이고 진취적인 성격으로 리더십이 뛰어나지만, 독선적일 수 있어 주의가 필요합니다.',
    bodyType: '상체 발달, 하체 빈약, 머리가 크고 목덜미가 굵음, 역삼각형 체형',
    personality: '창의적, 진취적, 영웅심, 과단성, 독창적, 독립심 강함',
    strengths: ['창의력이 뛰어남', '리더십이 강함', '결단력이 있음', '진취적 성향', '자기 주관이 뚜렷함'],
    weaknesses: ['독선적일 수 있음', '하체 질환에 약함', '간 기능이 약함', '분노 조절 필요', '급한 성격'],
    recommendedFoods: ['메밀', '냉면', '새우', '조개류', '게', '해삼', '포도', '앵두', '다래', '모과', '머루', '송화'],
    avoidFoods: ['맵고 자극적인 음식', '고열량 육류', '술', '커피', '인삼', '꿀', '마늘'],
    recommendedHerbs: ['오가피', '모과', '다래', '앵두', '포도근', '미후도', '솔잎'],
    healthTips: ['하체 운동을 꾸준히 할 것', '분노 조절에 신경 쓸 것', '시원한 음식 위주로 섭취', '과로를 피할 것', '간 건강에 유의'],
  },
  taeeum: {
    type: 'taeeum',
    name: '태음인',
    hanja: '太陰人',
    description: '간대폐소(肝大肺小)의 체질로, 체격이 크고 튼튼합니다. 침착하고 신중한 성격으로 끈기가 있으나, 게으름과 비만에 주의해야 합니다.',
    bodyType: '체격이 크고 건장, 허리 부위 발달, 땀이 많음, 목이 짧고 굵음',
    personality: '침착, 신중, 꾸준함, 인내심, 포용력, 무던함',
    strengths: ['끈기가 있음', '체력이 좋음', '신중한 판단', '포용력이 큼', '믿음직함'],
    weaknesses: ['비만 경향', '호흡기 질환에 약함', '게으름 주의', '순환 장애 주의', '변비 경향'],
    recommendedFoods: ['소고기', '밤', '잣', '호두', '은행', '무', '도라지', '더덕', '콩나물', '율무', '연근', '마'],
    avoidFoods: ['닭고기', '돼지고기', '계란', '우유', '밀가루', '기름진 음식', '맥주'],
    recommendedHerbs: ['녹용', '갈근', '길경', '맥문동', '오미자', '황기', '녹각', '의이인'],
    healthTips: ['규칙적인 유산소 운동', '과식을 피할 것', '땀을 적당히 흘릴 것', '호흡기 관리에 신경 쓸 것', '체중 관리 필수'],
  },
  soyang: {
    type: 'soyang',
    name: '소양인',
    hanja: '少陽人',
    description: '비대신소(脾大腎小)의 체질로, 상체보다 하체가 발달했습니다. 활발하고 외향적인 성격으로 봉사정신이 강하나, 조급함에 주의해야 합니다.',
    bodyType: '상체 빈약, 하체 발달, 가슴이 좁고 엉덩이가 큼, 걸음이 빠름',
    personality: '활발, 외향적, 봉사정신, 정의감, 솔직함, 재빠름',
    strengths: ['활동적임', '봉사정신이 강함', '정의로움', '사교적임', '판단이 빠름'],
    weaknesses: ['경솔할 수 있음', '신장 기능 약함', '조급함 주의', '하초 냉증 주의', '끈기 부족'],
    recommendedFoods: ['돼지고기', '오리고기', '해물', '굴', '전복', '오이', '배추', '수박', '참외', '보리', '녹두', '팥'],
    avoidFoods: ['닭고기', '개고기', '인삼', '꿀', '마늘', '고추', '생강', '자극적 음식', '술'],
    recommendedHerbs: ['숙지황', '산수유', '구기자', '복분자', '택사', '지모', '황백', '지골피'],
    healthTips: ['성급함을 자제할 것', '신장 기능 관리', '시원한 음식 섭취', '과격한 운동 피하기', '명상과 휴식 필요'],
  },
  soeum: {
    type: 'soeum',
    name: '소음인',
    hanja: '少陰人',
    description: '신대비소(腎大脾小)의 체질로, 체격이 작고 마른 편입니다. 내성적이고 섬세한 성격으로 계획적이나, 소화기 관리에 특별히 신경써야 합니다.',
    bodyType: '체격이 작고 마름, 상하체 균형, 손발이 차가움, 어깨가 좁음',
    personality: '내성적, 섬세함, 계획적, 꼼꼼함, 분석적, 신중함',
    strengths: ['섬세함', '계획적', '분석력 뛰어남', '꼼꼼함', '차분함'],
    weaknesses: ['소화기 약함', '추위에 약함', '소심함 주의', '체력이 약함', '걱정이 많음'],
    recommendedFoods: ['닭고기', '염소고기', '찹쌀', '감자', '시금치', '양배추', '사과', '귤', '대추', '생강', '파', '마늘'],
    avoidFoods: ['돼지고기', '오리고기', '밀가루', '냉면', '참외', '수박', '냉한 음식', '차가운 음료'],
    recommendedHerbs: ['인삼', '황기', '당귀', '천궁', '백출', '건강', '부자', '육계', '반하'],
    healthTips: ['따뜻한 음식 섭취', '과로를 피할 것', '규칙적인 식사', '복부 보온에 신경 쓸 것', '소화기 건강 관리'],
  },
}

const constitutionNames: Record<string, string> = {
  taeyang: '태양인',
  taeeum: '태음인',
  soyang: '소양인',
  soeum: '소음인',
}

export default function ConstitutionPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<ConstitutionResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  const handleAnswer = (questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  const calculateResult = () => {
    // 가중치 적용된 점수 계산
    const scores: ConstitutionScores = { taeyang: 0, taeeum: 0, soyang: 0, soeum: 0 }

    Object.entries(answers).forEach(([questionId, optionIndex]) => {
      const question = questions.find((q) => q.id === parseInt(questionId))
      if (question) {
        const option = question.options[optionIndex]
        const weight = question.categoryWeight

        scores.taeyang += option.scores.taeyang * weight
        scores.taeeum += option.scores.taeeum * weight
        scores.soyang += option.scores.soyang * weight
        scores.soeum += option.scores.soeum * weight
      }
    })

    // 총점 및 퍼센티지 계산
    const total = scores.taeyang + scores.taeeum + scores.soyang + scores.soeum
    const percentages: ConstitutionScores = {
      taeyang: Math.round((scores.taeyang / total) * 100),
      taeeum: Math.round((scores.taeeum / total) * 100),
      soyang: Math.round((scores.soyang / total) * 100),
      soeum: Math.round((scores.soeum / total) * 100),
    }

    // 정렬하여 1위, 2위 결정
    const sorted = Object.entries(percentages).sort((a, b) => b[1] - a[1])
    const maxType = sorted[0][0] as keyof ConstitutionScores
    const maxPercentage = sorted[0][1]
    const secondType = sorted[1][0] as keyof ConstitutionScores
    const secondPercentage = sorted[1][1]

    // 신뢰도 계산 (1위와 2위 차이 기반)
    const gap = maxPercentage - secondPercentage
    let confidence: 'high' | 'medium' | 'low'
    if (gap >= 15) {
      confidence = 'high'
    } else if (gap >= 8) {
      confidence = 'medium'
    } else {
      confidence = 'low'
    }

    const constitutionInfo = constitutionData[maxType]
    setResult({
      ...constitutionInfo,
      percentage: maxPercentage,
      allPercentages: percentages,
      confidence,
      secondaryType: secondPercentage >= 20 ? {
        type: secondType,
        name: constitutionNames[secondType],
        percentage: secondPercentage,
      } : undefined,
    })
    setShowResult(true)
  }

  const resetQuiz = () => {
    setCurrentStep(0)
    setAnswers({})
    setResult(null)
    setShowResult(false)
  }

  const currentQuestion = questions[currentStep]
  const progress = ((currentStep + 1) / questions.length) * 100

  if (showResult && result) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30 mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">체질 진단 결과</h1>
          <p className="text-gray-500 mt-1">가중치 기반 분석 결과입니다</p>
        </div>

        {/* 확률 분포 차트 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            체질 확률 분포
          </h3>
          <div className="space-y-3">
            {Object.entries(result.allPercentages)
              .sort((a, b) => b[1] - a[1])
              .map(([type, percentage]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium text-gray-700">
                    {constitutionNames[type]}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        type === result.type
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                          : 'bg-gray-300'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className={cn(
                    'w-12 text-sm font-bold text-right',
                    type === result.type ? 'text-purple-600' : 'text-gray-500'
                  )}>
                    {percentage}%
                  </span>
                </div>
              ))}
          </div>

          {/* 신뢰도 및 복합체질 안내 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-600">
                <p className="mb-1">
                  <span className="font-medium">진단 신뢰도: </span>
                  <span className={cn(
                    'font-bold',
                    result.confidence === 'high' ? 'text-green-600' :
                    result.confidence === 'medium' ? 'text-amber-600' : 'text-red-600'
                  )}>
                    {result.confidence === 'high' ? '높음' :
                     result.confidence === 'medium' ? '보통' : '낮음'}
                  </span>
                </p>
                {result.secondaryType && (
                  <p className="text-amber-700">
                    <span className="font-medium">{result.secondaryType.name}</span> 성향도
                    <span className="font-bold"> {result.secondaryType.percentage}%</span>로 나타나
                    복합체질 가능성이 있습니다. 한의사 상담을 권장합니다.
                  </p>
                )}
                {result.confidence === 'low' && (
                  <p className="text-red-600 mt-1">
                    체질 구분이 명확하지 않습니다. 전문 한의사의 맥진 및 설진을 통한 정밀 진단을 권장합니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              주 체질 일치도 {result.percentage}%
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              {result.name} <span className="text-2xl text-gray-500">{result.hanja}</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{result.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 체형 */}
            <div className="p-5 bg-blue-50 rounded-xl">
              <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <User className="h-5 w-5" />
                체형 특징
              </h3>
              <p className="text-blue-700 text-sm">{result.bodyType}</p>
            </div>

            {/* 성격 */}
            <div className="p-5 bg-purple-50 rounded-xl">
              <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                <Heart className="h-5 w-5" />
                성격 특징
              </h3>
              <p className="text-purple-700 text-sm">{result.personality}</p>
            </div>

            {/* 장점 */}
            <div className="p-5 bg-green-50 rounded-xl">
              <h3 className="font-bold text-green-900 mb-2">강점</h3>
              <ul className="space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-green-700 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* 약점 */}
            <div className="p-5 bg-amber-50 rounded-xl">
              <h3 className="font-bold text-amber-900 mb-2">주의할 점</h3>
              <ul className="space-y-1">
                {result.weaknesses.map((w, i) => (
                  <li key={i} className="text-amber-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 음식 추천 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Utensils className="h-5 w-5 text-orange-500" />
            음식 가이드
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="font-medium text-green-900 mb-2">권장 음식</p>
              <div className="flex flex-wrap gap-2">
                {result.recommendedFoods.map((food, i) => (
                  <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg">
                    {food}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <p className="font-medium text-red-900 mb-2">피해야 할 음식</p>
              <div className="flex flex-wrap gap-2">
                {result.avoidFoods.map((food, i) => (
                  <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-lg">
                    {food}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 추천 한약재 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-500" />
            체질에 맞는 한약재
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.recommendedHerbs.map((herb, i) => (
              <span key={i} className="px-3 py-2 bg-teal-50 text-teal-700 text-sm font-medium rounded-xl">
                {herb}
              </span>
            ))}
          </div>
        </div>

        {/* 건강 팁 */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
          <h3 className="font-bold text-indigo-900 mb-4">건강 관리 팁</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.healthTips.map((tip, i) => (
              <div key={i} className="flex items-center gap-2 text-indigo-700">
                <CheckCircle2 className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                <span className="text-sm">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 다시 하기 */}
        <div className="text-center">
          <button
            onClick={resetQuiz}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            다시 진단하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="h-7 w-7 text-purple-500" />
          사상체질 진단
        </h1>
        <p className="mt-1 text-gray-500">
          {questions.length}가지 질문으로 나의 체질을 알아보세요 (가중치 적용)
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            질문 {currentStep + 1} / {questions.length}
          </span>
          <span className="text-sm font-medium text-purple-600">
            {Math.round(progress)}% 완료
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            {currentQuestion.category}
          </span>
          <span className="text-xs text-gray-400">
            가중치 x{currentQuestion.categoryWeight}
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(currentQuestion.id, index)}
              className={cn(
                'w-full p-4 text-left rounded-xl border-2 transition-all',
                answers[currentQuestion.id] === index
                  ? 'border-purple-500 bg-purple-50 text-purple-900'
                  : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    answers[currentQuestion.id] === index
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-gray-300'
                  )}
                >
                  {answers[currentQuestion.id] === index && (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  )}
                </div>
                <span className="font-medium">{option.text}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
          이전
        </button>

        {currentStep < questions.length - 1 ? (
          <button
            onClick={() => setCurrentStep((prev) => prev + 1)}
            disabled={answers[currentQuestion.id] === undefined}
            className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={calculateResult}
            disabled={Object.keys(answers).length < questions.length}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Sparkles className="h-5 w-5" />
            결과 확인
          </button>
        )}
      </div>
    </div>
  )
}
