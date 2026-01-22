import { useState, useEffect } from 'react'
import {
  Thermometer,
  Flame,
  Snowflake,
  Dumbbell,
  Feather,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  BodyHeat,
  BodyStrength,
  BodyConstitutionResult,
  AssessmentItem,
} from '@/types'

// Re-export types for backward compatibility
export type { BodyHeat, BodyStrength, BodyConstitutionResult }

// 체열 평가 설문 항목
const heatAssessmentQuestions = [
  {
    id: 'temp_preference',
    question: '평소 온도 선호',
    options: [
      { value: -2, label: '따뜻한 곳을 매우 좋아함', description: '항상 온풍기, 핫팩 사용' },
      { value: -1, label: '따뜻한 것을 약간 선호', description: '찬 곳은 피함' },
      { value: 0, label: '보통', description: '특별한 선호 없음' },
      { value: 1, label: '시원한 것을 약간 선호', description: '더운 곳은 피함' },
      { value: 2, label: '시원한 곳을 매우 좋아함', description: '에어컨/선풍기 항상 사용' },
    ],
  },
  {
    id: 'drink_preference',
    question: '음료 온도 선호',
    options: [
      { value: -2, label: '뜨거운 음료만 마심', description: '찬물은 마시지 못함' },
      { value: -1, label: '따뜻한 음료 선호', description: '미지근한 물도 괜찮음' },
      { value: 0, label: '보통', description: '상관없음' },
      { value: 1, label: '시원한 음료 선호', description: '얼음은 가끔' },
      { value: 2, label: '찬 음료/얼음물 선호', description: '항상 얼음 필요' },
    ],
  },
  {
    id: 'season_preference',
    question: '계절 선호',
    options: [
      { value: -2, label: '겨울을 매우 싫어함', description: '추위에 매우 약함' },
      { value: -1, label: '여름을 약간 선호', description: '추위보다 더위가 나음' },
      { value: 0, label: '보통', description: '특별한 선호 없음' },
      { value: 1, label: '겨울을 약간 선호', description: '더위보다 추위가 나음' },
      { value: 2, label: '여름을 매우 싫어함', description: '더위에 매우 약함' },
    ],
  },
  {
    id: 'cold_food_reaction',
    question: '찬 음식 반응',
    options: [
      { value: -2, label: '설사/복통 심함', description: '찬 음식 먹으면 바로 탈이 남' },
      { value: -1, label: '소화 불편', description: '약간 더부룩하거나 불편' },
      { value: 0, label: '보통', description: '별 문제 없음' },
      { value: 1, label: '시원하게 느껴짐', description: '좋아함' },
      { value: 2, label: '매우 좋아함', description: '아이스크림, 냉면 즐김' },
    ],
  },
  {
    id: 'hand_foot_temp',
    question: '손발 온도',
    options: [
      { value: -2, label: '항상 차가움', description: '손발이 얼음장 같음' },
      { value: -1, label: '자주 차가움', description: '겨울에 특히 시림' },
      { value: 0, label: '보통', description: '보통 체온' },
      { value: 1, label: '따뜻한 편', description: '추워도 손발은 따뜻' },
      { value: 2, label: '항상 따뜻/열감', description: '손발에 열이 남' },
    ],
  },
  {
    id: 'face_color',
    question: '얼굴 색',
    options: [
      { value: -2, label: '창백함', description: '핏기 없이 하얗거나 누리끼리' },
      { value: -1, label: '약간 창백', description: '혈색이 좋지 않음' },
      { value: 0, label: '보통', description: '일반적인 혈색' },
      { value: 1, label: '약간 붉음', description: '홍조가 있음' },
      { value: 2, label: '붉거나 윤기', description: '얼굴에 열감, 기름기' },
    ],
  },
]

