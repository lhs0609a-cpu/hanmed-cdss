import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Toaster } from '@/components/ui/toaster'
import { HanjaSettingsProvider } from '@/components/hanja'
import { KeyboardShortcutsProvider } from '@/components/common/KeyboardShortcuts'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { WelcomeModal } from '@/components/common/WelcomeModal'
import { RouteBoundary } from '@/components/common/RouteErrorBoundary'

// Layouts (eager — used on every authenticated request)
import DashboardLayout from '@/components/layouts/DashboardLayout'
import AdminLayout from '@/components/layouts/AdminLayout'
import HealthLayout from '@/components/layouts/HealthLayout'

// Auth & Landing (eager — first paint, SEO critical)
import LoginPage from '@/app/auth/LoginPage'
import RegisterPage from '@/app/auth/RegisterPage'
import ForgotPasswordPage from '@/app/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/app/auth/ResetPasswordPage'
import LandingPage from '@/app/landing/LandingPage'
import AdLandingPage from '@/app/landing/AdLandingPage'

// Dashboard pages (lazy — code-split per route)
const DashboardPage = lazy(() => import('@/app/dashboard/DashboardPage'))
const ConsultationPage = lazy(() => import('@/app/consultation/ConsultationPage'))
const CasesPage = lazy(() => import('@/app/cases/CasesPage'))
const InteractionsPage = lazy(() => import('@/app/interactions/InteractionsPage'))
const FormulasPage = lazy(() => import('@/app/formulas/FormulasPage'))
const FormulaDetailPage = lazy(() => import('@/app/formulas/FormulaDetailPage'))
const HerbsPage = lazy(() => import('@/app/herbs/HerbsPage'))
const HerbDetailPage = lazy(() => import('@/app/herbs/HerbDetailPage'))
const PublicHerbsPage = lazy(() => import('@/app/herbs/PublicHerbsPage'))
const ComboPage = lazy(() => import('@/app/combo/ComboPage'))
const ConstitutionPage = lazy(() => import('@/app/constitution/ConstitutionPage'))
const AcupointsPage = lazy(() => import('@/app/acupoints/AcupointsPage'))
const SymptomSearchPage = lazy(() => import('@/app/symptom-search/SymptomSearchPage'))
const PulseDiagnosisPage = lazy(() => import('@/app/pulse/PulseDiagnosisPage'))
const DosageCalculatorPage = lazy(() => import('@/app/dosage/DosageCalculatorPage'))
const PatientsPage = lazy(() => import('@/app/patients/PatientsPage'))
const PatientDetailPage = lazy(() => import('@/app/patients/PatientDetailPage'))
const ClassicsPage = lazy(() => import('@/app/classics/ClassicsPage'))
const InsuranceCodePage = lazy(() => import('@/app/insurance/InsuranceCodePage'))
const InsuranceFeeSearchPage = lazy(() => import('@/app/insurance/InsuranceFeeSearchPage'))
const DocumentsPage = lazy(() => import('@/app/documents/DocumentsPage'))
const PatternDiagnosisPage = lazy(() => import('@/app/diagnosis/PatternDiagnosisPage'))
const ClaimCheckPage = lazy(() => import('@/app/claim-check/ClaimCheckPage'))
const FormulaComparePage = lazy(() => import('@/app/formula-compare/FormulaComparePage'))
const RedFlagPage = lazy(() => import('@/app/red-flag/RedFlagPage'))
const VoiceChartPage = lazy(() => import('@/app/voice-chart/VoiceChartPage'))
const ByeongYangTablePage = lazy(() => import('@/app/byeongyang/ByeongYangTablePage'))
const SchoolComparisonPage = lazy(() => import('@/app/school-compare/SchoolComparisonPage'))
const IntegratedDiagnosisPage = lazy(() => import('@/app/integrated-diagnosis/IntegratedDiagnosisPage'))
const UnifiedSearchPage = lazy(() => import('@/app/unified-search/UnifiedSearchPage'))
const CaseSearchPage = lazy(() => import('@/app/case-search/CaseSearchPage'))
const MyCasesPage = lazy(() => import('@/app/my-cases/MyCasesPage'))
const StatisticsDashboardPage = lazy(() => import('@/app/statistics/StatisticsDashboardPage'))
const CommunityPage = lazy(() => import('@/app/community/CommunityPage'))
const PostDetailPage = lazy(() => import('@/app/community/PostDetailPage'))
const WritePostPage = lazy(() => import('@/app/community/WritePostPage'))
const SubscriptionPage = lazy(() => import('@/app/subscription/SubscriptionPage'))
const SubscriptionSuccessPage = lazy(() => import('@/app/subscription/SubscriptionSuccessPage'))
const SettingsPage = lazy(() => import('@/app/settings/SettingsPage'))
const ActivityLogPage = lazy(() => import('@/app/activity/ActivityLogPage'))
const ProfilePage = lazy(() => import('@/app/profile/ProfilePage'))
const AnalyticsDashboardPage = lazy(() => import('@/app/analytics/AnalyticsDashboardPage'))
const InsurancePage = lazy(() => import('@/app/insurance/InsurancePage'))
const CrmPage = lazy(() => import('@/app/crm/CrmPage'))
const CaseSharingPage = lazy(() => import('@/app/case-sharing/CaseSharingPage'))
const InventoryPage = lazy(() => import('@/app/inventory/InventoryPage'))

