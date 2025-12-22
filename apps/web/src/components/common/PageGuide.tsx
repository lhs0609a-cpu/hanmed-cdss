import { useState, useEffect } from 'react'
import { HelpCircle, X, ChevronRight, ChevronLeft, Lightbulb, Target, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GuideStep {
  title: string
  description: string
  tip?: string
}

export interface PageGuideProps {
  pageId: string
  pageTitle: string
  pageDescription: string
  whenToUse: string[]
  steps: GuideStep[]
  tips?: string[]
}

const STORAGE_KEY = 'hanmed-cdss-seen-guides'

export default function PageGuide({
  pageId,
  pageTitle,
  pageDescription,
  whenToUse,
  steps,
  tips = [],
}: PageGuideProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenGuide, setHasSeenGuide] = useState(true)
  const [showPulse, setShowPulse] = useState(false)

  useEffect(() => {
    const seenGuides = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (!seenGuides[pageId]) {
      setHasSeenGuide(false)
      setShowPulse(true)
      // Auto-show guide for first-time visitors after a short delay
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [pageId])

  const markAsSeen = () => {
    const seenGuides = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    seenGuides[pageId] = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seenGuides))
    setHasSeenGuide(true)
    setShowPulse(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    setCurrentStep(0)
    markAsSeen()
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg transition-all duration-300',
          'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700',
          'hover:scale-110 hover:shadow-xl',
          showPulse && !hasSeenGuide && 'animate-pulse ring-4 ring-blue-300'
        )}
        title="사용 가이드"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {/* Guide Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <span className="text-blue-100 text-sm font-medium">사용 가이드</span>
              </div>
              <h2 className="text-2xl font-bold">{pageTitle}</h2>
              <p className="mt-2 text-blue-100">{pageDescription}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* When to Use */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-amber-600" />
                  <h3 className="font-bold text-amber-900">언제 사용하나요?</h3>
                </div>
                <ul className="space-y-2">
                  {whenToUse.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Play className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">사용 방법</h3>
                  <span className="ml-auto text-sm text-gray-500">
                    {currentStep + 1} / {steps.length}
                  </span>
                </div>

                {/* Step Progress */}
                <div className="flex gap-1 mb-4">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        'flex-1 h-1.5 rounded-full transition-all',
                        index <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                      )}
                    />
                  ))}
                </div>

                {/* Current Step */}
                <div className="bg-gray-50 rounded-2xl p-5 min-h-[140px]">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {currentStep + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2">
                        {steps[currentStep].title}
                      </h4>
                      <p className="text-gray-600 leading-relaxed">
                        {steps[currentStep].description}
                      </p>
                      {steps[currentStep].tip && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-xl">
                          <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>{steps[currentStep].tip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              {tips.length > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-green-600" />
                    <h3 className="font-bold text-green-900">꿀팁</h3>
                  </div>
                  <ul className="space-y-2">
                    {tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-green-800">
                        <span className="text-green-500 mt-0.5">✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-100">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                  currentStep === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </button>

              <button
                onClick={handleClose}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                건너뛰기
              </button>

              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                {currentStep === steps.length - 1 ? '시작하기' : '다음'}
                {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
