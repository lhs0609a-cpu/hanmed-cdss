import { cn } from '@/lib/utils'
import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ========== 스와이프 제스처 훅 ==========

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface SwipeState {
  swiping: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
  deltaX: number
  deltaY: number
}

/**
 * 스와이프 제스처를 감지하는 훅
 * @param handlers - 방향별 스와이프 핸들러
 * @param threshold - 스와이프로 인식할 최소 이동 거리 (px)
 */
export function useSwipeGesture(handlers: SwipeHandlers, threshold = 50) {
  const [state, setState] = useState<SwipeState>({
    swiping: false,
    direction: null,
    deltaX: 0,
    deltaY: 0,
  })

  const startPos = useRef({ x: 0, y: 0 })
  const isTouch = useRef(false)

  const handleStart = useCallback((clientX: number, clientY: number) => {
    startPos.current = { x: clientX, y: clientY }
    setState({ swiping: true, direction: null, deltaX: 0, deltaY: 0 })
  }, [])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!state.swiping) return

    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    let direction: SwipeState['direction'] = null
    if (absDeltaX > absDeltaY && absDeltaX > threshold / 2) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else if (absDeltaY > absDeltaX && absDeltaY > threshold / 2) {
      direction = deltaY > 0 ? 'down' : 'up'
    }

    setState({ swiping: true, direction, deltaX, deltaY })
  }, [state.swiping, threshold])

  const handleEnd = useCallback(() => {
    const { deltaX, deltaY } = state
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    if (absDeltaX > threshold && absDeltaX > absDeltaY) {
      if (deltaX > 0) {
        handlers.onSwipeRight?.()
      } else {
        handlers.onSwipeLeft?.()
      }
    } else if (absDeltaY > threshold && absDeltaY > absDeltaX) {
      if (deltaY > 0) {
        handlers.onSwipeDown?.()
      } else {
        handlers.onSwipeUp?.()
      }
    }

    setState({ swiping: false, direction: null, deltaX: 0, deltaY: 0 })
  }, [state.deltaX, state.deltaY, threshold, handlers])

  const bindHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      isTouch.current = true
      handleStart(e.touches[0].clientX, e.touches[0].clientY)
    },
    onTouchMove: (e: React.TouchEvent) => {
      handleMove(e.touches[0].clientX, e.touches[0].clientY)
    },
    onTouchEnd: handleEnd,
    onMouseDown: (e: React.MouseEvent) => {
      if (isTouch.current) return
      handleStart(e.clientX, e.clientY)
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (isTouch.current) return
      handleMove(e.clientX, e.clientY)
    },
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
  }

  return { ...state, bindHandlers }
}

// ========== 스와이프 가능한 카드 ==========

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: { label: string; color?: string; icon?: React.ReactNode }
  rightAction?: { label: string; color?: string; icon?: React.ReactNode }
  className?: string
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
}: SwipeableCardProps) {
  const { deltaX, swiping, bindHandlers } = useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
  }, 80)

  const transform = swiping ? `translateX(${deltaX * 0.5}px)` : 'translateX(0)'
  const showLeftAction = deltaX > 40 && rightAction
  const showRightAction = deltaX < -40 && leftAction

  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      {/* Background actions */}
      {rightAction && (
        <div className={cn(
          'absolute inset-y-0 left-0 flex items-center px-4 transition-opacity',
          showLeftAction ? 'opacity-100' : 'opacity-0',
          rightAction.color || 'bg-emerald-500'
        )}>
          {rightAction.icon}
          <span className="ml-2 text-sm font-medium text-white">{rightAction.label}</span>
        </div>
      )}
      {leftAction && (
        <div className={cn(
          'absolute inset-y-0 right-0 flex items-center px-4 transition-opacity',
          showRightAction ? 'opacity-100' : 'opacity-0',
          leftAction.color || 'bg-red-500'
        )}>
          <span className="mr-2 text-sm font-medium text-white">{leftAction.label}</span>
          {leftAction.icon}
        </div>
      )}

      {/* Main content */}
      <div
        {...bindHandlers}
        className="relative bg-white transition-transform duration-150 ease-out"
        style={{ transform }}
      >
        {children}
      </div>
    </div>
  )
}

// ========== 터치 친화적 버튼 ==========

interface TouchFriendlyButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export function TouchFriendlyButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  icon,
  iconPosition = 'left',
}: TouchFriendlyButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const baseStyles = cn(
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all',
    'active:scale-95 touch-manipulation select-none',
    isPressed && 'scale-95',
    disabled && 'opacity-50 cursor-not-allowed'
  )

  const variantStyles = {
    primary: 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }

  const sizeStyles = {
    sm: 'min-h-[36px] px-3 py-2 text-sm',
    md: 'min-h-[44px] px-4 py-2.5 text-base',
    lg: 'min-h-[52px] px-6 py-3 text-lg',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  )
}

// ========== 스와이프 캐러셀 ==========

interface SwipeCarouselProps {
  children: React.ReactNode[]
  showIndicators?: boolean
  showArrows?: boolean
  autoPlay?: boolean
  autoPlayInterval?: number
  className?: string
}

