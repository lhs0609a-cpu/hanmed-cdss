import { Suspense, ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
    </div>
  )
}

/**
 * 라우트 단위 에러 + 로딩 바운더리.
 * 한 페이지에서 발생한 예외/지연이 전체 앱을 막지 않도록 감싼다.
 */
export function RouteBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </ErrorBoundary>
  )
}
