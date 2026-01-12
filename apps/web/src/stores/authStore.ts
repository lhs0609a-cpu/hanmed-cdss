import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 사용자 역할 타입
export type UserRole = 'super_admin' | 'admin' | 'support' | 'content_manager' | 'user'

// 역할 계층 (숫자가 높을수록 높은 권한)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  content_manager: 60,
  support: 40,
  user: 0,
}

// 관리자 여부 확인 헬퍼
export const isAdminRole = (role?: UserRole): boolean => {
  if (!role) return false
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.support
}

interface User {
  id: string
  email: string
  name: string
  subscriptionTier: string
  isVerified: boolean
  role?: UserRole
  status?: 'active' | 'suspended' | 'banned'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isGuest: boolean

  // Actions
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  enterAsGuest: () => void
  exitGuest: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isGuest: false,

      login: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isGuest: false,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isGuest: false,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      enterAsGuest: () =>
        set({
          isGuest: true,
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
        }),

      exitGuest: () =>
        set({
          isGuest: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
)
