// ===========================
// API 관련 타입
// ===========================

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: Record<string, string>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ===========================
// 사용자 관련 타입
// ===========================

export interface User {
  id: string
  email: string
  name: string
  subscriptionTier: 'free' | 'basic' | 'professional' | 'clinic'
  subscriptionExpiresAt?: string
  isVerified: boolean
  licenseNumber?: string
  clinicName?: string
  createdAt?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// ===========================
// 환자 관련 타입
// ===========================

export interface Patient {
  id: string
  name: string
  birthDate: string
  gender: 'M' | 'F'
  phone: string
  email?: string
  address?: string
  constitution?: ConstitutionType
  allergies?: string[]
  medications?: string[]
  notes?: string
  status: 'active' | 'inactive'
  lastVisit?: string
  createdAt: string
  updatedAt?: string
}

export type ConstitutionType = '태양인' | '태음인' | '소양인' | '소음인' | null

// ===========================
// 처방 관련 타입
// ===========================

export interface Formula {
  id: string
  name: string
  hanja?: string
  category: string
  source?: string
  indication?: string
  herbs: FormulaHerb[]
  contraindications?: string[]
  modifications?: FormulaModification[]
}

export interface FormulaHerb {
  name: string
  amount: string
  role?: '군' | '신' | '좌' | '사'
  processingMethod?: string
}

export interface FormulaModification {
  condition: string
  action: string
}

// ===========================
// 약재 관련 타입
// ===========================

export interface Herb {
  id: string
  standardName: string
  hanja?: string
  category: string
  properties?: HerbProperties
  meridianTropism?: string[]
  efficacy?: string
  contraindications?: string[]
}

export interface HerbProperties {
  nature: '한' | '량' | '평' | '온' | '열'
  flavor: string[]
}

// ===========================
// 치험례 관련 타입
// ===========================

export interface CaseRecord {
  id: string
  chiefComplaint: string
  symptoms: string
  constitution?: ConstitutionType
  formulaName: string
  outcome: '완치' | '호전' | '무효'
  year: number
  patientInfo: {
    age: number
    gender: 'M' | 'F'
    occupation?: string
  }
  diagnosis: {
    pattern: string
    explanation: string
  }
  treatment: {
    formula: string
    herbs: FormulaHerb[]
    modifications?: string
    duration: string
    frequency: string
  }
  progress: CaseProgress[]
  notes?: string
  references?: string[]
}

export interface CaseProgress {
  week: number
  description: string
  improvement: number
}

// ===========================
// 상호작용 관련 타입
// ===========================

export interface InteractionResult {
  has_interactions: boolean
  total_count: number
  by_severity: {
    critical: InteractionItem[]
    warning: InteractionItem[]
    info: InteractionItem[]
  }
  overall_safety: string
  recommendations: string[]
}

export interface InteractionItem {
  drug_name: string
  herb_name: string
  mechanism: string
  recommendation?: string
}

// ===========================
// AI 진료 관련 타입
// ===========================

export interface Symptom {
  id: string
  name: string
  severity: 'mild' | 'moderate' | 'severe'
  duration?: string
}

export interface Recommendation {
  id: string
  formulaName: string
  confidence: number
  matchedSymptoms: string[]
  explanation: string
  herbs: FormulaHerb[]
  modifications?: string[]
  warnings?: string[]
  similarCases?: number
}

export interface ConsultationResult {
  patternAnalysis: string
  recommendations: Recommendation[]
  warnings: string[]
  references: string[]
}

// ===========================
// 체질 진단 관련 타입
// ===========================

export interface ConstitutionResult {
  type: 'taeyang' | 'taeeum' | 'soyang' | 'soeum'
  name: string
  hanja: string
  percentage: number
  description: string
  bodyType: string
  personality: string
  strengths: string[]
  weaknesses: string[]
  recommendedFoods: string[]
  avoidFoods: string[]
  recommendedHerbs: string[]
  healthTips: string[]
}

// ===========================
// 폼 관련 타입
// ===========================

export interface FormFieldError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: FormFieldError[]
}

// ===========================
// 커뮤니티 관련 타입
// ===========================

export type PostType = 'case_discussion' | 'qna' | 'general' | 'forum'
export type PostStatus = 'active' | 'hidden' | 'deleted'

export interface CommunityPost {
  id: string
  title: string
  content: string
  type: PostType
  categoryId?: string
  category?: Category
  authorId: string
  author: CommunityAuthor
  isAnonymous: boolean
  anonymousNickname?: string
  linkedCaseId?: string
  linkedCase?: {
    id: string
    chiefComplaint: string
    constitution?: string
    formulaName?: string
  }
  viewCount: number
  likeCount: number
  commentCount: number
  bookmarkCount: number
  isPinned: boolean
  isSolved: boolean
  acceptedAnswerId?: string
  tags: string[]
  status: PostStatus
  createdAt: string
  updatedAt: string
}

export interface CommunityAuthor {
  id: string
  name: string
  isLicenseVerified?: boolean
  subscriptionTier?: 'free' | 'basic' | 'professional' | 'clinic'
  contributionPoints?: number
  acceptedAnswerCount?: number
  specialization?: string
}

export interface CommunityComment {
  id: string
  content: string
  postId: string
  authorId: string
  author: CommunityAuthor
  isAnonymous: boolean
  anonymousNickname?: string
  parentId?: string
  replies?: CommunityComment[]
  likeCount: number
  isAcceptedAnswer: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  description?: string
  slug: string
  postType: PostType
  iconName?: string
  sortOrder: number
  requiredTier: 'free' | 'basic' | 'professional' | 'clinic'
}

export interface CommunityTag {
  id: string
  name: string
  usageCount: number
}
