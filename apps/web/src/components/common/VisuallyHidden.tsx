import { ReactNode } from 'react'

interface VisuallyHiddenProps {
  children: ReactNode
  /** 포커스 시 표시 여부 */
  focusable?: boolean
}

/**
 * 스크린리더 전용 콘텐츠
 * 시각적으로는 숨기지만 스크린리더에서는 읽힘
 */
export function VisuallyHidden({ children, focusable = false }: VisuallyHiddenProps) {
  if (focusable) {
    return (
      <span className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-500 focus:text-white focus:rounded-lg">
        {children}
      </span>
    )
  }

  return <span className="sr-only">{children}</span>
}

/**
 * Skip to content 링크
 * 키보드 사용자가 메인 콘텐츠로 바로 이동할 수 있음
 */
export function SkipToContent({ targetId = 'main-content' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-500 focus:text-white focus:rounded-lg focus:shadow-lg"
    >
      본문으로 건너뛰기
    </a>
  )
}

/**
 * 라이브 리전 (동적 콘텐츠 알림)
 */
export function LiveRegion({
  children,
  mode = 'polite',
  atomic = true,
}: {
  children: ReactNode
  mode?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
}) {
  return (
    <div
      role="status"
      aria-live={mode}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  )
}

export default VisuallyHidden
