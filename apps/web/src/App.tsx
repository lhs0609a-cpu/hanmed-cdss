import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Toaster } from '@/components/ui/toaster'
import { HanjaSettingsProvider } from '@/components/hanja'
import { KeyboardShortcutsProvider } from '@/components/common/KeyboardShortcuts'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { WelcomeModal } from '@/components/common/WelcomeModal'

// Layouts
import DashboardLayout from '@/components/layouts/DashboardLayout'

// Pages
import LoginPage from '@/app/auth/LoginPage'
import RegisterPage from '@/app/auth/RegisterPage'
import ForgotPasswordPage from '@/app/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/app/auth/ResetPasswordPage'
import DashboardPage from '@/app/dashboard/DashboardPage'
import ConsultationPage from '@/app/consultation/ConsultationPage'
import CasesPage from '@/app/cases/CasesPage'
import InteractionsPage from '@/app/interactions/InteractionsPage'
import FormulasPage from '@/app/formulas/FormulasPage'
import FormulaDetailPage from '@/app/formulas/FormulaDetailPage'
import HerbsPage from '@/app/herbs/HerbsPage'
import HerbDetailPage from '@/app/herbs/HerbDetailPage'
import PublicHerbsPage from '@/app/herbs/PublicHerbsPage'
import ComboPage from '@/app/combo/ComboPage'

// New Pages
import ConstitutionPage from '@/app/constitution/ConstitutionPage'
import AcupointsPage from '@/app/acupoints/AcupointsPage'
import SymptomSearchPage from '@/app/symptom-search/SymptomSearchPage'
import PulseDiagnosisPage from '@/app/pulse/PulseDiagnosisPage'
import DosageCalculatorPage from '@/app/dosage/DosageCalculatorPage'
import PatientsPage from '@/app/patients/PatientsPage'
import PatientDetailPage from '@/app/patients/PatientDetailPage'
import ClassicsPage from '@/app/classics/ClassicsPage'
import InsuranceCodePage from '@/app/insurance/InsuranceCodePage'
import InsuranceFeeSearchPage from '@/app/insurance/InsuranceFeeSearchPage'
import DocumentsPage from '@/app/documents/DocumentsPage'

// Core Features - New
import PatternDiagnosisPage from '@/app/diagnosis/PatternDiagnosisPage'
import ClaimCheckPage from '@/app/claim-check/ClaimCheckPage'
import FormulaComparePage from '@/app/formula-compare/FormulaComparePage'
import RedFlagPage from '@/app/red-flag/RedFlagPage'
import VoiceChartPage from '@/app/voice-chart/VoiceChartPage'

// Traditional Medicine Features
import ByeongYangTablePage from '@/app/byeongyang/ByeongYangTablePage'
import SchoolComparisonPage from '@/app/school-compare/SchoolComparisonPage'
import IntegratedDiagnosisPage from '@/app/integrated-diagnosis/IntegratedDiagnosisPage'
import UnifiedSearchPage from '@/app/unified-search/UnifiedSearchPage'
import CaseSearchPage from '@/app/case-search/CaseSearchPage'

// Personal Case Management
import MyCasesPage from '@/app/my-cases/MyCasesPage'
import StatisticsDashboardPage from '@/app/statistics/StatisticsDashboardPage'

// Community
import CommunityPage from '@/app/community/CommunityPage'
import PostDetailPage from '@/app/community/PostDetailPage'
import WritePostPage from '@/app/community/WritePostPage'

// Subscription
import SubscriptionPage from '@/app/subscription/SubscriptionPage'
import SubscriptionSuccessPage from '@/app/subscription/SubscriptionSuccessPage'

// Settings
import SettingsPage from '@/app/settings/SettingsPage'

// Activity Log
import ActivityLogPage from '@/app/activity/ActivityLogPage'

// Profile
import ProfilePage from '@/app/profile/ProfilePage'

// Killer Features - Analytics, Insurance, CRM, Case Sharing, Inventory
import AnalyticsDashboardPage from '@/app/analytics/AnalyticsDashboardPage'
import InsurancePage from '@/app/insurance/InsurancePage'
import CrmPage from '@/app/crm/CrmPage'
import CaseSharingPage from '@/app/case-sharing/CaseSharingPage'
import InventoryPage from '@/app/inventory/InventoryPage'

// Landing Page
import LandingPage from '@/app/landing/LandingPage'
import AdLandingPage from '@/app/landing/AdLandingPage'

// B2C Health Platform (lazy-loaded — celeb data stays out of main bundle)
import HealthLayout from '@/components/layouts/HealthLayout'
const HealthHomePage = lazy(() => import('@/app/health/HealthHomePage'))
const HealthCheckPage = lazy(() => import('@/app/health/HealthCheckPage'))
const CelebTmiPage = lazy(() => import('@/app/health/CelebTmiPage'))
const CelebDetailPage = lazy(() => import('@/app/health/CelebDetailPage'))
const MyConstitutionPage = lazy(() => import('@/app/health/MyConstitutionPage'))
const ComparePage = lazy(() => import('@/app/health/ComparePage'))
const HealthCommunityPage = lazy(() => import('@/app/health/HealthCommunityPage'))

