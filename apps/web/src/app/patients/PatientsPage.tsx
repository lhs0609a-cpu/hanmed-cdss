import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  Plus,
  Phone,
  ChevronRight,
  User,
  Clock,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import TourGuide, { TourRestartButton } from '@/components/common/TourGuide'
import { ExportDialog } from '@/components/common'

const patientsTourSteps = [
  {
    target: '[data-tour="search-patients"]',
    title: '환자 검색',
    content: '환자 이름, 전화번호, 주소증으로 빠르게 검색할 수 있어요.',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="add-patient"]',
    title: '새 환자 등록',
    content: '이 버튼을 눌러 새 환자를 등록하세요. 이름, 연락처, 증상 등을 입력합니다.',
    placement: 'bottom' as const,
    tip: '체질을 미리 입력하면 AI 추천이 더 정확해요!',
  },
  {
    target: '[data-tour="patient-list"]',
    title: '환자 목록',
    content: '등록된 환자들이 표시됩니다. 카드를 클릭하면 상세 차트로 이동해요.',
    placement: 'top' as const,
  },
]

interface Patient {
  id: string
  name: string
  birthDate: string
  gender: 'M' | 'F'
  phone: string
  constitution?: string
  lastVisit: string
  totalVisits: number
  mainComplaint: string
  status: 'active' | 'inactive'
}

const initialPatients: Patient[] = [
  {
    id: '1',
    name: '김영희',
    birthDate: '1985-03-15',
    gender: 'F',
    phone: '010-1234-5678',
    constitution: '소음인',
    lastVisit: '2024-01-15',
    totalVisits: 8,
    mainComplaint: '만성 소화불량, 피로',
    status: 'active',
  },
  {
    id: '2',
    name: '박철수',
    birthDate: '1972-07-22',
    gender: 'M',
    phone: '010-2345-6789',
    constitution: '태음인',
    lastVisit: '2024-01-10',
    totalVisits: 12,
    mainComplaint: '요통, 무릎 관절통',
    status: 'active',
  },
  {
    id: '3',
    name: '이민지',
    birthDate: '1990-11-08',
    gender: 'F',
    phone: '010-3456-7890',
    constitution: '소양인',
    lastVisit: '2024-01-08',
    totalVisits: 5,
    mainComplaint: '월경불순, 두통',
    status: 'active',
  },
  {
    id: '4',
    name: '정대호',
    birthDate: '1968-05-30',
    gender: 'M',
    phone: '010-4567-8901',
    lastVisit: '2023-12-20',
    totalVisits: 3,
    mainComplaint: '불면, 어깨 통증',
    status: 'inactive',
  },
  {
    id: '5',
    name: '최수진',
    birthDate: '1995-09-12',
    gender: 'F',
    phone: '010-5678-9012',
    constitution: '태양인',
    lastVisit: '2024-01-18',
    totalVisits: 2,
    mainComplaint: '스트레스성 두통',
    status: 'active',
  },
]

interface NewPatientForm {
  name: string
  birthDate: string
  gender: 'M' | 'F'
  phone: string
  constitution: string
  mainComplaint: string
}

// 로컬스토리지 키
const PATIENTS_STORAGE_KEY = 'hanmed_patients'

