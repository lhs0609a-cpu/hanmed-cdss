import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  BookOpen,
  Shield,
  ChevronRight,
  ChevronLeft,
  X,
  Stethoscope,
  Search,
  Lightbulb,
  ArrowRight,
  Clock,
  Zap,
  FileText,
  MousePointer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BASE_STATS, formatStatNumber, formatStatApprox } from '@/config/stats.config'

interface OnboardingFlowProps {
  onComplete: () => void
  onSkip: () => void
}

interface OnboardingStep {
  id: string
  title: string
  subtitle: string
  description: string
  features: Array<{
    icon: React.ElementType
    title: string
    description: string
  }>
  illustration: React.ReactNode
  actionButton?: {
    label: string
    href?: string
    action?: () => void
  }
  tip?: string
}

// 3단계로 축소된 온보딩 (이전 5단계에서 핵심만 추출)
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '온고지신 AI에 오신 것을 환영합니다!',
    subtitle: '30초 안에 핵심 기능 파악하기',
    description: `${formatStatApprox(BASE_STATS.cases)}의 검증된 치험례와 AI 기술로\n진료 시간을 30% 단축하세요.`,
    features: [
      {
        icon: Search,
        title: 'AI 증상 검색',
        description: '증상을 입력하면 유사 치험례와 추천 처방 제시',
      },
      {
        icon: Shield,
        title: '약물 상호작용 검사',
        description: '한약-양약 배합금기 자동 검출',
      },
      {
        icon: Clock,
        title: '진료 시간 단축',
        description: '유사 케이스 검색으로 평균 3분 절약',
      },
    ],
    illustration: (
      <div className="relative w-64 h-64">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-100 rounded-full animate-pulse" />
        <div className="absolute inset-4 bg-gradient-to-br from-blue-200 to-blue-200 rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Stethoscope className="w-24 h-24 text-blue-600" />
        </div>
        <div className="absolute top-4 right-4 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center animate-bounce">
          <Sparkles className="w-6 h-6 text-amber-600" />
        </div>
      </div>
    ),
    tip: '설정에서 언제든 이 가이드를 다시 볼 수 있어요',
  },
  {
    id: 'try-search',
    title: '직접 체험해보세요!',
    subtitle: '가장 많이 쓰는 핵심 기능',
    description: '"두통, 어지러움, 피로감"처럼 증상을 입력하면\nAI가 유사 치험례를 찾아 처방을 추천합니다.',
    features: [
      {
        icon: Search,
        title: '1. 증상 입력',
        description: '자연어로 환자 증상을 그대로 입력',
      },
      {
        icon: BookOpen,
        title: '2. 유사 케이스 확인',
        description: '유사도 순으로 치험례 5건 표시',
      },
      {
        icon: FileText,
        title: '3. 추천 처방 확인',
        description: '성공 케이스의 공통 처방 제시',
      },
    ],
    illustration: (
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div className="w-full max-w-[240px] bg-white rounded-xl shadow-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">두통, 어지러움...</span>
          </div>
          <div className="space-y-2">
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">유사도 95%</span>
                <span className="text-amber-500 text-xs">⭐⭐⭐⭐⭐</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">반하백출천마탕</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">유사도 82%</span>
                <span className="text-amber-500 text-xs">⭐⭐⭐⭐</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">소시호탕</p>
            </div>
          </div>
          <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span className="text-xs text-amber-700">유사 케이스 5건 발견</span>
            </div>
          </div>
        </div>
      </div>
    ),
    actionButton: {
      label: '지금 바로 검색해보기',
      href: '/dashboard/case-search',
    },
    tip: '대시보드 상단 검색창에서 언제든 시작할 수 있어요',
  },
  {
    id: 'complete',
    title: '준비 완료! 🎉',
    subtitle: '14일 무료 체험 시작',
    description: '카드 등록 없이 Professional 플랜을\n14일간 무료로 체험해보세요.',
    features: [
      {
        icon: Zap,
        title: 'AI 쿼리 30회',
        description: '체험 기간 동안 제공',
      },
      {
        icon: BookOpen,
        title: `${formatStatNumber(BASE_STATS.cases)} 치험례`,
        description: '전체 데이터베이스 무제한 검색',
      },
      {
        icon: Shield,
        title: '자동 결제 없음',
        description: '체험 종료 후 Free로 자동 전환',
      },
    ],
    illustration: (
      <div className="relative w-64 h-64">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-100 rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-2">🎊</div>
            <div className="text-2xl font-bold text-blue-600">시작하기</div>
            <div className="text-sm text-blue-700 mt-1">14일 무료 체험</div>
          </div>
        </div>
        <div className="absolute -top-2 -right-2 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-sm font-bold rounded-full shadow-lg">
          Pro
        </div>
      </div>
    ),
    actionButton: {
      label: 'AI 검색으로 시작하기',
      href: '/dashboard/case-search',
    },
  },
]

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const navigate = useNavigate()

  const step = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    setIsVisible(false)
    localStorage.setItem('onboarding_completed', 'true')
    localStorage.setItem('onboarding_completed_at', new Date().toISOString())
    setTimeout(onComplete, 300)
  }

  const handleSkip = () => {
    setIsVisible(false)
    localStorage.setItem('onboarding_completed', 'true')
    localStorage.setItem('onboarding_skipped', 'true')
    setTimeout(onSkip, 300)
  }

  const handleActionButton = () => {
    if (step.actionButton?.href) {
      handleComplete()
      navigate(step.actionButton.href)
    } else if (step.actionButton?.action) {
      step.actionButton.action()
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={cn(
        'relative w-full max-w-4xl mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden',
        'transform transition-all duration-300',
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      )}>
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="온보딩 건너뛰기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
          {currentStep + 1} / {ONBOARDING_STEPS.length}
        </div>

        <div className="grid md:grid-cols-2">
          {/* Left side - Illustration */}
          <div className="hidden md:flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-blue-50">
            {step.illustration}
          </div>

          {/* Right side - Content */}
          <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-6 mt-4">
              {ONBOARDING_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    currentStep === index
                      ? 'bg-blue-600 w-8'
                      : index < currentStep
                      ? 'bg-blue-300 w-2'
                      : 'bg-gray-200 hover:bg-gray-300 w-2'
                  )}
                  aria-label={`${index + 1}단계로 이동`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <p className="text-blue-600 font-medium text-sm mb-2">{step.subtitle}</p>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{step.title}</h2>
              <p className="text-gray-500 whitespace-pre-line text-sm md:text-base">{step.description}</p>
            </div>

            {/* Mobile illustration */}
            <div className="md:hidden flex justify-center mb-4">
              <div className="transform scale-75">{step.illustration}</div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              {step.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">{feature.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tip */}
            {step.tip && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{step.tip}</p>
                </div>
              </div>
            )}

            {/* Action Button (optional) */}
            {step.actionButton && !isLastStep && (
              <button
                onClick={handleActionButton}
                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all"
              >
                <MousePointer className="w-4 h-4" />
                {step.actionButton.label}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors',
                  currentStep === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>

              <button
                onClick={isLastStep ? handleActionButton : handleNext}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                  isLastStep
                    ? 'bg-gradient-to-r from-blue-600 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/30'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                {isLastStep ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {step.actionButton?.label || '시작하기'}
                  </>
                ) : (
                  <>
                    다음
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Skip link */}
            <div className="text-center mt-4">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                나중에 보기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 온보딩 완료 여부 확인
export function useOnboardingStatus() {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed')
    setShouldShow(!completed)
  }, [])

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_completed')
    setShouldShow(true)
  }

  return { shouldShowOnboarding: shouldShow, resetOnboarding }
}

export default OnboardingFlow
