import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
}

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

export default function Loader({
  size = 'md',
  text,
  fullScreen = false,
  className,
}: LoaderProps) {
  const content = (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-label={text || '로딩 중'}
    >
      <Loader2 className={cn('animate-spin text-teal-500', sizeClasses[size])} aria-hidden="true" />
      {text && (
        <p className={cn('text-gray-500', textSizeClasses[size])}>{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="로딩 중"
      >
        {content}
      </div>
    )
  }

  return content
}

// Skeleton loader for content placeholders
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  )
}

// Button loader state
export function ButtonLoader({ text = '처리 중...' }: { text?: string }) {
  return (
    <span className="flex items-center gap-2" role="status" aria-label={text}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {text}
    </span>
  )
}

// Card skeleton for list items
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}

// Page loading state
export function PageLoader({ text = '로딩 중...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]" aria-busy="true">
      <Loader size="lg" text={text} />
    </div>
  )
}
