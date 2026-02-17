/**
 * 기능 사용 추적 훅
 * 사용자의 기능 사용 패턴을 추적하여 제품 개선에 활용합니다.
 *
 * 추적 대상:
 * - 페이지 뷰
 * - 기능 사용 (AI 검색, 처방 저장 등)
 * - 버튼 클릭
 * - 에러 발생
 * - 세션 정보
 */

import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

// 이벤트 타입
export type EventType =
  | 'page_view'
  | 'feature_used'
  | 'button_click'
  | 'search_performed'
  | 'ai_query'
  | 'prescription_saved'
  | 'case_viewed'
  | 'error_occurred'
  | 'session_start'
  | 'session_end'
  | 'subscription_viewed'
  | 'trial_started'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'export_initiated'
  | 'help_accessed'

// 이벤트 속성
interface EventProperties {
  // 페이지 관련
  page?: string
  previous_page?: string

  // 기능 관련
  feature_name?: string
  feature_category?: string

  // 검색 관련
  search_query?: string
  search_type?: string
  results_count?: number

  // AI 관련
  ai_model?: string
  ai_response_time?: number
  ai_tokens_used?: number

  // 에러 관련
  error_message?: string
  error_code?: string
  error_stack?: string

  // 구독 관련
  plan_viewed?: string
  plan_selected?: string

  // 기타
  duration_ms?: number
  source?: string
  [key: string]: unknown
}

// 이벤트 데이터
interface TrackedEvent {
  type: EventType
  properties: EventProperties
  timestamp: string
  sessionId: string
  userId?: string
  userTier?: string
  userAgent: string
  screenSize: string
  locale: string
}

// 로컬 버퍼 (배치 전송용)
const EVENT_BUFFER_KEY = 'feature_tracking_buffer'
const BUFFER_FLUSH_SIZE = 10
const BUFFER_MAX_SIZE = 100 // 무제한 증가 방지
const BUFFER_FLUSH_INTERVAL_MS = 30000 // 30초

// 세션 ID 생성 (crypto API 사용)
function generateSessionId(): string {
  const stored = sessionStorage.getItem('tracking_session_id')
  if (stored) return stored

  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  const newId = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
  sessionStorage.setItem('tracking_session_id', newId)
  return newId
}

// 사용자 ID를 해시하여 PII 제거
async function hashUserId(userId: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(userId)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
}

// 화면 크기 가져오기
function getScreenSize(): string {
  return `${window.innerWidth}x${window.innerHeight}`
}

