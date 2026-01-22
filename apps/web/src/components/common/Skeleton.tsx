import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  /** 원형 스켈레톤 */
  circle?: boolean
  /** 애니메이션 비활성화 */
  noAnimation?: boolean
}

/**
 * 기본 스켈레톤 컴포넌트
 */
export function Skeleton({ className, circle, noAnimation }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200',
        !noAnimation && 'animate-pulse',
        circle ? 'rounded-full' : 'rounded-lg',
        className
      )}
    />
  )
}

/**
 * 텍스트 라인 스켈레톤
 */
export function SkeletonText({
  lines = 1,
  className,
  lastLineWidth = '75%',
}: {
  lines?: number
  className?: string
  lastLineWidth?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-4"
          style={{
            width: index === lines - 1 && lines > 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  )
}

/**
 * 카드 스켈레톤
 */
export function SkeletonCard({
  className,
  hasImage = false,
  lines = 3,
}: {
  className?: string
  hasImage?: boolean
  lines?: number
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 p-6 space-y-4',
        className
      )}
    >
      {hasImage && <Skeleton className="w-full h-40 rounded-xl" />}
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <SkeletonText lines={lines} />
      </div>
    </div>
  )
}

/**
 * 리스트 아이템 스켈레톤
 */
export function SkeletonListItem({
  className,
  hasAvatar = false,
}: {
  className?: string
  hasAvatar?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl',
        className
      )}
    >
      {hasAvatar && <Skeleton circle className="w-10 h-10" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

/**
 * 테이블 스켈레톤
 */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: cols }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-4 flex-1',
                colIndex === 0 && 'w-1/4',
                colIndex === cols - 1 && 'w-16'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * 프로필 스켈레톤
 */
export function SkeletonProfile({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Skeleton circle className="w-16 h-16" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  )
}

/**
 * 통계 카드 스켈레톤
 */
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton circle className="w-12 h-12" />
      </div>
    </div>
  )
}

/**
 * 대시보드 스켈레톤
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl h-40" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <SkeletonCard lines={5} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    </div>
  )
}

/**
 * 치험례 카드 스켈레톤
 */
export function SkeletonCaseCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 p-6',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>

      <div className="space-y-3">
        <div className="flex gap-4">
          <div className="flex-1">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-12 mb-1" />
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  )
}

/**
 * 검색 결과 스켈레톤
 */
export function SkeletonSearchResults({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCaseCard key={index} />
      ))}
    </div>
  )
}

export default Skeleton
