import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { gcDrafts } from '@/lib/formDraft'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.ongojisin.co.kr/api/v1'

// 재시도 설정
const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000 // 1초

// 재시도 가능한 상태 코드
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

// 확장된 요청 설정 타입
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number
  _skipRetry?: boolean
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30초 타임아웃
})

// 오프라인 상태 감지
export const isOnline = () => navigator.onLine

// 지수 백오프 딜레이 계산
const getRetryDelay = (retryCount: number) => {
  return RETRY_DELAY_BASE * Math.pow(2, retryCount) + Math.random() * 1000
}

// Request interceptor - JWT 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - 래핑 해제, 재시도, 401 에러 처리
api.interceptors.response.use(
  (response) => {
    // 백엔드 TransformInterceptor가 { success, data, timestamp } 형식으로 래핑함
    if (response.data && response.data.success !== undefined) {
      response.data = response.data.data
    }
    return response
  },
  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosRequestConfig

    // 재시도 로직
    if (config && !config._skipRetry) {
      const retryCount = config._retryCount || 0
      const status = error.response?.status

      // 재시도 조건 확인
      const isRetryable =
        !error.response || // 네트워크 에러
        (status && RETRYABLE_STATUS_CODES.includes(status))

      if (isRetryable && retryCount < MAX_RETRIES && isOnline()) {
        config._retryCount = retryCount + 1
        const delay = getRetryDelay(retryCount)

        console.log(`[API] 재시도 ${config._retryCount}/${MAX_RETRIES} - ${delay}ms 후`)

        await new Promise((resolve) => setTimeout(resolve, delay))
        return api(config)
      }
    }

    // 401 에러 - 토큰 만료
    if (error.response?.status === 401) {
      // 진료 입력 중일 수 있으므로 드래프트는 그대로 두고 로그아웃만 한다.
      // 재로그인 후 형태별 페이지가 loadDraft 로 자동 복원한다.
      useAuthStore.getState().logout()
      try {
        // 만료된 드래프트만 정리 (24h+). 입력 중 데이터 보존이 우선.
        gcDrafts()
      } catch {
        // ignore
      }
      // 진료 입력 페이지에서 갑자기 로그인으로 점프하지 않도록 returnTo 전달.
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?session=expired&returnTo=${returnTo}`
    }

    // 오프라인 에러 메시지 개선
    if (!isOnline()) {
      error.message = '인터넷 연결이 끊겼습니다. 연결 상태를 확인해주세요.'
    }

    return Promise.reject(error)
  }
)

// 재시도 없이 요청하기 (로그인 등)
export const apiWithoutRetry = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiWithoutRetry.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiWithoutRetry.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined) {
      response.data = response.data.data
    }
    return response
  },
  (error) => Promise.reject(error)
)

export default api
