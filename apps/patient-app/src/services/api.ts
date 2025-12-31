import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Axios 인스턴스 생성
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 토큰 저장 키
const ACCESS_TOKEN_KEY = 'hanmed_access_token';
const REFRESH_TOKEN_KEY = 'hanmed_refresh_token';

// 토큰 저장
export const saveTokens = async (accessToken: string, refreshToken: string) => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};

// 토큰 가져오기
export const getAccessToken = async () => {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async () => {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

// 토큰 삭제
export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

// Request 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response 인터셉터 - 토큰 갱신 및 에러 처리
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // 401 에러이고 재시도 안했으면 토큰 갱신 시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/patient/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          await saveTokens(accessToken, newRefreshToken);

          // 원래 요청 재시도
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        // 토큰 갱신 실패 - 로그아웃
        await clearTokens();
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// 에러 메시지 추출
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || '오류가 발생했습니다.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
};

export default api;
