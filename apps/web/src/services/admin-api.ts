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

// ============ Clinic Types ============

export type ClinicVerificationStatus = 'pending' | 'verified' | 'rejected'

export interface AdminClinic {
  id: string
  name: string
  businessNumber: string | null
  licenseNumber: string | null
  phone: string | null
  email: string | null
  addressRoad: string | null
  addressDetail: string | null
  isHanmedVerified: boolean
  subscriptionTier: string | null
  ratingAverage: number
  reviewCount: number
  reservationEnabled: boolean
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    email: string
  } | null
}

export interface PaginatedClinics {
  clinics: AdminClinic[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface GetClinicsParams {
  search?: string
  verificationStatus?: ClinicVerificationStatus
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface UpdateClinicParams {
  name?: string
  businessNumber?: string
  phone?: string
  email?: string
  addressRoad?: string
  addressDetail?: string
  reservationEnabled?: boolean
  reservationInterval?: number
  maxDailyReservations?: number
  description?: string
}

// ============ Content Types ============

export interface PaginatedContentResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ContentQueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

// Clinical Case
export interface ClinicalCase {
  id: string
  sourceId: string
  recordedYear: number
  recorderName: string | null
  patientGender: 'male' | 'female' | 'unknown'
  patientAgeRange: string | null
  patientConstitution: string | null
  chiefComplaint: string
  presentIllness: string | null
  pulseDiagnosis: string | null
  tongueDiagnosis: string | null
  abdominalDiagnosis: string | null
  patternDiagnosis: string | null
  treatmentOutcome: '완치' | '호전' | '불변' | '악화' | null
  clinicalNotes: string | null
  originalText: string
  createdAt: string
  updatedAt: string
}

export interface CreateCaseParams {
  sourceId: string
  recordedYear: number
  recorderName?: string
  patientGender?: 'male' | 'female' | 'unknown'
  patientAgeRange?: string
  patientConstitution?: string
  chiefComplaint: string
  presentIllness?: string
  pulseDiagnosis?: string
  tongueDiagnosis?: string
  abdominalDiagnosis?: string
  patternDiagnosis?: string
  treatmentOutcome?: '완치' | '호전' | '불변' | '악화'
  clinicalNotes?: string
  originalText: string
}

// Formula
export interface FormulaHerb {
  id: string
  herbId: string
  amount: string
  role: string | null
  herb: {
    id: string
    standardName: string
    hanjaName: string | null
  }
}

export interface Formula {
  id: string
  name: string
  hanja: string | null
  aliases: string[] | null
  category: string
  source: string | null
  indication: string | null
  pathogenesis: string | null
  contraindications: string[] | null
  formulaHerbs: FormulaHerb[]
  createdAt: string
  updatedAt: string
}

export interface CreateFormulaParams {
  name: string
  hanja?: string
  aliases?: string[]
  category: string
  source?: string
  indication?: string
  pathogenesis?: string
  contraindications?: string[]
}

// Herb
export interface Herb {
  id: string
  standardName: string
  hanjaName: string | null
  aliases: string[] | null
  category: string
  meridianTropism: string[] | null
  efficacy: string | null
  contraindications: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateHerbParams {
  standardName: string
  hanjaName?: string
  aliases?: string[]
  category: string
  meridianTropism?: string[]
  efficacy?: string
  contraindications?: string
}

// Interaction
export type InteractionType = 'increase' | 'decrease' | 'dangerous'
export type Severity = 'critical' | 'warning' | 'info'
export type EvidenceLevel = 'A' | 'B' | 'C' | 'D'

export interface DrugHerbInteraction {
  id: string
  drugName: string
  drugAtcCode: string | null
  herbId: string
  interactionType: InteractionType
  severity: Severity
  mechanism: string | null
  evidenceLevel: EvidenceLevel | null
  referencePmid: string[] | null
  recommendation: string | null
  createdAt: string
  herb: {
    id: string
    standardName: string
    hanjaName: string | null
  }
}

export interface CreateInteractionParams {
  drugName: string
  drugAtcCode?: string
  herbId: string
  interactionType: InteractionType
  severity: Severity
  mechanism?: string
  evidenceLevel?: EvidenceLevel
  referencePmid?: string[]
  recommendation?: string
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

// ============ Clinics API ============

export const adminClinicsApi = {
  getClinics: async (params: GetClinicsParams = {}): Promise<PaginatedClinics> => {
    const { data } = await api.get('/admin/clinics', { params })
    return data
  },

  getClinic: async (id: string): Promise<AdminClinic> => {
    const { data } = await api.get(`/admin/clinics/${id}`)
    return data
  },

  updateClinic: async (id: string, updates: UpdateClinicParams): Promise<AdminClinic> => {
    const { data } = await api.patch(`/admin/clinics/${id}`, updates)
    return data
  },

  verifyClinic: async (id: string, notes?: string): Promise<AdminClinic> => {
    const { data } = await api.post(`/admin/clinics/${id}/verify`, { notes })
    return data
  },

  rejectClinic: async (id: string, reason: string): Promise<AdminClinic> => {
    const { data } = await api.post(`/admin/clinics/${id}/reject`, { reason })
    return data
  },
}

// ============ Content API ============

export const adminContentApi = {
  // Cases
  getCases: async (params: ContentQueryParams = {}): Promise<PaginatedContentResponse<ClinicalCase>> => {
    const { data } = await api.get('/admin/content/cases', { params })
    return data
  },

  createCase: async (caseData: CreateCaseParams): Promise<ClinicalCase> => {
    const { data } = await api.post('/admin/content/cases', caseData)
    return data
  },

  updateCase: async (id: string, updates: Partial<CreateCaseParams>): Promise<ClinicalCase> => {
    const { data } = await api.patch(`/admin/content/cases/${id}`, updates)
    return data
  },

  deleteCase: async (id: string): Promise<void> => {
    await api.delete(`/admin/content/cases/${id}`)
  },

  // Formulas
  getFormulas: async (params: ContentQueryParams = {}): Promise<PaginatedContentResponse<Formula>> => {
    const { data } = await api.get('/admin/content/formulas', { params })
    return data
  },

  createFormula: async (formulaData: CreateFormulaParams): Promise<Formula> => {
    const { data } = await api.post('/admin/content/formulas', formulaData)
    return data
  },

  updateFormula: async (id: string, updates: Partial<CreateFormulaParams>): Promise<Formula> => {
    const { data } = await api.patch(`/admin/content/formulas/${id}`, updates)
    return data
  },

  deleteFormula: async (id: string): Promise<void> => {
    await api.delete(`/admin/content/formulas/${id}`)
  },

  updateFormulaHerbs: async (
    id: string,
    herbs: Array<{ herbId: string; amount: string; role?: string; notes?: string }>
  ): Promise<Formula> => {
    const { data } = await api.put(`/admin/content/formulas/${id}/herbs`, { herbs })
    return data
  },

  // Herbs
  getHerbs: async (params: ContentQueryParams = {}): Promise<PaginatedContentResponse<Herb>> => {
    const { data } = await api.get('/admin/content/herbs', { params })
    return data
  },

  createHerb: async (herbData: CreateHerbParams): Promise<Herb> => {
    const { data } = await api.post('/admin/content/herbs', herbData)
    return data
  },

  updateHerb: async (id: string, updates: Partial<CreateHerbParams>): Promise<Herb> => {
    const { data } = await api.patch(`/admin/content/herbs/${id}`, updates)
    return data
  },

  deleteHerb: async (id: string): Promise<void> => {
    await api.delete(`/admin/content/herbs/${id}`)
  },

  // Interactions
  getInteractions: async (params: ContentQueryParams = {}): Promise<PaginatedContentResponse<DrugHerbInteraction>> => {
    const { data } = await api.get('/admin/content/interactions', { params })
    return data
  },

  createInteraction: async (interactionData: CreateInteractionParams): Promise<DrugHerbInteraction> => {
    const { data } = await api.post('/admin/content/interactions', interactionData)
    return data
  },

  updateInteraction: async (id: string, updates: Partial<CreateInteractionParams>): Promise<DrugHerbInteraction> => {
    const { data } = await api.patch(`/admin/content/interactions/${id}`, updates)
    return data
  },

  deleteInteraction: async (id: string): Promise<void> => {
    await api.delete(`/admin/content/interactions/${id}`)
  },
}

export default {
  dashboard: adminDashboardApi,
  users: adminUsersApi,
  subscriptions: adminSubscriptionsApi,
  auditLogs: adminAuditLogsApi,
  clinics: adminClinicsApi,
  content: adminContentApi,
}