export function useFeatureTracking() {
  const location = useLocation()
  const { user } = useAuthStore()
  const previousPathRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string>(generateSessionId())
  const flushTimeoutRef = useRef<number | null>(null)

  /**
   * 이벤트 버퍼에 추가
   */
  const addToBuffer = useCallback((event: TrackedEvent) => {
    try {
      const bufferStr = localStorage.getItem(EVENT_BUFFER_KEY)
      const buffer: TrackedEvent[] = bufferStr ? JSON.parse(bufferStr) : []

      // 버퍼 최대 크기 초과 시 오래된 이벤트 제거
      if (buffer.length >= BUFFER_MAX_SIZE) {
        buffer.splice(0, buffer.length - BUFFER_MAX_SIZE + 1)
      }

      buffer.push(event)
      localStorage.setItem(EVENT_BUFFER_KEY, JSON.stringify(buffer))
      return buffer.length
    } catch {
      // localStorage 용량 초과 등 에러 시 버퍼 초기화
      localStorage.removeItem(EVENT_BUFFER_KEY)
      return 0
    }
  }, [])

  /**
   * 버퍼 플러시 (서버 전송)
   */
  const flushBuffer = useCallback(async () => {
    try {
      const bufferStr = localStorage.getItem(EVENT_BUFFER_KEY)
      if (!bufferStr) return

      const buffer: TrackedEvent[] = JSON.parse(bufferStr)
      if (buffer.length === 0) return

      // 버퍼 클리어 (전송 실패 시에도 무한 증가 방지)
      localStorage.setItem(EVENT_BUFFER_KEY, '[]')

      // 서버 전송 (실패해도 무시 - 분석 데이터라 크리티컬하지 않음)
      await api.post('/analytics/events', { events: buffer }).catch(() => {
        // 실패 시 콘솔에만 로그
        console.debug('[Analytics] 이벤트 전송 실패:', buffer.length, '건')
      })
    } catch {
      // 무시
    }
  }, [])

  /**
   * 이벤트 추적
   */
  const trackEvent = useCallback(
    (type: EventType, properties: EventProperties = {}) => {
      // userId를 해시하여 PII 보호
      const userIdPromise = user?.id ? hashUserId(user.id) : Promise.resolve(undefined)
      userIdPromise.then((hashedId) => {
        const event: TrackedEvent = {
          type,
          properties: {
            ...properties,
            page: location.pathname,
          },
          timestamp: new Date().toISOString(),
          sessionId: sessionIdRef.current,
          userId: hashedId,
          userTier: user?.subscriptionTier,
          userAgent: navigator.userAgent,
          screenSize: getScreenSize(),
          locale: navigator.language,
        }

      // 개발 환경에서는 콘솔 로그
      if (import.meta.env.DEV) {
        console.debug('[Analytics]', type, properties)
      }

        // 버퍼에 추가
        const bufferSize = addToBuffer(event)

        // 버퍼가 가득 차면 플러시
        if (bufferSize >= BUFFER_FLUSH_SIZE) {
          flushBuffer()
        }
      })
    },
    [location.pathname, user, addToBuffer, flushBuffer]
  )

  /**
   * 페이지 뷰 추적
   */
  const trackPageView = useCallback(
    (pageName?: string) => {
      trackEvent('page_view', {
        page: pageName || location.pathname,
        previous_page: previousPathRef.current || undefined,
      })
      previousPathRef.current = location.pathname
    },
    [location.pathname, trackEvent]
  )

  /**
   * 기능 사용 추적
   */
  const trackFeatureUsed = useCallback(
    (featureName: string, category?: string, additionalProps?: EventProperties) => {
      trackEvent('feature_used', {
        feature_name: featureName,
        feature_category: category,
        ...additionalProps,
      })
    },
    [trackEvent]
  )

  /**
   * AI 쿼리 추적
   */
  const trackAIQuery = useCallback(
    (queryType: string, responseTimeMs: number, tokensUsed?: number) => {
      trackEvent('ai_query', {
        feature_name: queryType,
        ai_response_time: responseTimeMs,
        ai_tokens_used: tokensUsed,
      })
    },
    [trackEvent]
  )

  /**
   * 검색 추적
   */
  const trackSearch = useCallback(
    (searchType: string, query: string, resultsCount: number) => {
      trackEvent('search_performed', {
        search_type: searchType,
        search_query: query.substring(0, 100), // 100자 제한
        results_count: resultsCount,
      })
    },
    [trackEvent]
  )

  /**
   * 에러 추적
   */
  const trackError = useCallback(
    (errorMessage: string, errorCode?: string, errorStack?: string) => {
      trackEvent('error_occurred', {
        error_message: errorMessage.substring(0, 500),
        error_code: errorCode,
        error_stack: errorStack?.substring(0, 1000),
      })
    },
    [trackEvent]
  )

  /**
   * 버튼 클릭 추적
   */
  const trackButtonClick = useCallback(
    (buttonName: string, source?: string) => {
      trackEvent('button_click', {
        feature_name: buttonName,
        source,
      })
    },
    [trackEvent]
  )

  // 자동 페이지 뷰 추적
  useEffect(() => {
    trackPageView()
  }, [location.pathname]) // trackPageView 의존성 제거 (무한 루프 방지)

  // 세션 시작 추적
  useEffect(() => {
    const sessionStarted = sessionStorage.getItem('session_start_tracked')
    if (!sessionStarted) {
      trackEvent('session_start', {})
      sessionStorage.setItem('session_start_tracked', 'true')
    }
  }, []) // trackEvent 의존성 제거

  // 주기적 버퍼 플러시
  useEffect(() => {
    flushTimeoutRef.current = window.setInterval(flushBuffer, BUFFER_FLUSH_INTERVAL_MS)

    // 페이지 언로드 시 플러시
    const handleUnload = () => {
      // sendBeacon으로 비동기 전송 시도
      const bufferStr = localStorage.getItem(EVENT_BUFFER_KEY)
      if (bufferStr) {
        const buffer = JSON.parse(bufferStr)
        if (buffer.length > 0) {
          navigator.sendBeacon?.(
            `${import.meta.env.VITE_API_URL || ''}/analytics/events`,
            JSON.stringify({ events: buffer })
          )
        }
      }
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      if (flushTimeoutRef.current) {
        clearInterval(flushTimeoutRef.current)
      }
      window.removeEventListener('beforeunload', handleUnload)
      flushBuffer() // 컴포넌트 언마운트 시 플러시
    }
  }, [flushBuffer])

  return {
    trackEvent,
    trackPageView,
    trackFeatureUsed,
    trackAIQuery,
    trackSearch,
    trackError,
    trackButtonClick,
    flushBuffer,
  }
}

/**
 * 전역 에러 핸들러와 연동된 에러 추적
 */
export function setupGlobalErrorTracking() {
  // 전역 에러 핸들러
  window.addEventListener('error', (event) => {
    const buffer = localStorage.getItem(EVENT_BUFFER_KEY)
    const events: TrackedEvent[] = buffer ? JSON.parse(buffer) : []

    events.push({
      type: 'error_occurred',
      properties: {
        error_message: event.message,
        error_stack: event.error?.stack,
        page: window.location.pathname,
      },
      timestamp: new Date().toISOString(),
      sessionId: sessionStorage.getItem('tracking_session_id') || 'unknown',
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      locale: navigator.language,
    })

    localStorage.setItem(EVENT_BUFFER_KEY, JSON.stringify(events))
  })

  // Promise 에러 핸들러
  window.addEventListener('unhandledrejection', (event) => {
    const buffer = localStorage.getItem(EVENT_BUFFER_KEY)
    const events: TrackedEvent[] = buffer ? JSON.parse(buffer) : []

    events.push({
      type: 'error_occurred',
      properties: {
        error_message: event.reason?.message || 'Unhandled Promise Rejection',
        error_stack: event.reason?.stack,
        page: window.location.pathname,
      },
      timestamp: new Date().toISOString(),
      sessionId: sessionStorage.getItem('tracking_session_id') || 'unknown',
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      locale: navigator.language,
    })

    localStorage.setItem(EVENT_BUFFER_KEY, JSON.stringify(events))
  })
}

export default useFeatureTracking
