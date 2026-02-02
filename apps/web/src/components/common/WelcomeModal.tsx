import { useState, useEffect } from 'react'
import { X, Sparkles, Stethoscope, Search, AlertTriangle, ArrowRight, Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const STORAGE_KEY = 'hanmed-cdss-welcome-shown'

interface Feature {
  icon: React.ElementType
  title: string
  description: string
  color: string
}

const features: Feature[] = [
  {
    icon: Sparkles,
    title: 'AI 진료 상담',
    description: '환자 증상을 입력하면 AI가 최적의 처방을 추천합니다.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    icon: Search,
    title: '6,000+ 치험례 검색',
    description: '40년 임상 경험이 담긴 치험례 데이터베이스를 검색하세요.',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    icon: AlertTriangle,
    title: '약물 상호작용 검사',
    description: '한약-양약 간 상호작용을 실시간으로 확인합니다.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Stethoscope,
    title: '변증 진단 지원',
    description: '사상체질, 장부변증 등 다양한 진단 도구를 제공합니다.',
    color: 'from-blue-500 to-cyan-500',
  },
]

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    // 로그인된 사용자에게만 표시
    if (!user) return

    // 이미 본 경우 표시하지 않음
    const hasShown = localStorage.getItem(STORAGE_KEY)
    if (hasShown) return

    // 약간의 딜레이 후 모달 표시
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [user])

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }

  const handleStartTrial = () => {
    handleClose()
    navigate('/subscription')
  }

  const handleStartConsultation = () => {
    handleClose()
    navigate('/dashboard/consultation')
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Step 0: Welcome */}
        {currentStep === 0 && (
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                <span className="text-4xl font-bold text-white">온</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {user?.name}님, 환영합니다!
              </h1>
              <p className="text-lg text-gray-600">
                온고지신 AI와 함께 더 나은 진료를 시작하세요
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                나중에
              </button>
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
              >
                시작하기
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Free Trial */}
        {currentStep === 1 && (
          <div>
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6" />
                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  특별 혜택
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                14일 무료 체험
              </h2>
              <p className="text-purple-100">
                카드 등록 없이 Professional 플랜의 모든 기능을 체험하세요
              </p>
            </div>

            <div className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">AI 진료 상담 30회</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">6,000+ 치험례 무제한 검색</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">약물 상호작용 검사</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">체험 후 자동결제 없음</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStartConsultation}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  바로 사용하기
                </button>
                <button
                  onClick={handleStartTrial}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  무료 체험 시작
                </button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-4">
                언제든지 요금제 페이지에서 체험을 시작할 수 있습니다
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default WelcomeModal