// B2C Health Platform (lazy)
const HealthHomePage = lazy(() => import('@/app/health/HealthHomePage'))
const HealthCheckPage = lazy(() => import('@/app/health/HealthCheckPage'))
const CelebTmiPage = lazy(() => import('@/app/health/CelebTmiPage'))
const CelebDetailPage = lazy(() => import('@/app/health/CelebDetailPage'))
const MyConstitutionPage = lazy(() => import('@/app/health/MyConstitutionPage'))
const ComparePage = lazy(() => import('@/app/health/ComparePage'))
const HealthCommunityPage = lazy(() => import('@/app/health/HealthCommunityPage'))
const SajuLandingPage = lazy(() => import('@/app/health/SajuLandingPage'))
const SajuInputPage = lazy(() => import('@/app/health/SajuInputPage'))
const SajuPaymentPage = lazy(() => import('@/app/health/SajuPaymentPage'))
const SajuReportViewer = lazy(() => import('@/app/health/SajuReportViewer'))

// Legal (lazy)
const TermsPage = lazy(() => import('@/app/legal').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('@/app/legal').then((m) => ({ default: m.PrivacyPage })))
const RefundPolicyPage = lazy(() => import('@/app/legal').then((m) => ({ default: m.RefundPolicyPage })))
const SubscriptionTermsPage = lazy(() => import('@/app/legal').then((m) => ({ default: m.SubscriptionTermsPage })))

