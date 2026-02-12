/**
 * 기능 스포트라이트 컴포넌트
 * 새로운 기능이나 중요한 기능을 사용자에게 하이라이트하여 안내합니다.
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// 스포트라이트 대상 정의
export interface SpotlightTarget {
  /** 고유 ID */
  id: string
  /** 대상 요소 선택자 */
  selector: string
  /** 제목 */
  title: string
  /** 설명 */
  description: string
  /** 버전 (새 버전에서만 표시) */
  version?: string
  /** 배지 텍스트 */
  badge?: 'NEW' | 'HOT' | 'PRO' | 'TIP'
  /** 위치 */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  /** 액션 버튼 */
  action?: {
    label: string
    onClick: () => void
  }
}

// 스포트라이트 시퀀스 (여러 기능 순서대로 안내)
export interface SpotlightSequence {
  id: string
  name: string
  targets: SpotlightTarget[]
}

// 컨텍스트 타입
interface SpotlightContextType {
  /** 스포트라이트 시작 */
  startSpotlight: (sequence: SpotlightSequence) => void
  /** 단일 타겟 하이라이트 */
  highlightTarget: (target: SpotlightTarget) => void
  /** 스포트라이트 종료 */
  endSpotlight: () => void
  /** 현재 활성 상태 */
  isActive: boolean
  /** 이미 본 스포트라이트 확인 */
  hasSeenSpotlight: (id: string) => boolean
  /** 스포트라이트 본 것으로 표시 */
  markAsSeen: (id: string) => void
}

const SpotlightContext = createContext<SpotlightContextType | null>(null)

// 로컬 스토리지 키
const SEEN_SPOTLIGHTS_KEY = 'seen_spotlights'
const SPOTLIGHT_VERSION_KEY = 'spotlight_version'
const CURRENT_VERSION = '1.0.0' // 버전 업데이트 시 모든 스포트라이트 리셋

export function SpotlightProvider({ children }: { children: React.ReactNode }) {
  const [sequence, setSequence] = useState<SpotlightSequence | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())

  // 초기화: 본 스포트라이트 로드
  useEffect(() => {
    const storedVersion = localStorage.getItem(SPOTLIGHT_VERSION_KEY)
    if (storedVersion !== CURRENT_VERSION) {
      // 버전 변경 시 리셋
      localStorage.setItem(SPOTLIGHT_VERSION_KEY, CURRENT_VERSION)
      localStorage.removeItem(SEEN_SPOTLIGHTS_KEY)
      setSeenIds(new Set())
    } else {
      const stored = localStorage.getItem(SEEN_SPOTLIGHTS_KEY)
      if (stored) {
        setSeenIds(new Set(JSON.parse(stored)))
      }
    }
  }, [])

  // 현재 타겟
  const currentTarget = sequence?.targets[currentIndex] || null

  // 타겟 요소 위치 업데이트
  useEffect(() => {
    if (!currentTarget) {
      setTargetRect(null)
      return
    }

    const updatePosition = () => {
      const element = document.querySelector(currentTarget.selector)
      if (element) {
        setTargetRect(element.getBoundingClientRect())
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [currentTarget])

  const hasSeenSpotlight = useCallback((id: string) => seenIds.has(id), [seenIds])

  const markAsSeen = useCallback((id: string) => {
    setSeenIds((prev) => {
      const newSet = new Set(prev)
      newSet.add(id)
      localStorage.setItem(SEEN_SPOTLIGHTS_KEY, JSON.stringify([...newSet]))
      return newSet
    })
  }, [])

  const startSpotlight = useCallback(
    (newSequence: SpotlightSequence) => {
      // 이미 본 시퀀스는 건너뜀
      if (hasSeenSpotlight(newSequence.id)) return

      setSequence(newSequence)
      setCurrentIndex(0)
    },
    [hasSeenSpotlight]
  )

  const highlightTarget = useCallback((target: SpotlightTarget) => {
    setSequence({ id: target.id, name: target.title, targets: [target] })
    setCurrentIndex(0)
  }, [])

  const endSpotlight = useCallback(() => {
    if (sequence) {
      markAsSeen(sequence.id)
    }
    setSequence(null)
    setCurrentIndex(0)
  }, [sequence, markAsSeen])

  const goNext = useCallback(() => {
    if (!sequence) return
    if (currentIndex < sequence.targets.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      endSpotlight()
    }
  }, [sequence, currentIndex, endSpotlight])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  // 툴팁 위치 계산
  const getTooltipPosition = () => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

    const padding = 16
    const tooltipWidth = 320
    const tooltipHeight = 200

    let top = 0
    let left = 0
    let position = currentTarget?.position || 'auto'

    // Auto 위치 결정
    if (position === 'auto') {
      const spaceAbove = targetRect.top
      const spaceBelow = window.innerHeight - targetRect.bottom
      const spaceRight = window.innerWidth - targetRect.right

      if (spaceBelow >= tooltipHeight + padding) {
        position = 'bottom'
      } else if (spaceAbove >= tooltipHeight + padding) {
        position = 'top'
      } else if (spaceRight >= tooltipWidth + padding) {
        position = 'right'
      } else {
        position = 'left'
      }
    }

    switch (position) {
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

    // 화면 경계 체크
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding))

    return { top: `${top}px`, left: `${left}px` }
  }

  const tooltipStyle = getTooltipPosition()

  return (
    <SpotlightContext.Provider
      value={{
        startSpotlight,
        highlightTarget,
        endSpotlight,
        isActive: !!sequence,
        hasSeenSpotlight,
        markAsSeen,
      }}
    >
      {children}

      {/* 스포트라이트 오버레이 */}
      {sequence && currentTarget && (
        <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
          {/* 배경 오버레이 (타겟 영역 제외) */}
          <div
            className="absolute inset-0"
            style={{
              background: targetRect
                ? `radial-gradient(
                    ellipse ${targetRect.width + 40}px ${targetRect.height + 40}px at
                    ${targetRect.left + targetRect.width / 2}px
                    ${targetRect.top + targetRect.height / 2}px,
                    transparent 0%,
                    rgba(0, 0, 0, 0.75) 100%
                  )`
                : 'rgba(0, 0, 0, 0.75)',
            }}
            onClick={endSpotlight}
          />

          {/* 타겟 하이라이트 */}
          {targetRect && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                borderRadius: '12px',
                boxShadow: '0 0 0 4px rgba(20, 184, 166, 0.5), 0 0 20px rgba(20, 184, 166, 0.3)',
              }}
            />
          )}

          {/* 툴팁 */}
          <div
            className="absolute w-80 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={tooltipStyle}
          >
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {currentTarget.badge && (
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-bold rounded-full',
                        currentTarget.badge === 'NEW' && 'bg-white/20',
                        currentTarget.badge === 'HOT' && 'bg-red-500',
                        currentTarget.badge === 'PRO' && 'bg-amber-500',
                        currentTarget.badge === 'TIP' && 'bg-blue-500'
                      )}
                    >
                      {currentTarget.badge}
                    </span>
                  )}
                </div>
                <button
                  onClick={endSpotlight}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-lg font-bold mt-1">{currentTarget.title}</h3>
            </div>

            {/* 본문 */}
            <div className="p-4">
              <p className="text-gray-600 text-sm leading-relaxed">{currentTarget.description}</p>

              {/* 액션 버튼 */}
              {currentTarget.action && (
                <button
                  onClick={() => {
                    currentTarget.action?.onClick()
                    goNext()
                  }}
                  className="mt-4 w-full py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors"
                >
                  {currentTarget.action.label}
                </button>
              )}
            </div>

            {/* 네비게이션 */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between">
                {/* 진행 표시 */}
                <div className="flex items-center gap-1">
                  {sequence.targets.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        index === currentIndex ? 'bg-teal-500' : 'bg-gray-300'
                      )}
                    />
                  ))}
                </div>

                {/* 버튼 */}
                <div className="flex items-center gap-2">
                  {currentIndex > 0 && (
                    <button
                      onClick={goPrev}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      이전
                    </button>
                  )}
                  <button
                    onClick={goNext}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors"
                  >
                    {currentIndex < sequence.targets.length - 1 ? (
                      <>
                        다음
                        <ChevronRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        완료
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SpotlightContext.Provider>
  )
}

