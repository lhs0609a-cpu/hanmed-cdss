import { useState, useEffect } from 'react'
import { Brain, Search, Sparkles, Database, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BASE_STATS, formatStatNumber } from '@/config/stats.config'

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
  timeoutMs?: number
  onTimeout?: () => void
  onCancel?: () => void
}

export function AnalysisProgress({
  isLoading,
  steps = DEFAULT_STEPS,
  className,
  compact = false,
  timeoutMs = 60000,
  onTimeout,
  onCancel,
}: AnalysisProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime] = useState(Date.now())
  const [isTimedOut, setIsTimedOut] = useState(false)

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

  // Timeout handling
  useEffect(() => {
    if (!isLoading || isTimedOut) return

    const timeout = setTimeout(() => {
      setIsTimedOut(true)
      onTimeout?.()
    }, timeoutMs)

    return () => clearTimeout(timeout)
  }, [isLoading, timeoutMs, onTimeout, isTimedOut])

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
    const currentStepLabel = steps[Math.min(currentStep, steps.length - 1)]?.label
    return (
      <div
        className={cn('flex items-center gap-3', className)}
        role="status"
        aria-live="polite"
        aria-label={`AI 분석 진행 중: ${currentStepLabel}`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-teal-500" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div
            className="h-1.5 bg-gray-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="AI 분석 진행률"
          >
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {currentStepLabel}...
            <span className="ml-2 text-gray-400">{(elapsedTime / 1000).toFixed(1)}초</span>
          </p>
        </div>
      </div>
    )
  }

  const currentStepLabel = steps[Math.min(currentStep, steps.length - 1)]?.label

  return (
    <div
      className={cn('bg-white rounded-2xl border border-gray-100 p-6', className)}
      role="region"
      aria-label="AI 분석 진행 상황"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-100 rounded-xl animate-pulse" aria-hidden="true">
          <Brain className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900" id="analysis-title">AI 분석 중</h3>
          <p className="text-sm text-gray-500" aria-live="polite">
            경과 시간: {(elapsedTime / 1000).toFixed(1)}초
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div
          className="h-2 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-labelledby="analysis-title"
          aria-valuetext={`${Math.round(progress)}% 완료, 현재 단계: ${currentStepLabel}`}
        >
          <div
            className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 rounded-full transition-all duration-300 animate-pulse"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400" aria-hidden="true">
          <span>0%</span>
          <span>{Math.round(progress)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-3" aria-label="AI 분석 단계">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          const Icon = step.icon
          const stepStatus = isComplete ? '완료' : isCurrent ? '진행 중' : '대기 중'

          return (
            <li
              key={step.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all',
                isComplete && 'bg-emerald-50',
                isCurrent && 'bg-teal-50 animate-pulse',
                !isComplete && !isCurrent && 'opacity-50'
              )}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`${step.label}: ${stepStatus}`}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  isComplete && 'bg-emerald-100 text-emerald-600',
                  isCurrent && 'bg-teal-100 text-teal-600',
                  !isComplete && !isCurrent && 'bg-gray-100 text-gray-400'
                )}
                aria-hidden="true"
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
                <span className="ml-auto text-xs text-emerald-600" aria-hidden="true">완료</span>
              )}
              {isCurrent && (
                <span className="ml-auto text-xs text-teal-500" aria-hidden="true">진행 중...</span>
              )}
            </li>
          )
        })}
      </ol>

      {/* Timeout Warning */}
      {isTimedOut && (
        <div className="mt-6 p-3 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs text-red-700">
            분석이 예상보다 오래 걸리고 있습니다. 네트워크 상태를 확인하거나 다시 시도해 주세요.
          </p>
        </div>
      )}

      {/* Tip + Cancel */}
      <div className="mt-6 flex items-center justify-between">
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex-1">
          <p className="text-xs text-amber-700">
            AI 분석은 입력된 증상과 {formatStatNumber(BASE_STATS.cases)}개의 치험례를 비교하여
            가장 적합한 처방을 찾습니다.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="ml-3 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
        )}
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
    <div
      className="flex items-center gap-2 text-gray-500"
      role="status"
      aria-live="polite"
      aria-label={`${label}, ${seconds}초 경과`}
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
      <span className="text-xs text-gray-400">({seconds}초)</span>
    </div>
  )
}

export default AnalysisProgress