// Admin (lazy)
const AdminDashboardPage = lazy(() => import('@/app/admin').then((m) => ({ default: m.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('@/app/admin').then((m) => ({ default: m.AdminUsersPage })))
const AdminSubscriptionsPage = lazy(() => import('@/app/admin').then((m) => ({ default: m.AdminSubscriptionsPage })))
const AdminAuditLogsPage = lazy(() => import('@/app/admin').then((m) => ({ default: m.AdminAuditLogsPage })))
const AdminClinicsPage = lazy(() => import('@/app/admin').then((m) => ({ default: m.AdminClinicsPage })))
const AdminContentPage = lazy(() => import('@/app/admin').then((m) => ({ default: m.AdminContentPage })))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isGuest = useAuthStore((state) => state.isGuest)

  if (!isAuthenticated && !isGuest) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const route = (element: React.ReactNode) => <RouteBoundary>{element}</RouteBoundary>

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

        {/* B2C Health Platform (Public) */}
        <Route path="/health" element={<RouteBoundary><HealthLayout /></RouteBoundary>}>
          <Route index element={route(<HealthHomePage />)} />
          <Route path="check/:slug" element={route(<HealthCheckPage />)} />
          <Route path="community" element={route(<HealthCommunityPage />)} />
          <Route path="qna" element={route(<HealthCommunityPage />)} />
          <Route path="tmi" element={route(<CelebTmiPage />)} />
          <Route path="tmi/my-type" element={route(<MyConstitutionPage />)} />
          <Route path="tmi/compare" element={route(<ComparePage />)} />
          <Route path="tmi/:id" element={route(<CelebDetailPage />)} />
          <Route path="saju" element={route(<SajuLandingPage />)} />
          <Route path="saju/input" element={route(<SajuInputPage />)} />
          <Route path="saju/payment" element={route(<SajuPaymentPage />)} />
          <Route path="saju/report/:id" element={route(<SajuReportViewer />)} />
          <Route path="saju/report/view/:token" element={route(<SajuReportViewer />)} />
        </Route>

        {/* Legal Pages */}
        <Route path="/terms" element={route(<TermsPage />)} />
        <Route path="/privacy" element={route(<PrivacyPage />)} />
        <Route path="/refund-policy" element={route(<RefundPolicyPage />)} />
        <Route path="/subscription-terms" element={route(<SubscriptionTermsPage />)} />

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
          <Route index element={route(<DashboardPage />)} />
          <Route path="consultation" element={route(<ConsultationPage />)} />
          <Route path="cases" element={route(<CasesPage />)} />
          <Route path="interactions" element={route(<InteractionsPage />)} />
          <Route path="formulas" element={route(<FormulasPage />)} />
          <Route path="formulas/:id" element={route(<FormulaDetailPage />)} />
          <Route path="herbs" element={route(<HerbsPage />)} />
          <Route path="herbs/:id" element={route(<HerbDetailPage />)} />
          <Route path="herbs-db" element={route(<PublicHerbsPage />)} />
          <Route path="combo" element={route(<ComboPage />)} />

          <Route path="constitution" element={route(<ConstitutionPage />)} />
          <Route path="acupoints" element={route(<AcupointsPage />)} />
          <Route path="symptom-search" element={route(<SymptomSearchPage />)} />
          <Route path="pulse" element={route(<PulseDiagnosisPage />)} />
          <Route path="dosage" element={route(<DosageCalculatorPage />)} />
          <Route path="patients" element={route(<PatientsPage />)} />
          <Route path="patients/:id" element={route(<PatientDetailPage />)} />
          <Route path="classics" element={route(<ClassicsPage />)} />
          <Route path="insurance" element={route(<InsuranceCodePage />)} />
          <Route path="insurance-fee" element={route(<InsuranceFeeSearchPage />)} />
          <Route path="documents" element={route(<DocumentsPage />)} />

          <Route path="pattern-diagnosis" element={route(<PatternDiagnosisPage />)} />
          <Route path="claim-check" element={route(<ClaimCheckPage />)} />
          <Route path="formula-compare" element={route(<FormulaComparePage />)} />
          <Route path="red-flag" element={route(<RedFlagPage />)} />
          <Route path="voice-chart" element={route(<VoiceChartPage />)} />

          <Route path="byeongyang" element={route(<ByeongYangTablePage />)} />
          <Route path="school-compare" element={route(<SchoolComparisonPage />)} />
          <Route path="integrated-diagnosis" element={route(<IntegratedDiagnosisPage />)} />
          <Route path="unified-search" element={route(<UnifiedSearchPage />)} />
          <Route path="case-search" element={route(<CaseSearchPage />)} />

          <Route path="my-cases" element={route(<MyCasesPage />)} />
          <Route path="statistics" element={route(<StatisticsDashboardPage />)} />

          <Route path="analytics" element={route(<AnalyticsDashboardPage />)} />
          <Route path="smart-insurance" element={route(<InsurancePage />)} />
          <Route path="crm" element={route(<CrmPage />)} />
          <Route path="case-network" element={route(<CaseSharingPage />)} />
          <Route path="inventory" element={route(<InventoryPage />)} />

          <Route path="community" element={route(<CommunityPage />)} />
          <Route path="community/cases" element={route(<CommunityPage />)} />
          <Route path="community/qna" element={route(<CommunityPage />)} />
          <Route path="community/general" element={route(<CommunityPage />)} />
          <Route path="community/forum" element={route(<CommunityPage />)} />
          <Route path="community/forum/:slug" element={route(<CommunityPage />)} />
          <Route path="community/post/:id" element={route(<PostDetailPage />)} />
          <Route path="community/write" element={route(<WritePostPage />)} />
          <Route path="community/my/posts" element={route(<CommunityPage />)} />
          <Route path="community/my/bookmarks" element={route(<CommunityPage />)} />

          <Route path="subscription" element={route(<SubscriptionPage />)} />
          <Route path="subscription/success" element={route(<SubscriptionSuccessPage />)} />

          <Route path="settings" element={route(<SettingsPage />)} />
          <Route path="activity" element={route(<ActivityLogPage />)} />
          <Route path="profile" element={route(<ProfilePage />)} />
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
          <Route index element={route(<AdminDashboardPage />)} />
          <Route path="users" element={route(<AdminUsersPage />)} />
          <Route path="subscriptions" element={route(<AdminSubscriptionsPage />)} />
          <Route path="audit-logs" element={route(<AdminAuditLogsPage />)} />
          <Route path="clinics" element={route(<AdminClinicsPage />)} />
          <Route path="content" element={route(<AdminContentPage />)} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <Toaster />
      <OfflineBanner />
      <WelcomeModal />
    </HanjaSettingsProvider>
  )
}

export default App
