import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 로컬스토리지 키
const PATIENTS_STORAGE_KEY = 'hanmed_patients'
const VISITS_STORAGE_KEY = 'hanmed_patient_visits'

interface StoredPatient {
  id: string
  name: string
  birthDate: string
  gender: 'M' | 'F'
  phone: string
  constitution?: string
  lastVisit: string
  totalVisits: number
  mainComplaint: string
  isActive: boolean
}

interface VisitRecord {
  id: string
  date: string
  symptoms: string[]
  diagnosis: string
  prescription: string
  pulseNote: string
  painScore: number
  notes: string
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
}

const defaultDemoPatient = {
  id: '1',
  name: '김영희',
  birthDate: '1985-03-15',
  gender: 'F' as const,
  phone: '010-1234-5678',
  address: '서울시 강남구 역삼동',
  constitution: '소음인',
  allergies: ['페니실린'],
  medications: ['고혈압약 (아침)'],
  mainComplaint: '만성 소화불량, 피로',
  medicalHistory: '2020년 위염 진단',
}

const defaultVisits: VisitRecord[] = [
  {
    id: '1',
    date: '2024-01-15',
    symptoms: ['소화불량', '식후 더부룩함', '피로', '수족냉'],
    diagnosis: '비기허(脾氣虛), 위한(胃寒)',
    prescription: '향사육군자탕 가미',
    pulseNote: '좌관: 세약, 우관: 허완',
    painScore: 6,
    notes: '식사량 줄이고 따뜻한 음식 권고. 2주 후 재진.',
  },
  {
    id: '2',
    date: '2024-01-01',
    symptoms: ['소화불량', '복부 팽만감', '피로', '수족냉', '변비'],
    diagnosis: '비기허(脾氣虛)',
    prescription: '육군자탕',
    pulseNote: '전체적으로 세약',
    painScore: 7,
    notes: '초진. 3개월 전부터 증상 시작.',
  },
  {
    id: '3',
    date: '2023-12-15',
    symptoms: ['소화불량', '복통', '피로', '수족냉'],
    diagnosis: '비위허한(脾胃虛寒)',
    prescription: '이중탕',
    pulseNote: '지맥, 세약',
    painScore: 8,
    notes: '급성 악화. 찬음식 섭취 후 증상 심화.',
  },
]

// 로컬스토리지에서 환자 데이터 로드
function loadPatientFromStorage(patientId: string): StoredPatient | null {
  try {
    const stored = localStorage.getItem(PATIENTS_STORAGE_KEY)
    if (stored) {
      const patients: StoredPatient[] = JSON.parse(stored)
      return patients.find(p => p.id === patientId) || null
    }
  } catch (e) {
    console.error('Failed to load patient from storage:', e)
  }
  return null
}