// 로컬스토리지에서 환자 데이터 로드
function loadPatientsFromStorage(): Patient[] {
  try {
    const stored = localStorage.getItem(PATIENTS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load patients from storage:', e)
  }
  return initialPatients
}

// 로컬스토리지에 환자 데이터 저장
function savePatientsToStorage(patients: Patient[]): void {
  try {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients))
  } catch (e) {
    console.error('Failed to save patients to storage:', e)
  }
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>(() => loadPatientsFromStorage())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showNewPatientModal, setShowNewPatientModal] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [newPatientName, setNewPatientName] = useState('')
  const [showTour, setShowTour] = useState(true)

  // 환자 데이터 변경 시 로컬스토리지에 저장
  useEffect(() => {
    savePatientsToStorage(patients)
  }, [patients])

  // 새 환자 폼
  const [newPatient, setNewPatient] = useState<NewPatientForm>({
    name: '',
    birthDate: '',
    gender: 'F',
    phone: '',
    constitution: '',
    mainComplaint: '',
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewPatientForm, string>>>({})

  // 필터링된 환자 목록 (메모이제이션으로 성능 최적화)
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        patient.name.includes(searchQuery) ||
        patient.phone.includes(searchQuery) ||
        patient.mainComplaint.includes(searchQuery)

      const matchesStatus = filterStatus === 'all' || patient.status === filterStatus

      return matchesSearch && matchesStatus
    })
  }, [patients, searchQuery, filterStatus])

  const calculateAge = useCallback((birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }, [])

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  }, [])

  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof NewPatientForm, string>> = {}

    if (!newPatient.name.trim()) {
      errors.name = '이름을 입력해주세요'
    }
    if (!newPatient.birthDate) {
      errors.birthDate = '생년월일을 입력해주세요'
    }
    if (!newPatient.phone.trim()) {
      errors.phone = '전화번호를 입력해주세요'
    } else if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(newPatient.phone.replace(/-/g, ''))) {
      errors.phone = '올바른 전화번호 형식이 아닙니다'
    }
    if (!newPatient.mainComplaint.trim()) {
      errors.mainComplaint = '주소증을 입력해주세요'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [newPatient])

  const handleAddPatient = useCallback(() => {
    if (!validateForm()) return

    const today = new Date().toISOString().split('T')[0]
    const newId = (Math.max(...patients.map((p) => parseInt(p.id))) + 1).toString()

    const patient: Patient = {
      id: newId,
      name: newPatient.name.trim(),
      birthDate: newPatient.birthDate,
      gender: newPatient.gender,
      phone: newPatient.phone.trim(),
      constitution: newPatient.constitution || undefined,
      lastVisit: today,
      totalVisits: 0,
      mainComplaint: newPatient.mainComplaint.trim(),
      status: 'active',
    }

    setPatients([patient, ...patients])
    setNewPatientName(patient.name)
    setShowNewPatientModal(false)
    setShowSuccessToast(true)

    // 폼 초기화
    setNewPatient({
      name: '',
      birthDate: '',
      gender: 'F',
      phone: '',
      constitution: '',
      mainComplaint: '',
    })
    setFormErrors({})

    // 3초 후 토스트 숨기기
    setTimeout(() => setShowSuccessToast(false), 3000)
  }, [patients, newPatient, validateForm])

  const formatPhoneNumber = useCallback((value: string) => {
    const numbers = value.replace(/[^0-9]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-500" />
            환자 관리
          </h1>
          <p className="mt-1 text-gray-500">환자 차트와 진료 기록을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportDialog defaultType="patients" />
          <button
            data-tour="add-patient"
            onClick={() => setShowNewPatientModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            새 환자 등록
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">전체 환자</p>
          <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">활성 환자</p>
          <p className="text-2xl font-bold text-green-600">{patients.filter((p) => p.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">이번 달 방문</p>
          <p className="text-2xl font-bold text-blue-600">24</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">오늘 예약</p>
          <p className="text-2xl font-bold text-purple-600">5</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div data-tour="search-patients" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="환자명, 전화번호, 주소증으로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filterStatus === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filterStatus === 'active' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              활성
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filterStatus === 'inactive' ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              비활성
            </button>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div data-tour="patient-list" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  환자 정보
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  연락처
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  체질
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  주소증
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  최근 방문
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          patient.gender === 'F' ? 'bg-pink-100' : 'bg-blue-100'
                        )}
                      >
                        <User
                          className={cn('h-5 w-5', patient.gender === 'F' ? 'text-pink-500' : 'text-blue-500')}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{patient.name}</p>
                        <p className="text-sm text-gray-500">
                          {patient.gender === 'F' ? '여' : '남'}, 만 {calculateAge(patient.birthDate)}세
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {patient.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {patient.constitution ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg">
                        {patient.constitution}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">미진단</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700 max-w-xs truncate">{patient.mainComplaint}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-700">{formatDate(patient.lastVisit)}</p>
                        <p className="text-xs text-gray-500">총 {patient.totalVisits}회</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      차트 보기
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">검색 결과가 없습니다</p>
          </div>
        )}
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-patient-title"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 text-white flex items-center justify-between">
              <h2 id="new-patient-title" className="text-xl font-bold">새 환자 등록</h2>
              <button
                onClick={() => setShowNewPatientModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg"
                aria-label="닫기"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                    formErrors.name ? 'border-red-300' : 'border-gray-200'
                  )}
                  placeholder="환자 이름"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    생년월일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newPatient.birthDate}
                    onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                    className={cn(
                      'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                      formErrors.birthDate ? 'border-red-300' : 'border-gray-200'
                    )}
                  />
                  {formErrors.birthDate && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.birthDate}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    성별 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value as 'M' | 'F' })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  >
                    <option value="F">여성</option>
                    <option value="M">남성</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: formatPhoneNumber(e.target.value) })}
                  className={cn(
                    'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                    formErrors.phone ? 'border-red-300' : 'border-gray-200'
                  )}
                  placeholder="010-0000-0000"
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">체질 (선택)</label>
                <select
                  value={newPatient.constitution}
                  onChange={(e) => setNewPatient({ ...newPatient, constitution: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                >
                  <option value="">미정 / 미진단</option>
                  <option value="태양인">태양인</option>
                  <option value="태음인">태음인</option>
                  <option value="소양인">소양인</option>
                  <option value="소음인">소음인</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주소증 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newPatient.mainComplaint}
                  onChange={(e) => setNewPatient({ ...newPatient, mainComplaint: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none h-24',
                    formErrors.mainComplaint ? 'border-red-300' : 'border-gray-200'
                  )}
                  placeholder="주요 증상을 입력하세요"
                />
                {formErrors.mainComplaint && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.mainComplaint}
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  setShowNewPatientModal(false)
                  setFormErrors({})
                  setNewPatient({
                    name: '',
                    birthDate: '',
                    gender: 'F',
                    phone: '',
                    constitution: '',
                    mainComplaint: '',
                  })
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleAddPatient}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
              >
                등록
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
        >
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="font-medium">{newPatientName} 환자가 등록되었습니다</p>
              <p className="text-sm text-green-100">환자 차트에서 진료를 시작하세요</p>
            </div>
          </div>
        </div>
      )}

      {/* Tour Guide */}
      {showTour && (
        <TourGuide
          tourId="patients"
          steps={patientsTourSteps}
          onComplete={() => setShowTour(false)}
        />
      )}
      <TourRestartButton tourId="patients" onClick={() => setShowTour(true)} />
    </div>
  )
}
