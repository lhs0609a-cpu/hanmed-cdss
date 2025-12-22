import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Toaster } from '@/components/ui/toaster'

// Layouts
import DashboardLayout from '@/components/layouts/DashboardLayout'

// Pages
import LoginPage from '@/app/auth/LoginPage'
import RegisterPage from '@/app/auth/RegisterPage'
import DashboardPage from '@/app/dashboard/DashboardPage'
import ConsultationPage from '@/app/consultation/ConsultationPage'
import CasesPage from '@/app/cases/CasesPage'
import InteractionsPage from '@/app/interactions/InteractionsPage'
import FormulasPage from '@/app/formulas/FormulasPage'
import FormulaDetailPage from '@/app/formulas/FormulaDetailPage'
import HerbsPage from '@/app/herbs/HerbsPage'
import HerbDetailPage from '@/app/herbs/HerbDetailPage'
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
import DocumentsPage from '@/app/documents/DocumentsPage'

// Core Features - New
import PatternDiagnosisPage from '@/app/diagnosis/PatternDiagnosisPage'
import ClaimCheckPage from '@/app/claim-check/ClaimCheckPage'
import FormulaComparePage from '@/app/formula-compare/FormulaComparePage'
import RedFlagPage from '@/app/red-flag/RedFlagPage'
import VoiceChartPage from '@/app/voice-chart/VoiceChartPage'

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
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
          <Route path="documents" element={<DocumentsPage />} />

          {/* Core Features - New */}
          <Route path="pattern-diagnosis" element={<PatternDiagnosisPage />} />
          <Route path="claim-check" element={<ClaimCheckPage />} />
          <Route path="formula-compare" element={<FormulaComparePage />} />
          <Route path="red-flag" element={<RedFlagPage />} />
          <Route path="voice-chart" element={<VoiceChartPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </>
  )
}

export default App
