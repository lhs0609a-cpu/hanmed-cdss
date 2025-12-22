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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PageGuide from '@/components/common/PageGuide'

interface Question {
  id: number
  category: string
  question: string
  options: Array<{
    text: string
    scores: { taeyang: number; taeeum: number; soyang: number; soeum: number }
  }>
}

interface ConstitutionResult {
  type: 'taeyang' | 'taeeum' | 'soyang' | 'soeum'
  name: string
  hanja: string
  percentage: number
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

const questions: Question[] = [
  {
    id: 1,
    category: '체형',
    question: '본인의 체형은 어떤 편인가요?',
    options: [
      { text: '상체가 발달하고 하체가 약한 편', scores: { taeyang: 3, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '전체적으로 체격이 크고 튼튼한 편', scores: { taeyang: 0, taeeum: 3, soyang: 0, soeum: 0 } },
      { text: '상체보다 하체가 발달한 편', scores: { taeyang: 0, taeeum: 1, soyang: 3, soeum: 0 } },
      { text: '마르고 체격이 작은 편', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 3 } },
    ],
  },
  {
    id: 2,
    category: '체형',
    question: '목과 어깨 부위는 어떤가요?',
    options: [
      { text: '목이 굵고 어깨가 넓다', scores: { taeyang: 2, taeeum: 2, soyang: 0, soeum: 0 } },
      { text: '목이 짧고 어깨가 넓다', scores: { taeyang: 0, taeeum: 3, soyang: 1, soeum: 0 } },
      { text: '목이 가늘고 어깨가 좁다', scores: { taeyang: 1, taeeum: 0, soyang: 0, soeum: 3 } },
      { text: '목이 길고 어깨가 처진 편', scores: { taeyang: 0, taeeum: 0, soyang: 2, soeum: 2 } },
    ],
  },
  {
    id: 3,
    category: '성격',
    question: '본인의 성격은 어떤 편인가요?',
    options: [
      { text: '진취적이고 창의적이며 영웅심이 강하다', scores: { taeyang: 3, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '침착하고 꾸준하며 신중하다', scores: { taeyang: 0, taeeum: 3, soyang: 0, soeum: 1 } },
      { text: '활발하고 외향적이며 봉사정신이 강하다', scores: { taeyang: 1, taeeum: 0, soyang: 3, soeum: 0 } },
      { text: '내성적이고 섬세하며 계획적이다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 3 } },
    ],
  },
  {
    id: 4,
    category: '성격',
    question: '새로운 일을 시작할 때 어떤가요?',
    options: [
      { text: '과감하게 시작하고 빠르게 결정한다', scores: { taeyang: 3, taeeum: 0, soyang: 2, soeum: 0 } },
      { text: '충분히 검토 후 신중하게 시작한다', scores: { taeyang: 0, taeeum: 3, soyang: 0, soeum: 1 } },
      { text: '일단 시작하고 중간에 계획을 수정한다', scores: { taeyang: 1, taeeum: 0, soyang: 3, soeum: 0 } },
      { text: '여러 번 고민하고 준비가 완벽해야 시작', scores: { taeyang: 0, taeeum: 1, soyang: 0, soeum: 3 } },
    ],
  },
  {
    id: 5,
    category: '소화',
    question: '식사량과 소화력은 어떤가요?',
    options: [
      { text: '적게 먹어도 되고 소화가 잘 된다', scores: { taeyang: 3, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '많이 먹고 소화도 잘 된다', scores: { taeyang: 0, taeeum: 3, soyang: 1, soeum: 0 } },
      { text: '많이 먹지만 소화가 빠르다', scores: { taeyang: 0, taeeum: 1, soyang: 3, soeum: 0 } },
      { text: '적게 먹고 소화가 잘 안된다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 3 } },
    ],
  },
  {
    id: 6,
    category: '소화',
    question: '식사 후 주로 어떤 증상이 있나요?',
    options: [
      { text: '별다른 불편함이 없다', scores: { taeyang: 2, taeeum: 2, soyang: 1, soeum: 0 } },
      { text: '포만감이 오래 가고 더부룩하다', scores: { taeyang: 0, taeeum: 3, soyang: 0, soeum: 1 } },
      { text: '금방 배가 고프고 속이 쓰리다', scores: { taeyang: 1, taeeum: 0, soyang: 3, soeum: 0 } },
      { text: '체하기 쉽고 소화가 느리다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 3 } },
    ],
  },
  {
    id: 7,
    category: '대변',
    question: '대변 상태는 주로 어떤가요?',
    options: [
      { text: '변비가 있어도 크게 불편하지 않다', scores: { taeyang: 3, taeeum: 0, soyang: 0, soeum: 0 } },
      { text: '변비 경향이 있고 대변이 굵다', scores: { taeyang: 0, taeeum: 3, soyang: 0, soeum: 0 } },
      { text: '대변이 시원하고 무른 편', scores: { taeyang: 0, taeeum: 0, soyang: 3, soeum: 1 } },
      { text: '무른 변이나 설사가 잦다', scores: { taeyang: 0, taeeum: 0, soyang: 1, soeum: 3 } },
    ],
  },
  {
    id: 8,
    category: '땀',
    question: '땀은 어느 정도 흘리나요?',
    options: [
      { text: '땀이 많고 항상 더운 편', scores: { taeyang: 3, taeeum: 1, soyang: 1, soeum: 0 } },
      { text: '땀이 많고 조금만 움직여도 흘린다', scores: { taeyang: 0, taeeum: 3, soyang: 0, soeum: 0 } },
      { text: '상체에 땀이 많다', scores: { taeyang: 1, taeeum: 0, soyang: 3, soeum: 0 } },
      { text: '땀을 잘 흘리지 않는다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 3 } },
    ],
  },
  {
    id: 9,
    category: '추위/더위',
    question: '추위와 더위 중 어느 것에 약한가요?',
    options: [
      { text: '더위를 잘 타고 시원한 것을 좋아한다', scores: { taeyang: 3, taeeum: 2, soyang: 1, soeum: 0 } },
      { text: '더위를 많이 타지만 추위도 싫다', scores: { taeyang: 0, taeeum: 3, soyang: 1, soeum: 0 } },
      { text: '더위를 많이 타고 냉한 음식을 좋아한다', scores: { taeyang: 1, taeeum: 0, soyang: 3, soeum: 0 } },
      { text: '추위를 많이 타고 따뜻한 것을 좋아한다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 3 } },
    ],
  },
  {
    id: 10,
    category: '수면',
    question: '수면 상태는 어떤가요?',
    options: [
      { text: '잠이 적어도 개운하다', scores: { taeyang: 3, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '잠이 많고 깊이 잔다', scores: { taeyang: 0, taeeum: 3, soyang: 0, soeum: 0 } },
      { text: '잠들기 어렵고 꿈이 많다', scores: { taeyang: 0, taeeum: 0, soyang: 3, soeum: 1 } },
      { text: '잠이 얕고 자주 깬다', scores: { taeyang: 0, taeeum: 0, soyang: 1, soeum: 3 } },
    ],
  },
  {
    id: 11,
    category: '스트레스',
    question: '스트레스를 받으면 주로 어떤 증상이 나타나나요?',
    options: [
      { text: '화가 치밀고 머리가 아프다', scores: { taeyang: 3, taeeum: 0, soyang: 1, soeum: 0 } },
      { text: '가슴이 답답하고 한숨이 나온다', scores: { taeyang: 0, taeeum: 3, soyang: 0, soeum: 1 } },
      { text: '가슴이 두근거리고 열이 오른다', scores: { taeyang: 1, taeeum: 0, soyang: 3, soeum: 0 } },
      { text: '소화가 안되고 불안하다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 3 } },
    ],
  },
  {
    id: 12,
    category: '피부',
    question: '피부 상태는 어떤가요?',
    options: [
      { text: '피부가 거칠고 윤기가 없다', scores: { taeyang: 3, taeeum: 0, soyang: 0, soeum: 1 } },
      { text: '피부가 두껍고 땀구멍이 크다', scores: { taeyang: 0, taeeum: 3, soyang: 0, soeum: 0 } },
      { text: '피부가 희고 탄력이 있다', scores: { taeyang: 0, taeeum: 0, soyang: 3, soeum: 1 } },
      { text: '피부가 희고 차가우며 건조하다', scores: { taeyang: 0, taeeum: 0, soyang: 0, soeum: 3 } },
    ],
  },
]

const constitutionData: Record<string, Omit<ConstitutionResult, 'percentage'>> = {
  taeyang: {
    type: 'taeyang',
    name: '태양인',
    hanja: '太陽人',
    description: '폐대간소(肺大肝小)의 체질로, 상체가 발달하고 하체가 약합니다. 창의적이고 진취적인 성격으로 리더십이 뛰어납니다.',
    bodyType: '상체 발달, 하체 빈약, 머리가 크고 목덜미가 굵음',
    personality: '창의적, 진취적, 영웅심, 과단성, 독창적',
    strengths: ['창의력이 뛰어남', '리더십이 강함', '결단력이 있음', '진취적 성향'],
    weaknesses: ['독선적일 수 있음', '하체 질환에 약함', '간 기능이 약함', '분노 조절 필요'],
    recommendedFoods: ['메밀', '냉면', '새우', '조개류', '게', '해삼', '포도', '앵두', '다래'],
    avoidFoods: ['맵고 자극적인 음식', '고열량 육류', '술', '커피', '인삼'],
    recommendedHerbs: ['오가피', '모과', '다래', '앵두', '포도근'],
    healthTips: ['하체 운동을 꾸준히 할 것', '분노 조절에 신경 쓸 것', '시원한 음식 위주로 섭취', '과로를 피할 것'],
  },
  taeeum: {
    type: 'taeeum',
    name: '태음인',
    hanja: '太陰人',
    description: '간대폐소(肝大肺小)의 체질로, 체격이 크고 튼튼합니다. 침착하고 신중한 성격으로 끈기가 있습니다.',
    bodyType: '체격이 크고 건장, 허리 부위 발달, 땀이 많음',
    personality: '침착, 신중, 꾸준함, 인내심, 포용력',
    strengths: ['끈기가 있음', '체력이 좋음', '신중한 판단', '포용력이 큼'],
    weaknesses: ['비만 경향', '호흡기 질환에 약함', '게으름 주의', '순환 장애 주의'],
    recommendedFoods: ['소고기', '밤', '잣', '호두', '은행', '무', '도라지', '더덕', '콩나물', '율무'],
    avoidFoods: ['닭고기', '돼지고기', '계란', '우유', '밀가루', '기름진 음식'],
    recommendedHerbs: ['녹용', '갈근', '길경', '맥문동', '오미자', '황기'],
    healthTips: ['규칙적인 유산소 운동', '과식을 피할 것', '땀을 적당히 흘릴 것', '호흡기 관리에 신경 쓸 것'],
  },
  soyang: {
    type: 'soyang',
    name: '소양인',
    hanja: '少陽人',
    description: '비대신소(脾大腎小)의 체질로, 상체보다 하체가 발달했습니다. 활발하고 외향적인 성격으로 봉사정신이 강합니다.',
    bodyType: '상체 빈약, 하체 발달, 가슴이 좁고 엉덩이가 큼',
    personality: '활발, 외향적, 봉사정신, 정의감, 솔직함',
    strengths: ['활동적임', '봉사정신이 강함', '정의로움', '사교적임'],
    weaknesses: ['경솔할 수 있음', '신장 기능 약함', '조급함 주의', '하초 냉증 주의'],
    recommendedFoods: ['돼지고기', '오리고기', '해물', '굴', '전복', '오이', '배추', '수박', '참외', '보리'],
    avoidFoods: ['닭고기', '개고기', '인삼', '꿀', '마늘', '고추', '생강', '자극적 음식'],
    recommendedHerbs: ['숙지황', '산수유', '구기자', '복분자', '택사', '지모'],
    healthTips: ['성급함을 자제할 것', '신장 기능 관리', '시원한 음식 섭취', '과격한 운동 피하기'],
  },
  soeum: {
    type: 'soeum',
    name: '소음인',
    hanja: '少陰人',
    description: '신대비소(腎大脾小)의 체질로, 체격이 작고 마른 편입니다. 내성적이고 섬세한 성격으로 계획적입니다.',
    bodyType: '체격이 작고 마름, 상하체 균형, 손발이 차가움',
    personality: '내성적, 섬세함, 계획적, 꼼꼼함, 분석적',
    strengths: ['섬세함', '계획적', '분석력 뛰어남', '꼼꼼함'],
    weaknesses: ['소화기 약함', '추위에 약함', '소심함 주의', '체력이 약함'],
    recommendedFoods: ['닭고기', '개고기', '염소고기', '찹쌀', '감자', '시금치', '양배추', '사과', '귤', '대추'],
    avoidFoods: ['돼지고기', '오리고기', '밀가루', '냉면', '참외', '수박', '냉한 음식'],
    recommendedHerbs: ['인삼', '황기', '당귀', '천궁', '백출', '건강', '부자'],
    healthTips: ['따뜻한 음식 섭취', '과로를 피할 것', '규칙적인 식사', '복부 보온에 신경 쓸 것'],
  },
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
    const scores = { taeyang: 0, taeeum: 0, soyang: 0, soeum: 0 }

    Object.entries(answers).forEach(([questionId, optionIndex]) => {
      const question = questions.find((q) => q.id === parseInt(questionId))
      if (question) {
        const option = question.options[optionIndex]
        scores.taeyang += option.scores.taeyang
        scores.taeeum += option.scores.taeeum
        scores.soyang += option.scores.soyang
        scores.soeum += option.scores.soeum
      }
    })

    const total = scores.taeyang + scores.taeeum + scores.soyang + scores.soeum
    const maxType = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0] as keyof typeof scores

    const constitutionInfo = constitutionData[maxType]
    setResult({
      ...constitutionInfo,
      percentage: Math.round((scores[maxType] / total) * 100),
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
          <p className="text-gray-500 mt-1">AI 분석 결과입니다</p>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              일치도 {result.percentage}%
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
          12가지 질문으로 나의 체질을 알아보세요
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
        <div className="mb-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            {currentQuestion.category}
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

      {/* Page Guide */}
      <PageGuide
        pageId="constitution"
        pageTitle="사상체질 진단"
        pageDescription="12가지 질문을 통해 환자의 사상체질(태양인, 태음인, 소양인, 소음인)을 진단합니다."
        whenToUse={[
          '새 환자의 체질을 파악하고 싶을 때',
          '체질에 맞는 처방과 양생법을 안내할 때',
          '기존 진단을 재확인하고 싶을 때',
        ]}
        steps={[
          {
            title: '질문에 답하기',
            description: '12개의 질문이 순서대로 표시됩니다. 환자의 특성에 가장 가까운 보기를 선택하세요.',
            tip: '모든 질문에 답해야 결과를 확인할 수 있어요',
          },
          {
            title: '결과 확인',
            description: '마지막 질문 후 "결과 확인"을 누르면 체질 진단 결과가 표시됩니다. 각 체질의 특징과 일치도를 확인하세요.',
          },
          {
            title: '상세 정보 확인',
            description: '진단된 체질의 체형, 성격, 강점, 주의점, 권장 음식, 맞는 한약재 정보를 확인할 수 있습니다.',
          },
          {
            title: '환자 기록에 적용',
            description: '진단 결과를 환자 차트에 기록하면 이후 AI 처방 추천에 반영됩니다.',
            tip: '다시 진단하기 버튼으로 재검사도 가능해요',
          },
        ]}
        tips={[
          '체질 진단은 참고 자료로 활용하세요',
          '환자의 병력과 현재 상태를 종합적으로 고려하세요',
          '체질에 따른 식이 조언을 환자에게 안내하세요',
        ]}
      />
    </div>
  )
}
