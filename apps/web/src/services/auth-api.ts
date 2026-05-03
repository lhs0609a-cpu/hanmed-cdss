import api from './api'
import { useAuthStore } from '@/stores/authStore'

/**
 * 사용자 주도 로그아웃: 백엔드에 토큰 폐기 요청 후 로컬 상태 초기화.
 * 백엔드 호출 실패해도 로컬 로그아웃은 진행한다.
 */
export async function performLogout(): Promise<void> {
  try {
    await api.post('/auth/logout', {}, { timeout: 5000 })
  } catch {
    // 네트워크 실패 등은 무시 — 로컬 로그아웃은 반드시 진행
  } finally {
    useAuthStore.getState().logout()
  }
}