export function SwipeCarousel({
  children,
  showIndicators = true,
  showArrows = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  className,
}: SwipeCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const total = children.length

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, total - 1)))
  }, [total])

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total)
  }, [total])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  const { bindHandlers } = useSwipeGesture({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  })

  // Auto play
  useEffect(() => {
    if (!autoPlay) return
    const timer = setInterval(goNext, autoPlayInterval)
    return () => clearInterval(timer)
  }, [autoPlay, autoPlayInterval, goNext])

  return (
    <div className={cn('relative', className)}>
      {/* Carousel container */}
      <div
        ref={containerRef}
        {...bindHandlers}
        className="overflow-hidden rounded-xl"
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {children.map((child, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {showArrows && total > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="이전"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="다음"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {children.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={cn(
                'h-2 rounded-full transition-all min-w-[16px]',
                index === currentIndex
                  ? 'w-6 bg-teal-500'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              )}
              aria-label={`${index + 1}번 슬라이드로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ========== 풀 다운 새로고침 ==========

interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  className?: string
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const threshold = 80

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop !== 0 || isRefreshing) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, (currentY - startY.current) * 0.5)

    if (distance > 0) {
      e.preventDefault()
      setPullDistance(Math.min(distance, threshold * 1.5))
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold * 0.8)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn('overflow-y-auto', className)}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={{ height: pullDistance }}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent',
            isRefreshing && 'animate-spin'
          )}
          style={{
            opacity: pullDistance / threshold,
            transform: `rotate(${pullDistance * 3}deg)`,
          }}
        />
      </div>

      {children}
    </div>
  )
}

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  /** 모바일에서 전체 너비 사용 */
  fullWidthMobile?: boolean
  /** 패딩 비활성화 */
  noPadding?: boolean
}

/**
 * 반응형 컨테이너
 * - 모바일: 풀 너비, 적은 패딩
 * - 태블릿: 중간 패딩
 * - 데스크톱: 최대 너비 제한, 넉넉한 패딩
 */
export function ResponsiveContainer({
  children,
  className,
  fullWidthMobile = false,
  noPadding = false,
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto',
        !noPadding && 'px-4 sm:px-6 lg:px-8',
        !fullWidthMobile && 'max-w-7xl',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * 반응형 그리드 컨테이너
 * 모바일에서는 단일 컬럼, 점진적으로 다중 컬럼으로 확장
 */
interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  /** 기본 컬럼 수 (lg 이상) */
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  /** 모바일 컬럼 수 */
  mobileCols?: 1 | 2
  /** 그리드 갭 */
  gap?: 2 | 3 | 4 | 6 | 8
}

export function ResponsiveGrid({
  children,
  className,
  cols = 3,
  mobileCols = 1,
  gap = 4,
}: ResponsiveGridProps) {
  const colsClass = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  }

  const mobileColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
  }

  const gapClass = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  }

  return (
    <div
      className={cn(
        'grid',
        mobileColsClass[mobileCols],
        'md:grid-cols-2',
        colsClass[cols],
        gapClass[gap],
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * 모바일에서 스크롤 가능한 수평 리스트
 */
interface HorizontalScrollListProps {
  children: React.ReactNode
  className?: string
  /** 아이템 간 갭 */
  gap?: 2 | 3 | 4
  /** 스냅 포인트 사용 */
  snap?: boolean
}

export function HorizontalScrollList({
  children,
  className,
  gap = 3,
  snap = true,
}: HorizontalScrollListProps) {
  const gapClass = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
  }

  return (
    <div
      className={cn(
        'flex overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide',
        snap && 'snap-x snap-mandatory',
        gapClass[gap],
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * 모바일 최적화 카드 컴포넌트
 */
interface MobileCardProps {
  children: React.ReactNode
  className?: string
  /** 모바일에서 테두리 없이 표시 */
  flatOnMobile?: boolean
  /** 터치 친화적 패딩 */
  touchFriendly?: boolean
}

export function MobileCard({
  children,
  className,
  flatOnMobile = false,
  touchFriendly = true,
}: MobileCardProps) {
  return (
    <div
      className={cn(
        'bg-white',
        flatOnMobile
          ? 'rounded-none border-x-0 md:rounded-2xl md:border'
          : 'rounded-2xl border',
        'border-gray-100',
        touchFriendly ? 'p-4 sm:p-6' : 'p-4',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * 화면 크기에 따라 다른 컴포넌트 렌더링
 */
interface ResponsiveRenderProps {
  mobile: React.ReactNode
  desktop: React.ReactNode
  /** 태블릿용 (선택적, 없으면 desktop 사용) */
  tablet?: React.ReactNode
}

export function ResponsiveRender({ mobile, desktop, tablet }: ResponsiveRenderProps) {
  return (
    <>
      {/* 모바일 */}
      <div className="block md:hidden">{mobile}</div>
      {/* 태블릿 */}
      <div className="hidden md:block lg:hidden">{tablet || desktop}</div>
      {/* 데스크톱 */}
      <div className="hidden lg:block">{desktop}</div>
    </>
  )
}

/**
 * 터치 친화적 버튼 크기 유틸리티
 */
export const touchTargetSize = {
  sm: 'min-h-[36px] min-w-[36px]',
  md: 'min-h-[44px] min-w-[44px]',
  lg: 'min-h-[48px] min-w-[48px]',
}

/**
 * Safe area 인셋 (노치/홈 인디케이터 대응)
 */
export const safeAreaInsets = {
  top: 'pt-safe-top',
  bottom: 'pb-safe-bottom',
  left: 'pl-safe-left',
  right: 'pr-safe-right',
  all: 'p-safe',
}

export default ResponsiveContainer
