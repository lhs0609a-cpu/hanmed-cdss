import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Calendar,
  FileText,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Pill,
  Stethoscope,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Brain,
  AlertTriangle,
  Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SimilarCaseSuccessCard } from '@/components/diagnosis/SimilarCaseSuccessCard'
import { CheopyakAssistant } from '@/components/cheopyak/CheopyakAssistant'
import { AutoInsuranceSheet } from '@/components/autoinsurance/AutoInsuranceSheet'
import { DrugInteractionPanel } from '@/components/interactions/DrugInteractionPanel'
import { MedicationGuideModal } from '@/components/guide/MedicationGuideModal'
import { CHEOPYAK_DISEASES } from '@/data/cheopyak-codes'
import { logError } from '@/lib/errors'
import {
  fetchMyPatient,
  fetchMyVisits,
  createMyVisit,
  recordVisitOutcome,
  type VisitOutcome,
} from '@/services/myPatients'
import { fetchMyCases, createMyCase } from '@/services/myCases'
import type { MyCaseOutcome } from '@/services/myCases'
import { setInlineToastTimeout } from '@/hooks/useToast'
import { Toss3DIcon } from '@/components/common/Toss3DIcon'

/** 경과 색상 — 대시보드 카드와 같은 규칙을 쓴다. */
const OUTCOME_TONE: Record<string, string> = {
  완치: 'border-green-200 bg-green-50 text-green-700',
  호전: 'border-amber-200 bg-amber-50 text-amber-700',
  진행중: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  무효: 'border-neutral-200 bg-neutral-50 text-neutral-600',
  악화: 'border-red-200 bg-red-50 text-red-700',
}

interface VisitRecord {
  id: string
  date: string
  symptoms: string[]
  diagnosis: string
  prescription: string
  pulseNote: string
  /** 통증 점수 — 안 물어본 진료는 null. 0(통증 없음)과 구분해야 한다. */
  painScore: number | null
  notes: string
  cheopyakDisease?: string | null
  cheopyakDays?: number | null
  nonCoveredItems?: Array<{ name: string; amount: number }>
  nonCoveredConsentAt?: string | null
  interactionNoticeGivenAt?: string | null
  /** 서버 진료 기록의 경과 — 미기록이면 null */
  outcome?: string | null
  outcomeNotes?: string | null
  outcomeRecordedAt?: string | null
}

interface ProgressData {
  date: string
  painScore: number
  symptomCount: number
}

interface NewVisitForm {
  symptoms: string
  diagnosis: string
  prescription: string
  pulseNote: string
  painScore: number
  notes: string
  /** 첩약 시범사업 급여 처방일 때만 채운다 — 연간 한도 계산의 근거가 된다. */
  cheopyakDisease: string
  cheopyakDays: string
  /** 비급여 사전 설명 — 항목·금액·사유·대체항목 */
  nonCoveredName: string
  nonCoveredAmount: string
  nonCoveredReason: string
  nonCoveredAlternative: string
  nonCoveredConsent: boolean
}

const defaultDemoPatient: {
  id: string
  name: string
  birthDate: string
  gender: 'M' | 'F' | null
  phone: string
  address: string
  constitution: string
  allergies: string[]
  medications: string[]
  mainComplaint: string
  medicalHistory: string
} = {
  id: '1',
  name: '김영희',
  birthDate: '1985-03-15',
  gender: 'F',
  phone: '010-1234-5678',
  address: '서울시 강남구 역삼동',
  constitution: '소음인',
  allergies: ['페니실린'],
  medications: ['고혈압약 (아침)'],
  mainComplaint: '만성 소화불량, 피로',
  medicalHistory: '2020년 위염 진단',
}





