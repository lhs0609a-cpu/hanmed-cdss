import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react'
import { createPortal } from 'react-dom'

export interface TourStep {
  target: string // CSS selector for the target element
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  tip?: string
}

interface TourGuideProps {
  tourId: string
  steps: TourStep[]
  onComplete?: () => void
}

const STORAGE_KEY = 'hanmed-cdss-completed-tours'

export default function TourGuide({ tourId, steps, onComplete }: TourGuideProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [showStartButton, setShowStartButton] = useState(false)

  // Check if tour was already completed
  useEffect(() => {
    const completedTours = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (!completedTours[tourId]) {
      // First time visitor - show start button after delay
      const timer = setTimeout(() => {
        setShowStartButton(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [tourId])

  // Update target element position
  const updateTargetPosition = useCallback(() => {
    if (!isActive || !steps[currentStep]) return

    const targetEl = document.querySelector(steps[currentStep].target)
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect()
      setTargetRect(rect)

      // Scroll element into view if needed
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isActive, currentStep, steps])

  useEffect(() => {
    updateTargetPosition()

    // Update on resize/scroll
    window.addEventListener('resize', updateTargetPosition)
    window.addEventListener('scroll', updateTargetPosition, true)

    return () => {
      window.removeEventListener('resize', updateTargetPosition)
      window.removeEventListener('scroll', updateTargetPosition, true)
    }
  }, [updateTargetPosition])

  const startTour = () => {
    setShowStartButton(false)
    setIsActive(true)
    setCurrentStep(0)
  }

  const endTour = (completed = false) => {
    setIsActive(false)
    setCurrentStep(0)
    setTargetRect(null)

    if (completed) {
      const completedTours = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      completedTours[tourId] = true
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completedTours))
      onComplete?.()
    }
    setShowStartButton(false)
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      endTour(true)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const getTooltipPosition = () => {
    if (!targetRect) return { top: '50%', left: '50%' }

    const step = steps[currentStep]
    const placement = step.placement || 'bottom'
    const padding = 16
    const tooltipWidth = 320
    const tooltipHeight = 200

    let top = 0
    let left = 0

    switch (placement) {
      case 'top':
        top = targetRect.top - tooltipHeight - padding
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'bottom':
        top = targetRect.bottom + padding
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.left - tooltipWidth - padding
        break
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.right + padding
        break
    }

    // Keep tooltip in viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding))

    return { top: `${top}px`, left: `${left}px` }
  }

  const getArrowPosition = () => {
    const step = steps[currentStep]
    const placement = step.placement || 'bottom'

    switch (placement) {
      case 'top':
        return 'bottom-[-8px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-white'
      case 'bottom':
        return 'top-[-8px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-white'
      case 'left':
        return 'right-[-8px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-white'
      case 'right':
        return 'left-[-8px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-white'
    }
  }

  // Start Tour Button (floating)
  if (showStartButton && !isActive) {
    return createPortal(
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={() => setShowStartButton(false)} />

        {/* Start tour card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Lightbulb className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                처음이신가요?
              </h2>
              <p className="text-gray-600 mb-6">
                이 페이지 사용법을 단계별로 안내해 드릴게요.<br />
                약 1분 정도 소요됩니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStartButton(false)
                    // Mark as skipped
                    const completedTours = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
                    completedTours[tourId] = true
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedTours))
                  }}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  건너뛰기
                </button>
                <button
                  onClick={startTour}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  시작하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Active tour overlay
  if (!isActive || !targetRect) return null

  const step = steps[currentStep]
  const tooltipPos = getTooltipPosition()

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay with spotlight hole */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - 8}
              y={targetRect.top - 8}
              width={targetRect.width + 16}
              height={targetRect.height + 16}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={() => {}} // Block clicks on overlay
        />
      </svg>

      {/* Highlight border around target */}
      <div
        className="absolute border-2 border-blue-400 rounded-xl pointer-events-none animate-pulse"
        style={{
          left: targetRect.left - 8,
          top: targetRect.top - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.5)',
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute w-80 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={tooltipPos}
      >
        {/* Arrow */}
        <div
          className={`absolute w-0 h-0 border-8 ${getArrowPosition()}`}
        />

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-sm font-medium px-2 py-0.5 rounded">
                {currentStep + 1} / {steps.length}
              </span>
            </div>
            <button
              onClick={() => endTour(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <h3 className="text-lg font-bold mt-2">{step.title}</h3>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-gray-700 leading-relaxed">{step.content}</p>

          {step.tip && (
            <div className="mt-3 flex items-start gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-xl">
              <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{step.tip}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-5 pb-5 flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>

          {/* Progress dots */}
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStep ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            {currentStep === steps.length - 1 ? '완료' : '다음'}
            {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Help button to restart tour later */}
      <button
        onClick={() => endTour(false)}
        className="fixed bottom-6 right-6 px-4 py-2 bg-white/90 backdrop-blur text-gray-700 rounded-xl shadow-lg font-medium hover:bg-white transition-colors"
      >
        나중에 보기
      </button>
    </div>,
    document.body
  )
}

// Helper component to add restart tour button
export function TourRestartButton({ tourId, onClick }: { tourId: string; onClick: () => void }) {
  const [hasCompleted, setHasCompleted] = useState(false)

  useEffect(() => {
    const completedTours = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    setHasCompleted(!!completedTours[tourId])
  }, [tourId])

  const handleRestart = () => {
    const completedTours = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    delete completedTours[tourId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedTours))
    onClick()
  }

  if (!hasCompleted) return null

  return (
    <button
      onClick={handleRestart}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg font-medium hover:shadow-xl transition-all"
      title="사용법 다시 보기"
    >
      <Lightbulb className="h-5 w-5" />
      <span className="hidden sm:inline">가이드 보기</span>
    </button>
  )
}