// 훅
export function useSpotlight() {
  const context = useContext(SpotlightContext)
  if (!context) {
    throw new Error('useSpotlight must be used within SpotlightProvider')
  }
  return context
}

// 미리 정의된 스포트라이트 시퀀스
export const SPOTLIGHT_SEQUENCES = {
  // 새 기능 소개
  newFeatures: {
    id: 'new-features-v1.0',
    name: '새로운 기능 안내',
    targets: [
      {
        id: 'voice-chart',
        selector: '[data-spotlight="voice-chart"]',
        title: '음성 차트 기능',
        description:
          '진료 내용을 음성으로 녹음하면 AI가 자동으로 SOAP 형식의 차트로 변환합니다. 타이핑 없이 빠르게 차트를 작성하세요!',
        badge: 'NEW' as const,
      },
      {
        id: 'ai-case-search',
        selector: '[data-spotlight="ai-case-search"]',
        title: 'AI 치험례 검색',
        description:
          '증상을 입력하면 6,000개 이상의 치험례에서 유사한 케이스를 AI가 찾아드립니다. 유사도 점수와 함께 추천 처방을 확인하세요.',
        badge: 'HOT' as const,
      },
      {
        id: 'cloud-sync',
        selector: '[data-spotlight="cloud-sync"]',
        title: '클라우드 동기화',
        description:
          'Pro 플랜에서 맥진 기록, 음성 차트 등의 데이터가 클라우드에 자동 동기화됩니다. 여러 기기에서 안전하게 접근하세요.',
        badge: 'PRO' as const,
      },
    ],
  } as SpotlightSequence,

  // 프로 기능 하이라이트
  proFeatures: {
    id: 'pro-features-highlight',
    name: 'Pro 기능 안내',
    targets: [
      {
        id: 'analytics',
        selector: '[data-spotlight="analytics"]',
        title: '진료 성과 분석',
        description:
          '일별/월별 진료 통계, 처방 패턴 분석, 환자 재방문율 등 데이터 기반의 인사이트를 확인하세요.',
        badge: 'PRO' as const,
      },
      {
        id: 'smart-insurance',
        selector: '[data-spotlight="smart-insurance"]',
        title: '스마트 보험청구',
        description:
          'AI가 삭감 위험을 미리 분석하고, 보험 청구서를 자동으로 작성합니다. 청구 반려율을 낮추세요.',
        badge: 'PRO' as const,
      },
    ],
  } as SpotlightSequence,
}

export default SpotlightProvider