// 로컬스토리지에서 환자 진료 기록 로드
function loadVisitsFromStorage(patientId: string): VisitRecord[] {
  try {
    const stored = localStorage.getItem(`${VISITS_STORAGE_KEY}_${patientId}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load visits from storage:', e)
  }
  return []
}

// 로컬스토리지에 환자 진료 기록 저장
function saveVisitsToStorage(patientId: string, visits: VisitRecord[]): void {
  try {
    localStorage.setItem(`${VISITS_STORAGE_KEY}_${patientId}`, JSON.stringify(visits))
  } catch (e) {
    console.error('Failed to save visits to storage:', e)
  }
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

  // 환자 데이터 로드
  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      return
    }

    const storedPatient = loadPatientFromStorage(id)
    let storedVisits = loadVisitsFromStorage(id)

    if (storedPatient) {
      // 로컬스토리지에서 찾은 환자
      setPatient({
        id: storedPatient.id,
        name: storedPatient.name,
        birthDate: storedPatient.birthDate,
        gender: storedPatient.gender,
        phone: storedPatient.phone,
        address: '',
        constitution: storedPatient.constitution || '',
        allergies: [],
        medications: [],
        mainComplaint: storedPatient.mainComplaint,
        medicalHistory: '',
      })
      // 진료 기록이 없으면 빈 배열
      setVisits(storedVisits.length > 0 ? storedVisits : [])
    } else if (id === '1') {
      // 기본 데모 환자
      setPatient(defaultDemoPatient)
      setVisits(defaultVisits)
    } else {
      // 찾을 수 없는 환자
      setPatient(null)
    }

    setIsLoading(false)
  }, [id])

  // 진료 기록 변경 시 저장
  useEffect(() => {
    if (id && visits.length > 0) {
      saveVisitsToStorage(id, visits)
    }
  }, [id, visits])

  // 새 진료 기록 폼
  const [newVisit, setNewVisit] = useState<NewVisitForm>({
    symptoms: '',
    diagnosis: '',
    prescription: '',
    pulseNote: '',
    painScore: 5,
    notes: '',
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

  const getTrend = (current: number, previous: number) => {
    if (current < previous) return { icon: TrendingDown, color: 'text-green-500', label: '호전' }
    if (current > previous) return { icon: TrendingUp, color: 'text-red-500', label: '악화' }
    return { icon: Minus, color: 'text-gray-500', label: '유지' }
  }

  // 경과 데이터 계산
  const progressData: ProgressData[] = visits
    .slice(0, 5)
    .reverse()
    .map((v) => ({
      date: v.date.slice(5).replace('-', '/'),
      painScore: v.painScore,
      symptomCount: v.symptoms.length,
    }))

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

  const handleAddVisit = () => {
    if (!validateForm()) return

    const today = new Date().toISOString().split('T')[0]
    const newId = (Math.max(...visits.map((v) => parseInt(v.id))) + 1).toString()

    const visit: VisitRecord = {
      id: newId,
      date: today,
      symptoms: newVisit.symptoms.split(',').map((s) => s.trim()).filter(Boolean),
      diagnosis: newVisit.diagnosis.trim(),
      prescription: newVisit.prescription.trim(),
      pulseNote: newVisit.pulseNote.trim(),
      painScore: newVisit.painScore,
      notes: newVisit.notes.trim(),
    }

    setVisits([visit, ...visits])
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
    })
    setFormErrors({})

    setTimeout(() => setShowSuccessToast(false), 3000)
  }

  const getPainScoreColor = (score: number) => {
    if (score <= 3) return 'bg-green-100 text-green-700'
    if (score <= 6) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                patient.gender === 'F' ? 'bg-pink-100' : 'bg-blue-100'
              )}
            >
              <User className={cn('h-6 w-6', patient.gender === 'F' ? 'text-pink-500' : 'text-blue-500')} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
              <p className="text-gray-500">
                {patient.gender === 'F' ? '여' : '남'}, 만 {calculateAge(patient.birthDate)}세
                {patient.constitution && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    {patient.constitution}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <Link
          to="/dashboard/consultation"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all mr-2"
        >
          <Brain className="h-5 w-5" />
          AI 진료
        </Link>
        <button
          onClick={() => setShowNewVisitModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-5 w-5" />
          새 진료 기록
        </button>
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
            {hasVisits ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{latestVisit.painScore}/10</p>
                {previousVisit && (() => {
                  const trend = getTrend(latestVisit.painScore, previousVisit.painScore)
                  const TrendIcon = trend.icon
                  return <TrendIcon className={cn('h-5 w-5', trend.color)} />
                })()}
              </>
            ) : (
              <p className="text-2xl font-bold text-gray-400">-</p>
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
              <User className="h-5 w-5 text-gray-500" />
              기본 정보
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">생년월일</span>
                <span className="font-medium">{patient.birthDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">연락처</span>
                <span className="font-medium">{patient.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">주소</span>
                <span className="font-medium">{patient.address}</span>
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
              <Stethoscope className="h-5 w-5 text-gray-500" />
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
              <div>
                <p className="text-sm text-gray-500 mb-2">복용 약물</p>
                <div className="flex flex-wrap gap-2">
                  {patient.medications.map((med, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg">
                      {med}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{visit.date}</p>
                    <p className="text-sm text-gray-500">{index === 0 ? '최근 진료' : `${index + 1}번째 전`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">통증 점수</span>
                  <span className={cn('px-3 py-1 rounded-full font-bold', getPainScoreColor(visit.painScore))}>
                    {visit.painScore}/10
                  </span>
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
                    <Pill className="h-4 w-4 text-teal-500" />
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
          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl border border-green-100 p-6">
            <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              경과 요약
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/70 rounded-xl p-4">
                <p className="text-sm text-gray-600">통증 점수 변화</p>
                <p className="text-2xl font-bold text-green-600">
                  {visits.length > 1 ? (
                    <>
                      {visits[visits.length - 1].painScore - visits[0].painScore > 0 ? '+' : ''}
                      {visits[0].painScore - visits[visits.length - 1].painScore}점
                      <span className="text-sm font-normal ml-1">
                        ({Math.round(((visits[visits.length - 1].painScore - visits[0].painScore) / visits[visits.length - 1].painScore) * -100)}% 감소)
                      </span>
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
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">진료 기록이 저장되었습니다</p>
              <p className="text-sm text-green-100">{new Date().toLocaleDateString('ko-KR')} 기록 추가</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
