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
    //
    // 백엔드 전역 예외 필터가 message 를 늘 배열로 감싼다
    // (message: Array.isArray(m) ? m : [m]). 그대로 돌려주면 반환 타입은
    // string 인데 실제 값은 배열이라, 화면에서 쉼표로 이어 붙거나
    // 엉뚱하게 그려진다.
    const raw = axiosError.response?.data?.message
    if (raw) {
      return Array.isArray(raw) ? raw.join(' ') : raw
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
      case 402:
        // 요금제 벽. 실패가 아니라 제품의 정상 상태다.
        // 서버가 어떤 기능인지 message 에 적어 보내므로 여기까지 오는
        // 경우는 드물지만, 문구가 없을 때도 '오류' 로 보이지 않게 한다.
        return '현재 요금제에서는 사용할 수 없는 기능입니다. 요금제를 확인해 주세요.'
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

    // 응답을 아예 못 받은 경우 — 대부분 API 서버 미기동/다운/CORS 이며
    // 사용자 인터넷 문제가 아니다. 오해를 줄이는 문구로 안내한다.
    if (axiosError.code === 'NETWORK_ERROR' || !axiosError.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
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
