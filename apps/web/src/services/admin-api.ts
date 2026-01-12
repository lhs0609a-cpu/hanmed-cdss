import { api } from './api'
import type { UserRole } from '@/stores/authStore'

// ============ Types ============

export interface AdminUser {
  id: string
  email: string
  name: string
  licenseNumber: string | null
  clinicName: string | null
  role: UserRole
  status: 'active' | 'suspended' | 'banned' | 'pending_verification'
  subscriptionTier: 'free' | 'basic' | 'professional' | 'clinic'
  subscriptionExpiresAt: string | null
  isVerified: boolean
  isLicenseVerified: boolean
  createdAt: string
  updatedAt: string
  suspendedAt?: string | null
  suspendedReason?: string | null
}

export interface PaginatedUsers {
  users: AdminUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface GetUsersParams {
  search?: string
  role?: UserRole
  status?: string
  subscriptionTier?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface DashboardStats {
  totalUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  activeSubscribers: number
  subscriptionsByTier: {
    free: number
    basic: number
    professional: number
    clinic: number
  }
  revenueThisMonth: number
  revenueLastMonth: number
  revenueGrowthRate: number
  totalAiQueries: number
  aiQueriesThisMonth: number
  totalPatients: number
  newPatientsThisMonth: number
  totalClinics: number
  verifiedClinics: number
  pendingVerification: number
}

export interface RecentActivity {
  id: string
  adminName: string
  action: string
  targetType: string | null
  targetId: string | null
  description: string
  createdAt: string
}

export interface DailySignup {
  date: string
  count: number
}

export interface DashboardData {
  stats: DashboardStats
  recentActivities: RecentActivity[]
  dailySignups: DailySignup[]
}

export interface SubscriptionStats {
  totalUsers: number
  activeSubscribers: number
  byTier: {
    free: number
    basic: number
    professional: number
    clinic: number
  }
  monthlyRevenue: number
  yearlyRevenue: number
}

export interface AuditLog {
  id: string
  adminId: string
  action: string
  targetType: string | null
  targetId: string | null
  oldValue: Record<string, any> | null
  newValue: Record<string, any> | null
  ipAddress: string | null
  createdAt: string
  admin: {
    id: string
    name: string
    email: string
  }
}

// ============ Dashboard API ============

export const adminDashboardApi = {
  getDashboard: async (): Promise<DashboardData> => {
    const { data } = await api.get('/admin/dashboard')
    return data
  },

  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/admin/dashboard/stats')
    return data
  },

  getRecentActivities: async (limit: number = 10): Promise<RecentActivity[]> => {
    const { data } = await api.get('/admin/dashboard/activities', { params: { limit } })
    return data
  },

  getDailySignups: async (days: number = 30): Promise<DailySignup[]> => {
    const { data } = await api.get('/admin/dashboard/signups', { params: { days } })
    return data
  },
}

// ============ Users API ============

export const adminUsersApi = {
  getUsers: async (params: GetUsersParams = {}): Promise<PaginatedUsers> => {
    const { data } = await api.get('/admin/users', { params })
    return data
  },

  getUser: async (id: string): Promise<AdminUser> => {
    const { data } = await api.get(`/admin/users/${id}`)
    return data
  },

  updateUser: async (id: string, updates: Partial<AdminUser>): Promise<AdminUser> => {
    const { data } = await api.patch(`/admin/users/${id}`, updates)
    return data
  },

  suspendUser: async (id: string, reason: string): Promise<AdminUser> => {
    const { data } = await api.post(`/admin/users/${id}/suspend`, { reason })
    return data
  },

  activateUser: async (id: string): Promise<AdminUser> => {
    const { data } = await api.post(`/admin/users/${id}/activate`)
    return data
  },

  banUser: async (id: string, reason: string): Promise<AdminUser> => {
    const { data } = await api.post(`/admin/users/${id}/ban`, { reason })
    return data
  },

  changeUserRole: async (id: string, role: UserRole): Promise<AdminUser> => {
    const { data } = await api.patch(`/admin/users/${id}/role`, { role })
    return data
  },

  resetPassword: async (id: string): Promise<{ temporaryPassword: string }> => {
    const { data } = await api.post(`/admin/users/${id}/reset-password`)
    return data
  },
}

// ============ Subscriptions API ============

export const adminSubscriptionsApi = {
  getStats: async (): Promise<SubscriptionStats> => {
    const { data } = await api.get('/admin/subscriptions/stats')
    return data
  },

  getUserUsage: async (userId: string): Promise<{ count: number; limit: number }> => {
    const { data } = await api.get(`/admin/subscriptions/users/${userId}/usage`)
    return data
  },

  changeSubscriptionPlan: async (
    userId: string,
    tier: string,
    expiresAt?: string
  ): Promise<AdminUser> => {
    const { data } = await api.patch(`/admin/subscriptions/users/${userId}/plan`, {
      tier,
      expiresAt,
    })
    return data
  },

  extendSubscription: async (userId: string, days: number): Promise<AdminUser> => {
    const { data } = await api.post(`/admin/subscriptions/users/${userId}/extend`, { days })
    return data
  },

  cancelSubscription: async (userId: string): Promise<AdminUser> => {
    const { data } = await api.post(`/admin/subscriptions/users/${userId}/cancel`)
    return data
  },

  resetUsage: async (userId: string, newCount: number = 0): Promise<void> => {
    await api.post(`/admin/subscriptions/users/${userId}/reset-usage`, { newCount })
  },
}

// ============ Audit Logs API ============

export const adminAuditLogsApi = {
  getLogs: async (params: {
    page?: number
    limit?: number
    adminId?: string
    action?: string
    targetType?: string
    startDate?: string
    endDate?: string
  } = {}): Promise<{
    logs: AuditLog[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> => {
    const { data } = await api.get('/admin/audit-logs', { params })
    return data
  },
}

export default {
  dashboard: adminDashboardApi,
  users: adminUsersApi,
  subscriptions: adminSubscriptionsApi,
  auditLogs: adminAuditLogsApi,
}