// Legal Pages
import {
  TermsPage,
  PrivacyPage,
  RefundPolicyPage,
  SubscriptionTermsPage,
} from '@/app/legal'

// Admin Pages
import AdminLayout from '@/components/layouts/AdminLayout'
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminSubscriptionsPage,
  AdminAuditLogsPage,
  AdminClinicsPage,
  AdminContentPage,
} from '@/app/admin'

// Protected Route wrapper - 게스트도 허용
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isGuest = useAuthStore((state) => state.isGuest)

  // 로그인 또는 게스트 모드면 접근 허용
  if (!isAuthenticated && !isGuest) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <HanjaSettingsProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/go" element={<AdLandingPage />} />
        <Route path="/start" element={<AdLandingPage />} />
        <Route path="/trial" element={<AdLandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* B2C Health Platform (Public) - lazy loaded */}
        <Route path="/health" element={
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" /></div>}>
            <HealthLayout />
          </Suspense>
        }>
          <Route index element={<HealthHomePage />} />
          <Route path="check/:slug" element={<HealthCheckPage />} />
          <Route path="community" element={<HealthCommunityPage />} />
          <Route path="qna" element={<HealthCommunityPage />} />
          <Route path="tmi" element={<CelebTmiPage />} />
          <Route path="tmi/my-type" element={<MyConstitutionPage />} />
          <Route path="tmi/compare" element={<ComparePage />} />
          <Route path="tmi/:id" element={<CelebDetailPage />} />
        </Route>

        {/* Legal Pages (Public) */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/subscription-terms" element={<SubscriptionTermsPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <KeyboardShortcutsProvider>
                <DashboardLayout />
              </KeyboardShortcutsProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="consultation" element={<ConsultationPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="interactions" element={<InteractionsPage />} />
          <Route path="formulas" element={<FormulasPage />} />
          <Route path="formulas/:id" element={<FormulaDetailPage />} />
          <Route path="herbs" element={<HerbsPage />} />
          <Route path="herbs/:id" element={<HerbDetailPage />} />
          <Route path="herbs-db" element={<PublicHerbsPage />} />
          <Route path="combo" element={<ComboPage />} />

          {/* New Routes */}
          <Route path="constitution" element={<ConstitutionPage />} />
          <Route path="acupoints" element={<AcupointsPage />} />
          <Route path="symptom-search" element={<SymptomSearchPage />} />
          <Route path="pulse" element={<PulseDiagnosisPage />} />
          <Route path="dosage" element={<DosageCalculatorPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="classics" element={<ClassicsPage />} />
          <Route path="insurance" element={<InsuranceCodePage />} />
          <Route path="insurance-fee" element={<InsuranceFeeSearchPage />} />
          <Route path="documents" element={<DocumentsPage />} />

          {/* Core Features - New */}
          <Route path="pattern-diagnosis" element={<PatternDiagnosisPage />} />
          <Route path="claim-check" element={<ClaimCheckPage />} />
          <Route path="formula-compare" element={<FormulaComparePage />} />
          <Route path="red-flag" element={<RedFlagPage />} />
          <Route path="voice-chart" element={<VoiceChartPage />} />

          {/* Traditional Medicine Features */}
          <Route path="byeongyang" element={<ByeongYangTablePage />} />
          <Route path="school-compare" element={<SchoolComparisonPage />} />
          <Route path="integrated-diagnosis" element={<IntegratedDiagnosisPage />} />
          <Route path="unified-search" element={<UnifiedSearchPage />} />
          <Route path="case-search" element={<CaseSearchPage />} />

          {/* Personal Case Management */}
          <Route path="my-cases" element={<MyCasesPage />} />
          <Route path="statistics" element={<StatisticsDashboardPage />} />

          {/* Killer Features */}
          <Route path="analytics" element={<AnalyticsDashboardPage />} />
          <Route path="smart-insurance" element={<InsurancePage />} />
          <Route path="crm" element={<CrmPage />} />
          <Route path="case-network" element={<CaseSharingPage />} />
          <Route path="inventory" element={<InventoryPage />} />

          {/* Community */}
          <Route path="community" element={<CommunityPage />} />
          <Route path="community/cases" element={<CommunityPage />} />
          <Route path="community/qna" element={<CommunityPage />} />
          <Route path="community/general" element={<CommunityPage />} />
          <Route path="community/forum" element={<CommunityPage />} />
          <Route path="community/forum/:slug" element={<CommunityPage />} />
          <Route path="community/post/:id" element={<PostDetailPage />} />
          <Route path="community/write" element={<WritePostPage />} />
          <Route path="community/my/posts" element={<CommunityPage />} />
          <Route path="community/my/bookmarks" element={<CommunityPage />} />

          {/* Subscription */}
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="subscription/success" element={<SubscriptionSuccessPage />} />

          {/* Settings */}
          <Route path="settings" element={<SettingsPage />} />

          {/* Activity Log */}
          <Route path="activity" element={<ActivityLogPage />} />

          {/* Profile */}
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="clinics" element={<AdminClinicsPage />} />
          <Route path="content" element={<AdminContentPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <Toaster />
      <OfflineBanner />
      <WelcomeModal />
    </HanjaSettingsProvider>
  )
}

export default App
