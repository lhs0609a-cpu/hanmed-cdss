/**
 * Sentry 에러 추적 설정
 *
 * 프론트엔드 에러를 캡처하고 Sentry에 전송합니다.
 * VITE_SENTRY_DSN 환경변수가 설정되지 않으면 비활성화됩니다.
 */

interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
}

interface ErrorInfo {
  componentStack?: string;
  [key: string]: unknown;
}

// Sentry 초기화 상태
let isInitialized = false;
let SentryModule: typeof import('@sentry/react') | null = null;

/**
 * Sentry 초기화
 */
export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN not configured. Error tracking disabled.');
    return;
  }

  try {
    SentryModule = await import('@sentry/react');

    SentryModule.init({
      dsn,
      environment: import.meta.env.MODE || 'development',
      release: `hanmed-web@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

      // Performance monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

      // Session replay (optional)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Filtering
      beforeSend(event, hint) {
        // Filter out network errors in development
        if (import.meta.env.DEV) {
          const error = hint.originalException;
          if (error instanceof Error) {
            if (
              error.message.includes('Network Error') ||
              error.message.includes('Failed to fetch')
            ) {
              return null;
            }
          }
        }
        return event;
      },

      // Ignore common non-critical errors
      ignoreErrors: [
        // Network errors
        'Network Error',
        'Failed to fetch',
        'Load failed',
        'NetworkError',
        // Browser extensions
        'ResizeObserver loop',
        'Non-Error exception captured',
        // User cancellation
        'AbortError',
        'The user aborted a request',
      ],

      // Deny URLs (browser extensions, etc.)
      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        /^moz-extension:\/\//i,
      ],
    });

    isInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.warn('[Sentry] Failed to initialize:', error);
  }
}

/**
 * 에러 캡처
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (!isInitialized || !SentryModule) {
    console.error('[Sentry] Not initialized. Error:', error);
    return;
  }

  SentryModule.captureException(error, {
    extra: context,
  });
}

/**
 * 메시지 캡처
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!isInitialized || !SentryModule) {
    console.log(`[Sentry] Not initialized. Message (${level}):`, message);
    return;
  }

  SentryModule.captureMessage(message, level);
}

/**
 * 사용자 정보 설정
 */
export function setUser(user: { id: string; email?: string; name?: string } | null): void {
  if (!isInitialized || !SentryModule) {
    return;
  }

  SentryModule.setUser(user);
}

/**
 * 컨텍스트 설정
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  if (!isInitialized || !SentryModule) {
    return;
  }

  SentryModule.setContext(name, context);
}

/**
 * 태그 설정
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized || !SentryModule) {
    return;
  }

  SentryModule.setTag(key, value);
}

/**
 * React Error Boundary 컴포넌트 가져오기
 */
export function getErrorBoundary() {
  if (!isInitialized || !SentryModule) {
    return null;
  }
  return SentryModule.ErrorBoundary;
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