// 근실도 평가 설문 항목
const strengthAssessmentQuestions = [
  {
    id: 'body_frame',
    question: '체형/골격',
    options: [
      { value: -2, label: '매우 마르거나 연약', description: '뼈가 가늘고 약해 보임' },
      { value: -1, label: '다소 허약한 편', description: '체격이 작은 편' },
      { value: 0, label: '보통', description: '평균적인 체형' },
      { value: 1, label: '튼튼한 편', description: '골격이 큰 편' },
      { value: 2, label: '매우 튼튼함', description: '흉곽이 크고 뼈가 단단' },
    ],
  },
  {
    id: 'voice',
    question: '목소리',
    options: [
      { value: -2, label: '매우 약하고 작음', description: '힘이 없고 기운 없는 목소리' },
      { value: -1, label: '다소 약한 편', description: '크게 말하기 어려움' },
      { value: 0, label: '보통', description: '평균적인 목소리' },
      { value: 1, label: '힘있는 편', description: '또렷하고 명확함' },
      { value: 2, label: '낭랑하고 우렁참', description: '힘차고 멀리까지 들림' },
    ],
  },
  {
    id: 'appetite',
    question: '식사량/식욕',
    options: [
      { value: -2, label: '매우 적음', description: '조금만 먹어도 배부름' },
      { value: -1, label: '적은 편', description: '평균보다 적게 먹음' },
      { value: 0, label: '보통', description: '평균적인 식사량' },
      { value: 1, label: '많은 편', description: '평균보다 많이 먹음' },
      { value: 2, label: '매우 많음', description: '많이 먹어도 잘 소화됨' },
    ],
  },
  {
    id: 'digestion',
    question: '소화력',
    options: [
      { value: -2, label: '매우 약함', description: '자주 체하고 소화 안됨' },
      { value: -1, label: '약한 편', description: '과식하면 탈남' },
      { value: 0, label: '보통', description: '평균적인 소화력' },
      { value: 1, label: '좋은 편', description: '웬만하면 잘 소화됨' },
      { value: 2, label: '매우 강함', description: '뭘 먹어도 거뜬' },
    ],
  },
  {
    id: 'energy_level',
    question: '기력/활동량',
    options: [
      { value: -2, label: '매우 무력함', description: '쉽게 지치고 힘이 없음' },
      { value: -1, label: '약간 피로', description: '기운이 없는 편' },
      { value: 0, label: '보통', description: '평균적인 활동량' },
      { value: 1, label: '활동적', description: '에너지가 넘침' },
      { value: 2, label: '매우 활동적', description: '지칠 줄 모름' },
    ],
  },
  {
    id: 'recovery',
    question: '회복력',
    options: [
      { value: -2, label: '매우 느림', description: '병/피로 회복이 오래 걸림' },
      { value: -1, label: '느린 편', description: '평균보다 회복 느림' },
      { value: 0, label: '보통', description: '평균적인 회복력' },
      { value: 1, label: '빠른 편', description: '금방 회복됨' },
      { value: 2, label: '매우 빠름', description: '하루 자면 거뜬' },
    ],
  },
]

interface Props {
  onComplete: (result: BodyConstitutionResult) => void
  initialResult?: BodyConstitutionResult
  className?: string
}

