import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  Brain,
  Target,
  TrendingUp,
  CheckCircle2,
  Zap,
  BookOpen,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BASE_STATS, formatStatNumber } from '@/config/stats.config'

const demoSteps = [
  { text: '증상 입력', icon: Activity, delay: 0 },
  { text: 'AI 변증 분석', icon: Brain, delay: 1 },
  { text: '유사 치험례 매칭', icon: Target, delay: 2 },
  { text: '최적 처방 추천', icon: CheckCircle2, delay: 3 },
]

const features = [
  {
    icon: Brain,
    title: 'AI 변증 분석',
    description: '환자 증상을 입력하면 체질, 허실, 한열 등을 자동 분석',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: BookOpen,
    title: `${formatStatNumber(BASE_STATS.cases)} 치험례 검색`,
    description: '실제 임상 데이터에서 유사 성공 사례를 즉시 검색',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Target,
    title: '성공률 기반 추천',
    description: '유사 환자 치료 성공률이 높은 처방을 우선 추천',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
]

interface KillerFeatureHighlightProps {
  compact?: boolean
}

export function KillerFeatureHighlight({ compact = false }: KillerFeatureHighlightProps) {
  const [activeStep, setActiveStep] = useState(0)

  // Auto-animate steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % demoSteps.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  if (compact) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              핵심 기능
            </span>
          </div>

          <h3 className="text-lg font-bold mb-2">AI 처방 어시스턴트</h3>
          <p className="text-sm text-white/80 mb-4">
            증상만 입력하면 {formatStatNumber(BASE_STATS.cases)} 치험례 분석 후 최적 처방 추천
          </p>

          <Link
            to="/dashboard/consultation"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            <Zap className="h-4 w-4" />
            바로 사용하기
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-8 lg:p-12">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/10">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-white/90">온고지신 AI의 핵심 기능</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Content */}
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              AI 처방 어시스턴트
            </h2>
            <p className="text-lg text-white/70 mb-8 leading-relaxed">
              증상만 입력하면 <span className="text-emerald-400 font-semibold">{formatStatNumber(BASE_STATS.cases)}의 실제 치험례</span>를
              분석하여 <span className="text-purple-400 font-semibold">치료 성공률이 높은 처방</span>을 추천해드립니다.
            </p>

            {/* Features */}
            <div className="space-y-4 mb-8">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className={cn('p-2.5 rounded-xl', feature.bgColor)}>
                    <feature.icon className={cn('h-5 w-5', feature.color)} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{feature.title}</h4>
                    <p className="text-sm text-white/60 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mb-8">
              <div>
                <div className="text-2xl font-bold text-white">{formatStatNumber(BASE_STATS.cases)}</div>
                <div className="text-xs text-white/50">학습된 치험례</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <div className="text-2xl font-bold text-white">{formatStatNumber(BASE_STATS.formulas)}</div>
                <div className="text-xs text-white/50">처방 데이터</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <div className="text-2xl font-bold text-white">~3분</div>
                <div className="text-xs text-white/50">평균 분석 시간</div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4">
              <Link
                to="/dashboard/consultation"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
              >
                <Zap className="h-5 w-5" />
                지금 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard/cases"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors border border-white/10"
              >
                <BookOpen className="h-5 w-5" />
                치험례 둘러보기
              </Link>
            </div>
          </div>

          {/* Right: Demo Animation */}
          <div className="hidden lg:block">
            <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">
                실시간 데모
              </div>

              {/* Demo steps */}
              <div className="space-y-4 mt-4">
                {demoSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl transition-all duration-500',
                      idx === activeStep
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 scale-105'
                        : idx < activeStep
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'bg-white/5 border border-transparent'
                    )}
                  >
                    <div
                      className={cn(
                        'p-2.5 rounded-xl transition-colors',
                        idx === activeStep
                          ? 'bg-purple-500 text-white'
                          : idx < activeStep
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/10 text-white/50'
                      )}
                    >
                      {idx < activeStep ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div
                        className={cn(
                          'font-medium transition-colors',
                          idx === activeStep
                            ? 'text-white'
                            : idx < activeStep
                            ? 'text-emerald-400'
                            : 'text-white/50'
                        )}
                      >
                        {step.text}
                      </div>
                      {idx === activeStep && (
                        <div className="h-1 mt-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-progress" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Result preview */}
              {activeStep === 3 && (
                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">추천 처방</span>
                  </div>
                  <div className="text-white font-semibold">이중탕가미</div>
                  <div className="text-sm text-white/60 mt-1">치험례 기반 AI 추천 결과</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KillerFeatureHighlight
