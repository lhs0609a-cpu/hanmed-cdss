import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain,
  Sparkles,
  Users,
  BookOpen,
  Shield,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Pill,
  Activity,
  TrendingUp,
  Stethoscope,
  Search,
  UserPlus,
  Target,
  Lightbulb,
  ArrowRight,
  Clock,
  Zap,
  FileText,
  MousePointer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '온고지신 AI에 오신 것을 환영합니다!',
    subtitle: '3분만에 핵심 기능 파악하기',
    description: '6,000여 건의 검증된 치험례와 AI 기술로\n진료 시간을 30% 단축하세요.',
    features: [
      {
        icon: Clock,
        title: '진료 시간 단축',
        description: '유사 케이스 검색으로 평균 3분 절약',
      },
      {
        icon: Target,
        title: '처방 정확도 향상',
        description: '6,000건 데이터 기반 추천',
      },
      {
        icon: Shield,
        title: '안전한 처방',
        description: '약물 상호작용 자동 검사',
      },
    ],
    illustration: (
      <div className="relative w-64 h-64">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full animate-pulse" />
        <div className="absolute inset-4 bg-gradient-to-br from-teal-200 to-emerald-200 rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Stethoscope className="w-24 h-24 text-teal-600" />
        </div>
        <div className="absolute top-4 right-4 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center animate-bounce">
          <Sparkles className="w-6 h-6 text-amber-600" />
        </div>
      </div>
    ),
    tip: '이 가이드는 언제든 설정에서 다시 볼 수 있어요',
  },
  {
    id: 'quick-search',
    title: '1단계: AI 검색 시작하기',
    subtitle: '가장 많이 쓰는 핵심 기능',
    description: '환자의 증상을 입력하면 AI가 유사한 치험례를 찾아\n처방 추천까지 제공합니다.',
    features: [
      {
        icon: Search,
        title: '증상 입력',
        description: '"두통, 어지러움, 피로감" 처럼 자연어로 입력',
      },
      {
        icon: BookOpen,
        title: '유사 케이스 확인',
        description: '가장 비슷한 치험례 5건을 유사도와 함께 표시',
      },
      {
        icon: FileText,
        title: '추천 처방 확인',
        description: '성공 케이스에서 공통적으로 사용된 처방 제시',
      },
    ],
    illustration: (
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div className="w-full max-w-[240px] bg-white rounded-xl shadow-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">증상을 입력하세요...</span>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-teal-100 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-teal-50 rounded w-1/2 animate-pulse delay-75" />
          </div>
          <div className="mt-4 p-2 bg-teal-50 rounded-lg border border-teal-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-medium text-teal-700">유사 케이스 5건 발견</span>
            </div>
          </div>
        </div>
      </div>
    ),
    actionButton: {
      label: 'AI 검색 바로가기',
      href: '/dashboard/case-search',
    },
    tip: '대시보드 상단의 검색창에서 바로 시작할 수 있어요',
  },
  {
    id: 'patient-management',
    title: '2단계: 환자 등록하기',
    subtitle: '체계적인 환자 관리의 시작',
    description: '환자 정보를 등록하면 진료 기록이 누적되고\nAI가 개인 맞춤 추천을 제공합니다.',
    features: [
      {
        icon: UserPlus,
        title: '간편 등록',
        description: '이름, 생년월일, 연락처만 입력하면 완료',
      },
      {
        icon: Activity,
        title: '진료 기록 누적',
        description: '방문마다 기록이 쌓여 경과 추이 확인',
      },
      {
        icon: TrendingUp,
        title: 'AI 맞춤 추천',
        description: '환자 히스토리 기반 개인화 처방 제안',
      },
    ],
    illustration: (
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div className="w-full max-w-[240px] bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3">
            <span className="text-white font-medium text-sm">새 환자 등록</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">이름</div>
              <div className="h-8 bg-gray-100 rounded flex items-center px-3">
                <span className="text-sm text-gray-700">홍길동</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">생년월일</div>
              <div className="h-8 bg-gray-100 rounded flex items-center px-3">
                <span className="text-sm text-gray-700">1985-03-15</span>
              </div>
            </div>
            <button className="w-full h-9 bg-teal-500 text-white text-sm font-medium rounded-lg">
              등록하기
            </button>
          </div>
        </div>
      </div>
    ),
    actionButton: {
      label: '환자 등록 바로가기',
      href: '/dashboard/patients',
    },
    tip: '샘플 환자 데이터로 먼저 연습해볼 수도 있어요',
  },
  {
    id: 'result-guide',
    title: '3단계: 결과 해석하기',
    subtitle: '검색 결과 200% 활용법',
    description: 'AI가 제공하는 정보를 어떻게 해석하고\n임상에 적용하는지 알려드립니다.',
    features: [
      {
        icon: Target,
        title: '유사도 점수',
        description: '⭐⭐⭐⭐⭐ (90%↑) = 매우 유사, 참고 가치 높음',
      },
      {
        icon: Lightbulb,
        title: '처방 근거',
        description: '왜 이 처방이 추천되었는지 상세 설명 제공',
      },
      {
        icon: Shield,
        title: '주의사항',
        description: '부작용 보고 케이스나 금기 사항 자동 표시',
      },
    ],
    illustration: (
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div className="w-full max-w-[240px] bg-white rounded-xl shadow-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900">검색 결과</span>
            <span className="text-xs text-teal-600 font-medium">5건</span>
          </div>
          <div className="space-y-2">
            <div className="p-2 bg-teal-50 rounded-lg border border-teal-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">유사도 95%</span>
                <span className="text-amber-500 text-xs">⭐⭐⭐⭐⭐</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">반하백출천마탕 처방</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">유사도 82%</span>
                <span className="text-amber-500 text-xs">⭐⭐⭐⭐</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">소시호탕 처방</p>
            </div>
          </div>
          <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-600" />
              <span className="text-xs text-amber-700">4건에서 공통 처방 발견</span>
            </div>
          </div>
        </div>
      </div>
    ),
    tip: '결과 카드를 클릭하면 원문 치험례 전체를 볼 수 있어요',
  },
  {
    id: 'complete',
    title: '준비 완료! 🎉',
    subtitle: '이제 온고지신 AI를 시작해보세요',
    description: '7일 무료 체험으로 모든 프리미엄 기능을\n제한 없이 사용해보세요.',
    features: [
      {
        icon: Zap,
        title: 'AI 쿼리 300회/월',
        description: 'Professional 플랜 모든 기능 체험',
      },
      {
        icon: BookOpen,
        title: '6,000건 치험례',
        description: '전체 데이터베이스 무제한 접근',
      },
      {
        icon: Users,
        title: '커뮤니티 참여',
        description: '전문가들과 케이스 토론 및 공유',
      },
    ],
    illustration: (
      <div className="relative w-64 h-64">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-2">🎊</div>
            <div className="text-2xl font-bold text-teal-600">시작하기</div>
            <div className="text-sm text-teal-700 mt-1">7일 무료 체험</div>
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
        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">
          {currentStep + 1} / {ONBOARDING_STEPS.length}
        </div>

        <div className="grid md:grid-cols-2">
          {/* Left side - Illustration */}
          <div className="hidden md:flex items-center justify-center p-8 bg-gradient-to-br from-teal-50 to-emerald-50">
            {step.illustration}
          </div>

          {/* Right side - Content */}
          <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-6 mt-4">
              {ONBOARDING_STEPS.map((s, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    currentStep === index
                      ? 'bg-teal-600 w-8'
                      : index < currentStep
                      ? 'bg-teal-300 w-2'
                      : 'bg-gray-200 hover:bg-gray-300 w-2'
                  )}
                  aria-label={`${index + 1}단계로 이동`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <p className="text-teal-600 font-medium text-sm mb-2">{step.subtitle}</p>
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
                  <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-teal-600" />
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
                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-teal-500/30 transition-all"
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
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-teal-500/30'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
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