export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'progress'>('overview')
  const [showNewVisitModal, setShowNewVisitModal] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [patient, setPatient] = useState<typeof defaultDemoPatient | null>(null)
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [isSavingVisit, setIsSavingVisit] = useState(false)
  // 타임라인에서 경과를 바로 적을 수 있게 — 대시보드까지 가지 않아도 된다.
  const [outcomeOpenId, setOutcomeOpenId] = useState<string | null>(null)
  /** 경과와 함께 잡는 재방문 예정일 — 이 날짜가 지나면 확인 목록에 뜬다. */
  const [followUpDate, setFollowUpDate] = useState('')
  /** 이미 치험례로 옮긴 진료 — 같은 진료를 두 번 올리지 않게 막는다. */
  const [promotedVisitIds, setPromotedVisitIds] = useState<Set<string>>(new Set())
  const [promotingId, setPromotingId] = useState<string | null>(null)
  /** 자보 내역서를 열어 둔 진료 */
  const [autoSheetVisit, setAutoSheetVisit] = useState<VisitRecord | null>(null)
  /** 복약 안내서를 열어 둔 진료 */
  const [guideVisit, setGuideVisit] = useState<VisitRecord | null>(null)

  // 환자·진료 기록 로드 — 서버에서.
  //
  // 명부는 이미 서버로 옮겼는데 이 화면만 localStorage 를 읽고 있었다.
  // 목록에서 연 환자가 상세에서는 "찾을 수 없음" 으로 뜨는 상태였다.
  const loadPatient = useCallback(async () => {
    if (!id) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const [p, vs, myCases] = await Promise.all([
        fetchMyPatient(id),
        fetchMyVisits(id, 100),
        // 치험례 조회가 실패해도 차트는 떠야 한다 — 승격 버튼만 다시 보일 뿐이다.
        fetchMyCases().catch(() => []),
      ])
      setPromotedVisitIds(
        new Set(myCases.map((c) => c.sourceVisitId).filter((v): v is string => Boolean(v))),
      )
      setPatient({
        id: p.id,
        name: p.name,
        birthDate: p.birthDate ?? '',
        // 성별·생년월일은 안 받은 환자가 많다. 모르면 비워 둔다 —
        // 임의로 '여 · 만 NaN세' 를 만들어 두면 차트를 못 믿게 된다.
        gender: (p.gender as 'M' | 'F' | null) ?? null,
        phone: p.phone ?? '',
        address: '',
        constitution: p.constitution ?? '',
        allergies: [],
        medications: p.medications ?? [],
        mainComplaint: p.mainComplaint ?? '',
        medicalHistory: '',
      })
      setVisits(
        vs.map((v) => ({
          id: v.id,
          date: v.visitedAt.slice(0, 10),
          symptoms: (v.symptoms ?? []).map((x) => x.name).filter(Boolean),
          diagnosis: v.diagnosis ?? '',
          prescription: v.formulaName ?? '',
          pulseNote: v.pulseNote ?? '',
          painScore: v.painScore,
          notes: v.notes ?? '',
          cheopyakDisease: v.cheopyakDisease,
          cheopyakDays: v.cheopyakDays,
          nonCoveredItems: v.nonCoveredItems,
          nonCoveredConsentAt: v.nonCoveredConsentAt,
          interactionNoticeGivenAt: v.interactionNoticeGivenAt,
          outcome: v.outcome,
          outcomeNotes: v.outcomeNotes,
          outcomeRecordedAt: v.outcomeRecordedAt,
        })),
      )
    } catch (err) {
      logError(err, 'PatientDetailPage')
      setPatient(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadPatient()
  }, [loadPatient])

  // 새 진료 기록 폼
  const [newVisit, setNewVisit] = useState<NewVisitForm>({
    symptoms: '',
    diagnosis: '',
    prescription: '',
    pulseNote: '',
    painScore: 5,
    notes: '',
    cheopyakDisease: '',
    cheopyakDays: '10',
    nonCoveredName: '',
    nonCoveredAmount: '',
    nonCoveredReason: '',
    nonCoveredAlternative: '',
    nonCoveredConsent: false,
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewVisitForm, string>>>({})

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  /** 성별·나이 표기 — 모르는 값은 아예 빼고 있는 것만 잇는다. */
  const patientSubtitle = [
    patient?.gender === 'F' ? '여' : patient?.gender === 'M' ? '남' : null,
    patient?.birthDate ? `만 ${calculateAge(patient.birthDate)}세` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const getTrend = (current: number, previous: number) => {
    if (current < previous) return { icon: TrendingDown, color: 'text-green-500', label: '호전' }
    if (current > previous) return { icon: TrendingUp, color: 'text-red-500', label: '악화' }
    return { icon: Minus, color: 'text-gray-500', label: '유지' }
  }

  // 경과 데이터 계산
  // 통증 점수를 안 받은 진료는 그래프에서 뺀다 — 0 으로 찍으면 없던 호전이 생긴다.
  const progressData: ProgressData[] = visits
    .filter((v) => v.painScore !== null)
    .slice(0, 5)
    .reverse()
    .map((v) => ({
      date: v.date.slice(5).replace('-', '/'),
      painScore: v.painScore as number,
      symptomCount: v.symptoms.length,
    }))

  /**
   * 통증 점수 변화 — 점수를 받은 진료끼리만 비교한다.
   * 첫 진료가 0 점이면 감소율은 계산되지 않는다(0 으로 나눈다).
   */
  const painChange = (() => {
    const scored = visits.filter((v) => v.painScore !== null)
    if (scored.length < 2) return null
    const latest = scored[0].painScore as number
    const first = scored[scored.length - 1].painScore as number
    return {
      delta: latest - first,
      percent: first > 0 ? Math.round(((latest - first) / first) * 100) : null,
    }
  })()

  /**
   * 진료를 내 치험례로 옮긴다.
   *
   * 경과까지 적은 진료는 이미 치험례에 필요한 내용을 다 갖고 있다. 그걸 다시
   * 타이핑하게 두면 아무도 안 옮기고, 치험례는 영영 안 쌓인다.
   *
   * 환자 이름·연락처는 넘기지 않는다 — 치험례는 나중에 공유될 수 있는 기록이라
   * 나이·성별·체질까지만 가져간다.
   */
  const handlePromoteToCase = async (visit: VisitRecord) => {
    if (!patient || promotingId) return
    setPromotingId(visit.id)
    try {
      await createMyCase({
        sourceVisitId: visit.id,
        patientAge: patient.birthDate ? calculateAge(patient.birthDate) : null,
        patientGender: patient.gender,
        patientConstitution: patient.constitution || null,
        chiefComplaint:
          patient.mainComplaint || visit.symptoms.join(', ') || visit.diagnosis || '주소증 기록 없음',
        symptoms: visit.symptoms,
        diagnosis: visit.diagnosis || null,
        byeonjeung: visit.diagnosis || null,
        formulaName: visit.prescription,
        outcome: (visit.outcome as MyCaseOutcome) ?? null,
        outcomeDetails: visit.outcomeNotes ?? null,
        notes: [visit.pulseNote && `맥진: ${visit.pulseNote}`, visit.notes]
          .filter(Boolean)
          .join(String.fromCharCode(10)) || null,
      })
      setPromotedVisitIds((prev) => new Set(prev).add(visit.id))
    } catch (err) {
      logError(err, 'PatientDetailPage.promoteCase')
    } finally {
      setPromotingId(null)
    }
  }

  /** 타임라인에서 경과 기록 — 기록하면 대시보드 확인 목록에서도 빠진다. */
  const handleRecordOutcome = async (visitId: string, outcome: VisitOutcome) => {
    try {
      const saved = await recordVisitOutcome(visitId, {
        outcome,
        // 날짜만 받으므로 그 날 0시로 보낸다. 지나면 확인 목록에 뜬다.
        followUpAt: followUpDate ? new Date(followUpDate).toISOString() : null,
      })
      setVisits((prev) =>
        prev.map((v) =>
          v.id === visitId
            ? { ...v, outcome: saved.outcome, outcomeRecordedAt: saved.outcomeRecordedAt }
            : v,
        ),
      )
      setOutcomeOpenId(null)
      setFollowUpDate('')
    } catch (err) {
      logError(err, 'PatientDetailPage.recordOutcome')
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewVisitForm, string>> = {}

    if (!newVisit.symptoms.trim()) {
      errors.symptoms = '증상을 입력해주세요'
    }
    if (!newVisit.diagnosis.trim()) {
      errors.diagnosis = '진단을 입력해주세요'
    }
    if (!newVisit.prescription.trim()) {
      errors.prescription = '처방을 입력해주세요'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  /** 진료 기록 추가 — 서버에 저장한다. 브라우저에만 남기면 기기를 바꾸는 순간 사라진다. */
  const handleAddVisit = async () => {
    if (!validateForm() || !id || isSavingVisit) return

    setIsSavingVisit(true)
    try {
      const saved = await createMyVisit({
        patientId: id,
        visitedAt: new Date().toISOString(),
        chiefComplaint: newVisit.symptoms.trim() || null,
        symptoms: newVisit.symptoms
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
          .map((name) => ({ name })),
        diagnosis: newVisit.diagnosis.trim() || null,
        formulaName: newVisit.prescription.trim() || null,
        pulseNote: newVisit.pulseNote.trim() || null,
        painScore: newVisit.painScore,
        notes: newVisit.notes.trim() || null,
        // 질환을 고르지 않았으면 급여 처방이 아니다 — 일수도 보내지 않는다.
        cheopyakDisease: newVisit.cheopyakDisease || null,
        cheopyakDays: newVisit.cheopyakDisease
          ? parseInt(newVisit.cheopyakDays, 10) || null
          : null,
        nonCoveredItems: newVisit.nonCoveredName.trim()
          ? [
              {
                name: newVisit.nonCoveredName.trim(),
                amount: parseInt(newVisit.nonCoveredAmount, 10) || 0,
                reason: newVisit.nonCoveredReason.trim() || null,
                alternative: newVisit.nonCoveredAlternative.trim() || null,
              },
            ]
          : [],
        nonCoveredConsentGiven: newVisit.nonCoveredConsent,
      })
      setVisits((prev) => [
        {
          id: saved.id,
          date: saved.visitedAt.slice(0, 10),
          symptoms: (saved.symptoms ?? []).map((x) => x.name),
          diagnosis: saved.diagnosis ?? '',
          prescription: saved.formulaName ?? '',
          pulseNote: saved.pulseNote ?? '',
          painScore: saved.painScore,
          notes: saved.notes ?? '',
          cheopyakDisease: saved.cheopyakDisease,
          cheopyakDays: saved.cheopyakDays,
          nonCoveredItems: saved.nonCoveredItems,
          nonCoveredConsentAt: saved.nonCoveredConsentAt,
          interactionNoticeGivenAt: saved.interactionNoticeGivenAt,
          outcome: saved.outcome,
          outcomeNotes: saved.outcomeNotes,
          outcomeRecordedAt: saved.outcomeRecordedAt,
        },
        ...prev,
      ])
    } catch (err) {
      logError(err, 'PatientDetailPage.addVisit')
      setFormErrors({ symptoms: '진료 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' })
      setIsSavingVisit(false)
      return
    }
    setIsSavingVisit(false)

    setShowNewVisitModal(false)
    setShowSuccessToast(true)
    setActiveTab('visits')

    // 폼 초기화
    setNewVisit({
      symptoms: '',
      diagnosis: '',
      prescription: '',
      pulseNote: '',
      painScore: 5,
      notes: '',
      cheopyakDisease: '',
      cheopyakDays: '10',
      nonCoveredName: '',
      nonCoveredAmount: '',
      nonCoveredReason: '',
      nonCoveredAlternative: '',
      nonCoveredConsent: false,
    })
    setFormErrors({})

    // 글자수 기반 자동 닫힘 (기본 6초+)
    setInlineToastTimeout(() => setShowSuccessToast(false), '진료 기록이 추가되었습니다')
  }

  /** 환자 차트 인쇄 — print.css 의 [data-print-area] 만 노출. */
  const handlePrintChart = () => {
    window.print()
  }


  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  // 환자를 찾을 수 없음
  if (!patient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">환자 정보</h1>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">환자를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 환자 정보가 존재하지 않습니다.</p>
          <Link
            to="/dashboard/patients"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            환자 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const latestVisit = visits[0]
  const previousVisit = visits[1]
  const hasVisits = visits.length > 0

  return (
    <div className="space-y-6" data-print-area>
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          data-print-hide
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-11 h-11 rounded-md flex items-center justify-center bg-neutral-100',
              )}
            >
              <User className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">{patient.name}</h1>
              <p className="text-[13px] text-neutral-500">
                {patientSubtitle || '기본 정보 미입력'}
                {patient.constitution && (
                  <span className="ml-2 px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[11px] font-semibold rounded-sm">
                    {patient.constitution}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handlePrintChart}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl transition-colors"
          title="환자 차트와 진료 기록을 A4 용지로 인쇄합니다"
          data-print-hide
        >
          <Printer className="h-5 w-5" aria-hidden="true" />
          차트 인쇄
        </button>
        <Link
          to="/dashboard/consultation"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all"
          data-print-hide
        >
          <Brain className="h-5 w-5" />
          AI 진료
        </Link>
        <button
          onClick={() => setShowNewVisitModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          data-print-hide
        >
          <Plus className="h-5 w-5" />
          새 진료 기록
        </button>
      </div>

      {/* 인쇄 전용 헤더 (한의원 정보) — 화면에서는 보이지 않음 */}
      <div className="print-only print-rx-header">
        <h2 className="text-lg font-bold">환자 차트</h2>
        <p className="text-xs text-gray-600 mt-1">
          발행일: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">총 내원 횟수</p>
          <p className="text-2xl font-bold text-gray-900">{visits.length}회</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">현재 통증 점수</p>
          <div className="flex items-center gap-2">
            {hasVisits && latestVisit.painScore !== null ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{latestVisit.painScore}/10</p>
                {previousVisit?.painScore != null && (() => {
                  const trend = getTrend(latestVisit.painScore as number, previousVisit.painScore)
                  const TrendIcon = trend.icon
                  return <TrendIcon className={cn('h-5 w-5', trend.color)} />
                })()}
              </>
            ) : (
              <p className="text-2xl font-bold text-gray-400">{hasVisits ? '미기록' : '-'}</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">최근 처방</p>
          <p className="text-lg font-bold text-gray-900 truncate">
            {hasVisits ? latestVisit.prescription : '-'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">주소증</p>
          <p className="text-lg font-bold text-gray-900 truncate">{patient.mainComplaint || '-'}</p>
        </div>
      </div>

      {/* 이 환자 주소증과 닮은 치험례 — 차트만 쌓아 두면 기록장이다.
          같은 호소로 다른 한의사가 어떻게 했는지가 옆에 있어야 판단에 쓴다. */}
      {patient.mainComplaint && (
        <SimilarCaseSuccessCard chiefComplaint={patient.mainComplaint} symptoms={[]} />
      )}

      {/* Tabs - 모바일에서 가로 스크롤 가능 */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 md:gap-2 border-b border-gray-200 min-w-max">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3 md:px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap',
              activeTab === 'overview'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            )}
          >
            환자 정보
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={cn(
              'px-3 md:px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap',
              activeTab === 'visits'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            )}
          >
            진료 기록 ({visits.length})
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={cn(
              'px-3 md:px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap',
              activeTab === 'progress'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            )}
          >
            경과 추이
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Toss3DIcon icon={User} tone="blue" size="sm" />
              기본 정보
            </h3>
            <div className="space-y-3">
              {/* 빈 값은 빈칸이 아니라 '미입력' 으로 —
                  칸이 비어 있으면 안 받은 건지 화면이 깨진 건지 구분이 안 된다. */}
              <div className="flex justify-between">
                <span className="text-gray-500">생년월일</span>
                <span className="font-medium">{patient.birthDate || '미입력'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">연락처</span>
                <span className="font-medium">{patient.phone || '미입력'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">체질</span>
                <span className="font-medium">{patient.constitution || '미진단'}</span>
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Toss3DIcon icon={Stethoscope} tone="teal" size="sm" />
              의료 정보
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">주소증</p>
                <p className="text-gray-900">{patient.mainComplaint}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">과거력</p>
                <p className="text-gray-900">{patient.medicalHistory}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">알레르기</p>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, i) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-lg">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 첩약 시범사업 — 남은 한도와 체크리스트 초안.
              설문에서 76%가 '체크리스트 등 번거로운 행정절차' 를 애로로 꼽았다. */}
          <CheopyakAssistant
            patientId={patient.id}
            patientName={patient.name}
            patientAgeGender={patientSubtitle || undefined}
            latestVisit={
              hasVisits
                ? {
                    visitedAt: latestVisit.date,
                    symptoms: latestVisit.symptoms,
                    diagnosis: latestVisit.diagnosis,
                    formulaName: latestVisit.prescription,
                    pulseNote: latestVisit.pulseNote,
                    painScore: latestVisit.painScore,
                  }
                : null
            }
            className="lg:col-span-2"
          />

          {/* 한약-양약 병용 점검 — 대법원이 인정한 설명의무의 출발점이다.
              무엇을 먹고 있는지 모르면 설명할 수도, 남길 수도 없다. */}
          <DrugInteractionPanel
            patientId={patient.id}
            medications={patient.medications}
            onMedicationsChange={(next) =>
              setPatient((prev) => (prev ? { ...prev, medications: next } : prev))
            }
            visit={
              hasVisits
                ? {
                    id: latestVisit.id,
                    formulaName: latestVisit.prescription,
                    interactionNoticeGivenAt: latestVisit.interactionNoticeGivenAt,
                  }
                : null
            }
            className="lg:col-span-2"
          />
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="space-y-4">
          {visits.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">아직 진료 기록이 없습니다.</p>
              <button
                onClick={() => setShowNewVisitModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                첫 진료 기록 추가
              </button>
            </div>
          ) : visits.map((visit, index) => (
            <div key={visit.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Toss3DIcon icon={Calendar} tone="blue" size="md" />
                  <div>
                    <p className="font-bold text-gray-900">{visit.date}</p>
                    <p className="text-sm text-gray-500">{index === 0 ? '최근 진료' : `${index + 1}번째 전`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 경과가 이 진료의 결론이다. 통증 점수보다 먼저 눈에 들어와야 한다. */}
                  {visit.outcome ? (
                    <span
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm font-bold',
                        OUTCOME_TONE[visit.outcome] ?? 'border-neutral-200 bg-neutral-50 text-neutral-600',
                      )}
                    >
                      {visit.outcome}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                      경과 미기록
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">증상</p>
                  <div className="flex flex-wrap gap-2">
                    {visit.symptoms.map((symptom, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">진단</p>
                  <p className="text-gray-900">{visit.diagnosis}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">처방</p>
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-900 font-medium">{visit.prescription}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">맥진</p>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-red-500" />
                    <span className="text-gray-900">{visit.pulseNote || '-'}</span>
                  </div>
                </div>
              </div>

              {visit.notes && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">
                    <FileText className="inline h-4 w-4 mr-1 text-gray-400" />
                    {visit.notes}
                  </p>
                </div>
              )}

              {/* 자보 진료였다면 내역서가 필요하다. 2026년부터 첩약·약침
                  조제내역서 제출이 의무라 차트에서 바로 뽑을 수 있어야 한다. */}
              {visit.prescription && (
                <div className="mt-3 flex flex-wrap gap-4">
                  {/* 환자가 뭘 먹는지 모른다는 게 한의원 기피 이유 상위였다.
                      차트에 있는 내용이니 버튼 한 번으로 넘겨 준다. */}
                  <button
                    type="button"
                    onClick={() => setGuideVisit(visit)}
                    className="text-[13px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    환자 복약 안내서 →
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoSheetVisit(visit)}
                    className="text-[13px] font-semibold text-neutral-600 hover:text-neutral-900"
                  >
                    자보 내역서 만들기 →
                  </button>
                </div>
              )}

              {/* 경과 — 기록돼 있으면 보여주고, 없으면 여기서 바로 적게 한다.
                  대시보드까지 가지 않아도 환자를 보면서 남길 수 있어야 실제로 적는다. */}
              {visit.outcome ? (
                <>
                  {visit.outcomeNotes && (
                    <div className="mt-3 rounded-xl border border-neutral-200 p-3">
                      <p className="text-[13px] leading-relaxed text-neutral-700">
                        <span className="font-semibold text-neutral-900">경과 메모 </span>
                        {visit.outcomeNotes}
                      </p>
                    </div>
                  )}
                  {/* 경과까지 적은 진료는 그대로 치험례가 된다. 다시 타이핑하게 두면
                      아무도 안 옮기고 치험례는 영영 안 쌓인다. */}
                  <div className="mt-3 border-t border-neutral-100 pt-3">
                    {promotedVisitIds.has(visit.id) ? (
                      <p className="flex items-center gap-1.5 text-[13px] text-neutral-500">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        내 치험례에 저장됨
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handlePromoteToCase(visit)}
                        disabled={promotingId === visit.id}
                        className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        {promotingId === visit.id ? '저장 중...' : '내 치험례로 저장 →'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-3 border-t border-neutral-100 pt-3">
                  {outcomeOpenId === visit.id ? (
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-[13px] text-neutral-600">
                        재방문 예정일
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="rounded-lg border border-neutral-200 px-2 py-1 text-[13px] focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-neutral-400">(선택 — 지나면 확인 목록에 뜹니다)</span>
                      </label>
                    <div className="flex flex-wrap gap-2">
                      {(['완치', '호전', '진행중', '무효', '악화'] as VisitOutcome[]).map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => void handleRecordOutcome(visit.id, o)}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors',
                            OUTCOME_TONE[o],
                          )}
                        >
                          {o}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOutcomeOpenId(null)}
                        className="rounded-lg px-3 py-2 text-[13px] text-neutral-500 hover:bg-neutral-100"
                      >
                        취소
                      </button>
                    </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOutcomeOpenId(visit.id)}
                      className="text-[13px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      경과 기록하기 →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-6">
          {progressData.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">진료 기록이 있어야 경과 추이를 확인할 수 있습니다.</p>
              <button
                onClick={() => setShowNewVisitModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                첫 진료 기록 추가
              </button>
            </div>
          ) : (
            <>
              {/* Pain Score Chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-6">통증 점수 추이</h3>
                <div className="h-64 flex items-end justify-around gap-4">
                  {progressData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-sm font-bold text-gray-900 mb-2">{data.painScore}</span>
                    <div
                      className={cn(
                        'w-full max-w-16 rounded-t-lg transition-all',
                        data.painScore <= 3 ? 'bg-green-400' : data.painScore <= 6 ? 'bg-yellow-400' : 'bg-red-400'
                      )}
                      style={{ height: `${data.painScore * 20}px` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 mt-2">{data.date}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded" />
                <span className="text-gray-600">양호 (1-3)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded" />
                <span className="text-gray-600">중간 (4-6)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded" />
                <span className="text-gray-600">심함 (7-10)</span>
              </div>
            </div>
          </div>

          {/* Symptom Count Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-6">증상 개수 추이</h3>
            <div className="h-48 flex items-end justify-around gap-4">
              {progressData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-sm font-bold text-gray-900 mb-2">{data.symptomCount}개</span>
                    <div
                      className="w-full max-w-16 bg-blue-400 rounded-t-lg transition-all"
                      style={{ height: `${data.symptomCount * 25}px` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 mt-2">{data.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Summary */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-green-100 p-6">
            <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
              <Toss3DIcon icon={TrendingDown} tone="green" size="sm" />
              경과 요약
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/70 rounded-xl p-4">
                <p className="text-sm text-gray-600">통증 점수 변화</p>
                <p className="text-2xl font-bold text-green-600">
                  {painChange ? (
                    <>
                      {painChange.delta > 0 ? '+' : ''}
                      {painChange.delta}점
                      {painChange.percent !== null && (
                        <span className="text-sm font-normal ml-1">
                          ({painChange.percent}% {painChange.delta < 0 ? '감소' : '증가'})
                        </span>
                      )}
                    </>
                  ) : (
                    '데이터 부족'
                  )}
                </p>
              </div>
              <div className="bg-white/70 rounded-xl p-4">
                <p className="text-sm text-gray-600">치료 기간</p>
                <p className="text-2xl font-bold text-gray-900">
                  {visits.length > 1
                    ? `${Math.ceil((new Date(visits[0].date).getTime() - new Date(visits[visits.length - 1].date).getTime()) / (1000 * 60 * 60 * 24))}일`
                    : '1일'}
                </p>
              </div>
              <div className="bg-white/70 rounded-xl p-4">
                <p className="text-sm text-gray-600">총 진료 횟수</p>
                <p className="text-2xl font-bold text-gray-900">{visits.length}회</p>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {guideVisit && (
        <MedicationGuideModal
          visitId={guideVisit.id}
          patientId={patient.id}
          formulaName={guideVisit.prescription}
          defaultDays={guideVisit.cheopyakDays ?? null}
          visitDiagnosis={guideVisit.diagnosis || null}
          nonCoveredItems={guideVisit.nonCoveredItems}
          nonCoveredConsentAt={guideVisit.nonCoveredConsentAt}
          onClose={() => setGuideVisit(null)}
        />
      )}

      {autoSheetVisit && (
        <AutoInsuranceSheet
          patientName={patient.name}
          patientBirthDate={patient.birthDate || undefined}
          visit={{
            visitedAt: autoSheetVisit.date,
            diagnosis: autoSheetVisit.diagnosis,
            formulaName: autoSheetVisit.prescription,
            days: autoSheetVisit.cheopyakDays ?? 7,
          }}
          onClose={() => setAutoSheetVisit(null)}
        />
      )}

      {/* New Visit Modal */}
      {showNewVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">새 진료 기록</h2>
                <p className="text-blue-100 text-sm">{patient.name} 환자</p>
              </div>
              <button onClick={() => setShowNewVisitModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
              {/* 필수 입력 안내 */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span><strong>(필수)</strong> 표시된 항목은 반드시 입력해야 합니다.</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    증상
                    <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                    <span className="text-xs text-red-500 font-medium">(필수)</span>
                  </span>
                  <span className="text-gray-400 font-normal ml-1 text-xs">(쉼표로 구분)</span>
                </label>
                <input
                  type="text"
                  value={newVisit.symptoms}
                  onChange={(e) => setNewVisit({ ...newVisit, symptoms: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                    formErrors.symptoms ? 'border-red-300' : 'border-gray-200'
                  )}
                  placeholder="소화불량, 피로, 두통..."
                />
                {formErrors.symptoms && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.symptoms}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    진단
                    <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                    <span className="text-xs text-red-500 font-medium">(필수)</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={newVisit.diagnosis}
                  onChange={(e) => setNewVisit({ ...newVisit, diagnosis: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                    formErrors.diagnosis ? 'border-red-300' : 'border-gray-200'
                  )}
                  placeholder="비기허(脾氣虛)..."
                />
                {formErrors.diagnosis && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.diagnosis}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    처방
                    <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                    <span className="text-xs text-red-500 font-medium">(필수)</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={newVisit.prescription}
                  onChange={(e) => setNewVisit({ ...newVisit, prescription: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                    formErrors.prescription ? 'border-red-300' : 'border-gray-200'
                  )}
                  placeholder="육군자탕 가미..."
                />
                {formErrors.prescription && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.prescription}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    맥진 소견
                    <span className="text-xs text-gray-400 font-normal">(선택)</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={newVisit.pulseNote}
                  onChange={(e) => setNewVisit({ ...newVisit, pulseNote: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="좌촌: 부삭, 우관: 허완..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  통증 점수: <span className="text-blue-600 font-bold">{newVisit.painScore}/10</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={newVisit.painScore}
                  onChange={(e) => setNewVisit({ ...newVisit, painScore: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0 (통증 없음)</span>
                  <span>10 (극심한 통증)</span>
                </div>
              </div>

              {/* 비급여 사전 설명 — 의료법 제45조의2 는 비급여를 하기 '전에'
                  항목·가격·사유·대체 항목을 설명하고 동의를 받도록 한다.
                  복약 안내서에 금액을 적어 보여주는 건 처방 뒤라 이 의무를
                  대신하지 못한다. 설명한 시점이 진료 단위로 남아야 한다. */}
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-3 text-sm font-medium text-gray-700">
                  비급여 사전 설명
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    (비급여 항목이 있을 때)
                  </span>
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    value={newVisit.nonCoveredName}
                    onChange={(e) => setNewVisit({ ...newVisit, nonCoveredName: e.target.value })}
                    placeholder="항목명 (예: 첩약 10일분)"
                    aria-label="비급여 항목명"
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    value={newVisit.nonCoveredAmount}
                    onChange={(e) => setNewVisit({ ...newVisit, nonCoveredAmount: e.target.value })}
                    placeholder="금액 (원)"
                    aria-label="비급여 금액"
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <input
                    value={newVisit.nonCoveredReason}
                    onChange={(e) => setNewVisit({ ...newVisit, nonCoveredReason: e.target.value })}
                    placeholder="필요한 사유"
                    aria-label="비급여 사유"
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <input
                    value={newVisit.nonCoveredAlternative}
                    onChange={(e) =>
                      setNewVisit({ ...newVisit, nonCoveredAlternative: e.target.value })
                    }
                    placeholder="대체 가능 항목 (없으면 '없음')"
                    aria-label="대체 가능 항목"
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={newVisit.nonCoveredConsent}
                    onChange={(e) =>
                      setNewVisit({ ...newVisit, nonCoveredConsent: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 accent-blue-500"
                  />
                  <span>
                    위 항목의 <strong>가격·사유·대체 항목을 진료 전에 설명하고 동의를
                    받았습니다.</strong>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      체크하면 설명 시점이 기록됩니다. 항목만 적어 두는 것과 실제로
                      설명·동의를 받은 것은 다르게 남습니다.
                    </span>
                  </span>
                </label>
              </div>

              {/* 첩약 급여 처방이면 여기서 남긴다 — 안 남기면 연간 한도를
                  계산할 근거가 없고, 결국 한의사가 지난 처방을 기억해서 세게 된다. */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    첩약 건강보험
                    <span className="text-xs text-gray-400 font-normal">(급여 처방일 때만)</span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={newVisit.cheopyakDisease}
                    onChange={(e) => setNewVisit({ ...newVisit, cheopyakDisease: e.target.value })}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">해당 없음 (비급여)</option>
                    {CHEOPYAK_DISEASES.filter((d) => d.isPilotCovered !== false).map((d) => (
                      <option key={d.pilotCode} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newVisit.cheopyakDays}
                    onChange={(e) => setNewVisit({ ...newVisit, cheopyakDays: e.target.value })}
                    disabled={!newVisit.cheopyakDisease}
                    aria-label="첩약 처방 일수"
                    className="w-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                  />
                  <span className="self-center text-sm text-gray-500">일분</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    메모
                    <span className="text-xs text-gray-400 font-normal">(선택)</span>
                  </span>
                </label>
                <textarea
                  value={newVisit.notes}
                  onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none h-24"
                  placeholder="추가 메모..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowNewVisitModal(false)
                  setFormErrors({})
                  setNewVisit({
                    symptoms: '',
                    diagnosis: '',
                    prescription: '',
                    pulseNote: '',
                    painScore: 5,
                    notes: '',
                    cheopyakDisease: '',
                    cheopyakDays: '10',
                    nonCoveredName: '',
                    nonCoveredAmount: '',
                    nonCoveredReason: '',
                    nonCoveredAlternative: '',
                    nonCoveredConsent: false,
                  })
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleAddVisit}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
              >
                <Save className="h-5 w-5" />
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div
          className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300"
          role="alert"
          aria-live="polite"
          data-print-hide
        >
          <div className="bg-green-500 text-white pl-6 pr-3 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium">진료 기록이 저장되었습니다</p>
              <p className="text-sm text-green-100">{new Date().toLocaleDateString('ko-KR')} 기록 추가</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessToast(false)}
              className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
              aria-label="알림 닫기"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* 인쇄 전용 푸터 — 의료기기/면책 고지 */}
      <div className="print-only print-footer-disclaimer">
        본 차트는 임상 보조 출력물이며, 본 서비스는 의료기기가 아닙니다.
        최종 진단 · 처방은 한의사의 판단에 따릅니다.
      </div>
    </div>
  )
}