export function BodyConstitutionAssessment({ onComplete, initialResult, className }: Props) {
  const [step, setStep] = useState<'heat' | 'strength' | 'result'>('heat')
  const [heatAnswers, setHeatAnswers] = useState<Record<string, number>>(
    initialResult?.assessmentDetails?.heatItems?.reduce((acc, item) => {
      acc[item.id] = item.value
      return acc
    }, {} as Record<string, number>) || {}
  )
  const [strengthAnswers, setStrengthAnswers] = useState<Record<string, number>>(
    initialResult?.assessmentDetails?.strengthItems?.reduce((acc, item) => {
      acc[item.id] = item.value
      return acc
    }, {} as Record<string, number>) || {}
  )

  // 점수 계산
  const calculateHeatScore = () => {
    const values = Object.values(heatAnswers)
    if (values.length === 0) return 0
    const sum = values.reduce((a, b) => a + b, 0)
    // -12 ~ +12 범위를 -10 ~ +10으로 정규화
    return Math.round((sum / 12) * 10)
  }

  const calculateStrengthScore = () => {
    const values = Object.values(strengthAnswers)
    if (values.length === 0) return 0
    const sum = values.reduce((a, b) => a + b, 0)
    return Math.round((sum / 12) * 10)
  }

  const getBodyHeat = (score: number): BodyHeat => {
    if (score <= -4) return 'cold'
    if (score >= 4) return 'hot'
    return 'neutral'
  }

  const getBodyStrength = (score: number): BodyStrength => {
    if (score <= -4) return 'deficient'
    if (score >= 4) return 'excess'
    return 'neutral'
  }

  const heatScore = calculateHeatScore()
  const strengthScore = calculateStrengthScore()

  const heatAnsweredCount = Object.keys(heatAnswers).length
  const strengthAnsweredCount = Object.keys(strengthAnswers).length
  const heatComplete = heatAnsweredCount === heatAssessmentQuestions.length
  const strengthComplete = strengthAnsweredCount === strengthAssessmentQuestions.length

  const handleComplete = () => {
    const result: BodyConstitutionResult = {
      bodyHeat: getBodyHeat(heatScore),
      bodyStrength: getBodyStrength(strengthScore),
      bodyHeatScore: heatScore,
      bodyStrengthScore: strengthScore,
      assessmentDetails: {
        heatItems: Object.entries(heatAnswers).map(([id, value]) => ({
          id,
          question: heatAssessmentQuestions.find(q => q.id === id)?.question || '',
          value,
        })),
        strengthItems: Object.entries(strengthAnswers).map(([id, value]) => ({
          id,
          question: strengthAssessmentQuestions.find(q => q.id === id)?.question || '',
          value,
        })),
      },
    }
    onComplete(result)
  }

  const getHeatLabel = (heat: BodyHeat) => {
    switch (heat) {
      case 'cold': return '한(寒) 체질'
      case 'hot': return '열(熱) 체질'
      default: return '평(平) 체질'
    }
  }

  const getStrengthLabel = (strength: BodyStrength) => {
    switch (strength) {
      case 'deficient': return '허(虛)'
      case 'excess': return '실(實)'
      default: return '평(平)'
    }
  }

  const getHeatDescription = (heat: BodyHeat) => {
    switch (heat) {
      case 'cold':
        return '몸이 찬 편입니다. 따뜻한 음식과 환경을 선호하며, 찬 음식에 민감합니다. 온보(溫補) 처방이 적합합니다.'
      case 'hot':
        return '몸에 열이 많은 편입니다. 시원한 것을 좋아하고 더위를 싫어합니다. 청열(清熱) 처방이 적합합니다.'
      default:
        return '체열이 균형 잡힌 상태입니다. 특별히 한열에 편중되지 않습니다.'
    }
  }

  const getStrengthDescription = (strength: BodyStrength) => {
    switch (strength) {
      case 'deficient':
        return '기력과 체력이 약한 편입니다. 쉽게 피로하고 소화력이 약합니다. 보(補)하는 처방이 적합합니다.'
      case 'excess':
        return '체력이 튼튼하고 기력이 왕성합니다. 소화력이 강하고 활동적입니다. 사(瀉)하는 처방도 감당할 수 있습니다.'
      default:
        return '근실도가 균형 잡힌 상태입니다. 일반적인 처방을 적용할 수 있습니다.'
    }
  }

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Thermometer className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">체열/근실도 평가</h2>
        </div>
        <p className="text-sm text-gray-600">
          이종대 선생님 기준: 체열(寒熱)과 근실도(虛實)는 처방 선택의 핵심 기준입니다.
        </p>

        {/* 진행 표시 */}
        <div className="flex items-center gap-2 mt-4">
          <div
            className={cn(
              'flex-1 h-2 rounded-full transition-colors',
              step === 'heat' ? 'bg-indigo-500' : heatComplete ? 'bg-green-500' : 'bg-gray-200'
            )}
          />
          <div
            className={cn(
              'flex-1 h-2 rounded-full transition-colors',
              step === 'strength' ? 'bg-indigo-500' : strengthComplete ? 'bg-green-500' : 'bg-gray-200'
            )}
          />
          <div
            className={cn(
              'flex-1 h-2 rounded-full transition-colors',
              step === 'result' ? 'bg-indigo-500' : 'bg-gray-200'
            )}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>체열 평가</span>
          <span>근실도 평가</span>
          <span>결과 확인</span>
        </div>
      </div>

      {/* 체열 평가 */}
      {step === 'heat' && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-medium text-gray-900">체열(寒熱) 평가</h3>
            <span className="text-sm text-gray-500">
              ({heatAnsweredCount}/{heatAssessmentQuestions.length})
            </span>
          </div>

          <div className="space-y-6">
            {heatAssessmentQuestions.map((q) => (
              <div key={q.id} className="space-y-3">
                <p className="font-medium text-gray-800">{q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setHeatAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        heatAnswers[q.id] === opt.value
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep('strength')}
              disabled={!heatComplete}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                heatComplete
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              다음: 근실도 평가
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 근실도 평가 */}
      {step === 'strength' && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-gray-900">근실도(虛實) 평가</h3>
            <span className="text-sm text-gray-500">
              ({strengthAnsweredCount}/{strengthAssessmentQuestions.length})
            </span>
          </div>

          <div className="space-y-6">
            {strengthAssessmentQuestions.map((q) => (
              <div key={q.id} className="space-y-3">
                <p className="font-medium text-gray-800">{q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStrengthAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        strengthAnswers[q.id] === opt.value
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep('heat')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <button
              onClick={() => setStep('result')}
              disabled={!strengthComplete}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                strengthComplete
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              결과 확인
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 결과 화면 */}
      {step === 'result' && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="font-medium text-gray-900">평가 결과</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* 체열 결과 */}
            <div className={cn(
              'p-4 rounded-xl border-2',
              getBodyHeat(heatScore) === 'cold' ? 'border-blue-300 bg-blue-50' :
              getBodyHeat(heatScore) === 'hot' ? 'border-orange-300 bg-orange-50' :
              'border-gray-300 bg-gray-50'
            )}>
              <div className="flex items-center gap-3 mb-3">
                {getBodyHeat(heatScore) === 'cold' ? (
                  <Snowflake className="w-8 h-8 text-blue-500" />
                ) : getBodyHeat(heatScore) === 'hot' ? (
                  <Flame className="w-8 h-8 text-orange-500" />
                ) : (
                  <Thermometer className="w-8 h-8 text-gray-500" />
                )}
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {getHeatLabel(getBodyHeat(heatScore))}
                  </div>
                  <div className="text-sm text-gray-600">
                    점수: {heatScore > 0 ? '+' : ''}{heatScore}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                {getHeatDescription(getBodyHeat(heatScore))}
              </p>

              {/* 점수 시각화 */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>한(寒)</span>
                  <span>평(平)</span>
                  <span>열(熱)</span>
                </div>
                <div className="relative h-3 bg-gradient-to-r from-blue-400 via-gray-300 to-orange-400 rounded-full">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-800 rounded-full shadow"
                    style={{ left: `${((heatScore + 10) / 20) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
              </div>
            </div>

            {/* 근실도 결과 */}
            <div className={cn(
              'p-4 rounded-xl border-2',
              getBodyStrength(strengthScore) === 'deficient' ? 'border-purple-300 bg-purple-50' :
              getBodyStrength(strengthScore) === 'excess' ? 'border-green-300 bg-green-50' :
              'border-gray-300 bg-gray-50'
            )}>
              <div className="flex items-center gap-3 mb-3">
                {getBodyStrength(strengthScore) === 'deficient' ? (
                  <Feather className="w-8 h-8 text-purple-500" />
                ) : getBodyStrength(strengthScore) === 'excess' ? (
                  <Dumbbell className="w-8 h-8 text-green-500" />
                ) : (
                  <HelpCircle className="w-8 h-8 text-gray-500" />
                )}
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {getStrengthLabel(getBodyStrength(strengthScore))}
                  </div>
                  <div className="text-sm text-gray-600">
                    점수: {strengthScore > 0 ? '+' : ''}{strengthScore}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                {getStrengthDescription(getBodyStrength(strengthScore))}
              </p>

              {/* 점수 시각화 */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>허(虛)</span>
                  <span>평(平)</span>
                  <span>실(實)</span>
                </div>
                <div className="relative h-3 bg-gradient-to-r from-purple-400 via-gray-300 to-green-400 rounded-full">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-800 rounded-full shadow"
                    style={{ left: `${((strengthScore + 10) / 20) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 종합 판단 */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <div className="font-medium text-amber-800 mb-1">처방 선택 시 주의사항</div>
                <ul className="text-sm text-amber-700 space-y-1">
                  {getBodyHeat(heatScore) === 'cold' && (
                    <li>• 한량성(寒凉性) 처방은 피하거나 신중하게 사용하세요.</li>
                  )}
                  {getBodyHeat(heatScore) === 'hot' && (
                    <li>• 온열성(溫熱性) 처방은 피하거나 신중하게 사용하세요.</li>
                  )}
                  {getBodyStrength(strengthScore) === 'deficient' && (
                    <li>• 공격적인 사하(瀉下) 처방은 피하고 보(補)하는 처방을 우선하세요.</li>
                  )}
                  {getBodyStrength(strengthScore) === 'excess' && (
                    <li>• 필요시 사(瀉)하는 처방을 적극적으로 활용할 수 있습니다.</li>
                  )}
                  {getBodyHeat(heatScore) === 'neutral' && getBodyStrength(strengthScore) === 'neutral' && (
                    <li>• 체열과 근실도가 균형 잡혀 있어 다양한 처방을 적용할 수 있습니다.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('strength')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              수정하기
            </button>
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              평가 완료
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BodyConstitutionAssessment
