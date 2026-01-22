import { cn } from '@/lib/utils'

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
