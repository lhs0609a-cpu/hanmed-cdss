import axios, { AxiosError } from 'axios'
import type { ApiError } from '@/types'

/**
 * API 에러를 사용자 친화적인 메시지로 변환
 */
export function getErrorMessage(error: unknown): string {
  // Axios 에러인 경우
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>

    // 서버에서 제공한 에러 메시지가 있는 경우
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }

    // HTTP 상태 코드에 따른 기본 메시지
    switch (axiosError.response?.status) {
      case 400:
        return '잘못된 요청입니다. 입력 내용을 확인해주세요.'
      case 401:
        return '로그인이 필요합니다.'
      case 403:
        return '접근 권한이 없습니다.'
      case 404:
        return '요청한 정보를 찾을 수 없습니다.'
      case 409:
        return '이미 존재하는 데이터입니다.'
      case 422:
        return '입력 내용이 올바르지 않습니다.'
      case 429:
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
      case 500:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      case 502:
      case 503:
      case 504:
        return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
      default:
        break
    }

    // 네트워크 에러
    if (axiosError.code === 'NETWORK_ERROR' || !axiosError.response) {
      return '네트워크 연결을 확인해주세요.'
    }
  }

  // 일반 Error 객체인 경우
  if (error instanceof Error) {
    return error.message
  }

  // 문자열인 경우
  if (typeof error === 'string') {
    return error
  }

  // 알 수 없는 에러
  return '알 수 없는 오류가 발생했습니다.'
}

/**
 * 에러 로깅 (개발 환경에서만)
 */
export function logError(error: unknown, context?: string): void {
  if (import.meta.env.DEV) {
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, error)
  }
  // 프로덕션에서는 에러 추적 서비스로 전송 (예: Sentry)
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error)
  // }
}

/**
 * API 에러 여부 확인
 */
export function isApiError(error: unknown): error is AxiosError<ApiError> {
  return axios.isAxiosError(error)
}

/**
 * 인증 에러 여부 확인
 */
export function isAuthError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 401 || error.response?.status === 403
  }
  return false
}

/**
 * 네트워크 에러 여부 확인
 */
export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response || error.code === 'NETWORK_ERROR'
  }
  return false
}
