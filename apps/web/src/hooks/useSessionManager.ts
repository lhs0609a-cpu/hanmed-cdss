/**
 * 세션 관리 훅
 * - 토큰 자동 갱신
 * - 세션 만료 경고
 * - 사용자 활동 기반 세션 연장
 * - 다중 탭 동기화
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { apiWithoutRetry } from '@/services/api'

// 세션 설정
const SESSION_CONFIG = {
  /** 토큰 갱신 시도 시점 (만료 5분 전) */
  REFRESH_THRESHOLD_MS: 5 * 60 * 1000,
  /** 세션 만료 경고 표시 시점 (만료 2분 전) */
  WARNING_THRESHOLD_MS: 2 * 60 * 1000,
  /** 비활동 시간 후 세션 만료 (30분) */
  INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,
  /** 활동 체크 간격 (1분) */
  ACTIVITY_CHECK_INTERVAL_MS: 60 * 1000,
  /** 토큰 체크 간격 (30초) */
  TOKEN_CHECK_INTERVAL_MS: 30 * 1000,
}

interface SessionState {
  isSessionWarningVisible: boolean
  warningSecondsLeft: number
  isRefreshing: boolean
  lastActivity: number
}

interface TokenPayload {
  exp: number
  iat: number
  sub: string
}

/**
 * JWT 토큰에서 페이로드 추출
 */
function parseJwt(token: string): TokenPayload | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * 토큰 만료까지 남은 시간 (ms)
 */
function getTimeUntilExpiry(token: string): number {
  const payload = parseJwt(token)
  if (!payload) return 0
  return payload.exp * 1000 - Date.now()
}

export function useSessionManager() {
  const { accessToken, refreshToken, logout, login, user } = useAuthStore()
  const [state, setState] = useState<SessionState>({
    isSessionWarningVisible: false,
    warningSecondsLeft: 0,
    isRefreshing: false,
    lastActivity: Date.now(),
  })

  const warningIntervalRef = useRef<number | null>(null)
  const activityTimeoutRef = useRef<number | null>(null)

  /**
   * 토큰 갱신
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (!refreshToken || state.isRefreshing) return false

    setState((prev) => ({ ...prev, isRefreshing: true }))

    try {
      const response = await apiWithoutRetry.post('/auth/refresh', {
        refreshToken,
      })

      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: userData } = response.data

      if (newAccessToken && user) {
        login(userData || user, newAccessToken, newRefreshToken || refreshToken)
        setState((prev) => ({
          ...prev,
          isRefreshing: false,
          isSessionWarningVisible: false,
        }))
        return true
      }
    } catch (error) {
      console.error('토큰 갱신 실패:', error)
      // 갱신 실패 시 로그아웃하지 않고 경고만 표시
      // 사용자가 수동으로 로그인하도록 유도
    }

    setState((prev) => ({ ...prev, isRefreshing: false }))
    return false
  }, [refreshToken, user, login, state.isRefreshing])

  /**
   * 세션 연장 (사용자 활동 시)
   */
  const extendSession = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      lastActivity: Date.now(),
      isSessionWarningVisible: false,
    }))

    // 토큰이 곧 만료될 예정이면 갱신
    if (accessToken) {
      const timeUntilExpiry = getTimeUntilExpiry(accessToken)
      if (timeUntilExpiry < SESSION_CONFIG.REFRESH_THRESHOLD_MS) {
        await refreshAccessToken()
      }
    }
  }, [accessToken, refreshAccessToken])

  /**
   * 세션 만료 경고 닫기 (세션 연장)
   */
  const dismissWarning = useCallback(() => {
    extendSession()
  }, [extendSession])

  /**
   * 로그아웃 (세션 만료)
   */
  const handleSessionExpired = useCallback(() => {
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current)
    }
    setState((prev) => ({ ...prev, isSessionWarningVisible: false }))
    logout()
    // 로그인 페이지로 이동하면서 세션 만료 메시지 표시
    window.location.href = '/login?reason=session_expired'
  }, [logout])

  // 토큰 만료 체크 및 갱신 스케줄링
  useEffect(() => {
    if (!accessToken) return

    const checkTokenExpiry = () => {
      const timeUntilExpiry = getTimeUntilExpiry(accessToken)

      if (timeUntilExpiry <= 0) {
        // 이미 만료됨
        handleSessionExpired()
        return
      }

      if (timeUntilExpiry <= SESSION_CONFIG.WARNING_THRESHOLD_MS) {
        // 경고 표시
        setState((prev) => ({
          ...prev,
          isSessionWarningVisible: true,
          warningSecondsLeft: Math.floor(timeUntilExpiry / 1000),
        }))

        // 카운트다운 시작
        if (!warningIntervalRef.current) {
          warningIntervalRef.current = window.setInterval(() => {
            setState((prev) => {
              const newSeconds = prev.warningSecondsLeft - 1
              if (newSeconds <= 0) {
                handleSessionExpired()
                return prev
              }
              return { ...prev, warningSecondsLeft: newSeconds }
            })
          }, 1000)
        }
      } else if (timeUntilExpiry <= SESSION_CONFIG.REFRESH_THRESHOLD_MS) {
        // 자동 갱신 시도
        refreshAccessToken()
      }
    }

    // 초기 체크
    checkTokenExpiry()

    // 주기적 체크
    const intervalId = window.setInterval(checkTokenExpiry, SESSION_CONFIG.TOKEN_CHECK_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current)
        warningIntervalRef.current = null
      }
    }
  }, [accessToken, refreshAccessToken, handleSessionExpired])

  // 사용자 활동 감지
  useEffect(() => {
    if (!accessToken) return

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']

    const handleActivity = () => {
      // 쓰로틀링: 10초에 한 번만 업데이트
      const now = Date.now()
      if (now - state.lastActivity > 10000) {
        setState((prev) => ({ ...prev, lastActivity: now }))
      }
    }

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [accessToken, state.lastActivity])

  // 비활동 타임아웃 체크
  useEffect(() => {
    if (!accessToken) return

    const checkInactivity = () => {
      const inactiveDuration = Date.now() - state.lastActivity
      if (inactiveDuration >= SESSION_CONFIG.INACTIVITY_TIMEOUT_MS) {
        handleSessionExpired()
      }
    }

    activityTimeoutRef.current = window.setInterval(
      checkInactivity,
      SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL_MS
    )

    return () => {
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current)
      }
    }
  }, [accessToken, state.lastActivity, handleSessionExpired])

  // 다중 탭 동기화 (storage 이벤트)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-storage') {
        // 다른 탭에서 로그아웃됨
        const newValue = e.newValue ? JSON.parse(e.newValue) : null
        if (!newValue?.state?.isAuthenticated && accessToken) {
          window.location.href = '/login?reason=logged_out_other_tab'
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [accessToken])

  return {
    isSessionWarningVisible: state.isSessionWarningVisible,
    warningSecondsLeft: state.warningSecondsLeft,
    isRefreshing: state.isRefreshing,
    extendSession,
    dismissWarning,
    handleSessionExpired,
    refreshAccessToken,
  }
}

export default useSessionManager
