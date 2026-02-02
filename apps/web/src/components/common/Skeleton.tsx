import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  /** 원형 스켈레톤 */
  circle?: boolean
  /** 애니메이션 비활성화 */
  noAnimation?: boolean
  /** 인라인 스타일 */
  style?: React.CSSProperties
}

/**
 * 기본 스켈레톤 컴포넌트
 */
export function Skeleton({ className, circle, noAnimation, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200',
        !noAnimation && 'animate-pulse',
        circle ? 'rounded-full' : 'rounded-lg',
        className
      )}
      style={style}
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

/**
 * AI 응답 스켈레톤
 */
export function SkeletonAIResponse({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* 처방 추천 헤더 */}
      <div className="flex items-center gap-3">
        <Skeleton circle className="w-10 h-10" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* 추천 카드들 */}
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 폼 스켈레톤
 */
export function SkeletonForm({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  )
}

/**
 * 구독 페이지 스켈레톤
 */
export function SkeletonSubscriptionPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>

      {/* 토글 */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-64 rounded-xl" />
      </div>

      {/* 사용량 */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-2xl border p-6 space-y-4">
            <Skeleton circle className="w-12 h-12" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
            <div>
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 진료 페이지 스켈레톤
 */
export function SkeletonConsultationPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* 입력 섹션 */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton circle className="w-10 h-10" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* 결과 섹션 */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-gray-50 rounded-2xl border p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton circle className="w-10 h-10" />
            <Skeleton className="h-5 w-32" />
          </div>
          <SkeletonText lines={4} />
        </div>
        <SkeletonAIResponse />
      </div>
    </div>
  )
}

/**
 * 환자 목록 스켈레톤
 */
export function SkeletonPatientList() {
  return (
    <div className="space-y-4">
      {/* 검색/필터 바 */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 flex-1 max-w-md rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* 환자 리스트 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50 last:border-b-0">
            <Skeleton circle className="w-12 h-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 약재/처방 상세 스켈레톤
 */
export function SkeletonHerbDetail() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="w-24 h-24 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl border p-6 space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="bg-white rounded-2xl border p-6 space-y-4">
        <div className="flex gap-2 border-b pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-lg" />
          ))}
        </div>
        <SkeletonText lines={6} />
      </div>
    </div>
  )
}

/**
 * 커뮤니티 게시글 목록 스켈레톤
 */
export function SkeletonPostList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton circle className="w-10 h-10" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-6 w-3/4" />
          <SkeletonText lines={2} />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Shimmer 효과가 있는 스켈레톤 (더 부드러운 로딩)
 */
export function SkeletonShimmer({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
      {children}
    </div>
  )
}

/**
 * 페이지 래퍼 - 로딩 중 레이아웃 시프트 방지
 */
export function SkeletonPageWrapper({
  isLoading,
  skeleton,
  children,
  minHeight = '400px',
}: {
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  minHeight?: string
}) {
  return (
    <div style={{ minHeight }}>
      {isLoading ? skeleton : children}
    </div>
  )
}

export default Skeleton
