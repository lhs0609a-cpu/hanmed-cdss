import { useState, useEffect } from 'react'
import { Brain, Search, Sparkles, Database, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnalysisStep {
  id: string
  label: string
  icon: React.ElementType
  duration: number // estimated ms
}

const DEFAULT_STEPS: AnalysisStep[] = [
  { id: 'input', label: '입력 데이터 처리', icon: Database, duration: 500 },
  { id: 'analyze', label: 'AI 증상 분석', icon: Brain, duration: 2000 },
  { id: 'search', label: '치험례 검색', icon: Search, duration: 1500 },
  { id: 'recommend', label: '처방 추천 생성', icon: Sparkles, duration: 1000 },
]

interface AnalysisProgressProps {
  isLoading: boolean
  steps?: AnalysisStep[]
  className?: string
  compact?: boolean
}

export function AnalysisProgress({
  isLoading,
  steps = DEFAULT_STEPS,
  className,
  compact = false,
}: AnalysisProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime] = useState(Date.now())

  // Update elapsed time
  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0)
      setElapsedTime(0)
      return
    }

    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 100)

    return () => clearInterval(timer)
  }, [isLoading, startTime])

  // Progress through steps
  useEffect(() => {
    if (!isLoading) return

    let accumulated = 0
    const timeouts: NodeJS.Timeout[] = []

    steps.forEach((step, index) => {
      accumulated += step.duration
      const timeout = setTimeout(() => {
        setCurrentStep(index + 1)
      }, accumulated)
      timeouts.push(timeout)
    })

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [isLoading, steps])

  if (!isLoading) return null

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0)
  const progress = Math.min((elapsedTime / totalDuration) * 100, 95)

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
        <div className="flex-1 min-w-0">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {steps[Math.min(currentStep, steps.length - 1)]?.label}...
            <span className="ml-2 text-gray-400">{(elapsedTime / 1000).toFixed(1)}초</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-100 rounded-xl animate-pulse">
          <Brain className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">AI 분석 중</h3>
          <p className="text-sm text-gray-500">
            경과 시간: {(elapsedTime / 1000).toFixed(1)}초
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 rounded-full transition-all duration-300 animate-pulse"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>0%</span>
          <span>{Math.round(progress)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          const Icon = step.icon

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all',
                isComplete && 'bg-emerald-50',
                isCurrent && 'bg-teal-50 animate-pulse',
                !isComplete && !isCurrent && 'opacity-50'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  isComplete && 'bg-emerald-100 text-emerald-600',
                  isCurrent && 'bg-teal-100 text-teal-600',
                  !isComplete && !isCurrent && 'bg-gray-100 text-gray-400'
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  isComplete && 'text-emerald-700',
                  isCurrent && 'text-teal-700',
                  !isComplete && !isCurrent && 'text-gray-400'
                )}
              >
                {step.label}
              </span>
              {isComplete && (
                <span className="ml-auto text-xs text-emerald-600">완료</span>
              )}
              {isCurrent && (
                <span className="ml-auto text-xs text-teal-500">진행 중...</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Tip */}
      <div className="mt-6 p-3 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-xs text-amber-700">
          💡 <strong>팁:</strong> AI 분석은 입력된 증상과 4,300+개의 치험례를 비교하여
          가장 적합한 처방을 찾습니다. 정확한 분석을 위해 잠시만 기다려 주세요.
        </p>
      </div>
    </div>
  )
}

// Simple inline loading indicator with time
export function LoadingWithTime({ label = '로딩 중' }: { label?: string }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-2 text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{label}</span>
      <span className="text-xs text-gray-400">({seconds}초)</span>
    </div>
  )
}

export default AnalysisProgress
