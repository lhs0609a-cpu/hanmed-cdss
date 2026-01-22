/**
 * Sentry 에러 추적 설정 (Stub)
 *
 * @sentry/react가 설치되지 않은 환경을 위한 stub 구현입니다.
 * Sentry를 활성화하려면 @sentry/react를 설치하고 이 파일을 업데이트하세요.
 */

/**
 * Sentry 초기화 (no-op)
 */
export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN not configured. Error tracking disabled.');
    return;
  }

  console.warn('[Sentry] @sentry/react is not installed. Error tracking disabled.');
}

/**
 * 에러 캡처 (console fallback)
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  console.error('[Sentry Stub] Error:', error, context);
}

/**
 * 메시지 캡처 (console fallback)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  const logFn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log;
  logFn(`[Sentry Stub] ${level}:`, message);
}

/**
 * 사용자 정보 설정 (no-op)
 */
export function setUser(_user: { id: string; email?: string; name?: string } | null): void {
  // no-op
}

/**
 * 컨텍스트 설정 (no-op)
 */
export function setContext(_name: string, _context: Record<string, unknown>): void {
  // no-op
}

/**
 * 태그 설정 (no-op)
 */
export function setTag(_key: string, _value: string): void {
  // no-op
}

/**
 * React Error Boundary 컴포넌트 가져오기 (null 반환)
 */
export function getErrorBoundary() {
  return null;
}

/**
 * React Error Boundary Fallback 렌더링
 */
export interface FallbackProps {
  error: Error;
  componentStack: string | null;
  eventId: string | null;
  resetError: () => void;
}
