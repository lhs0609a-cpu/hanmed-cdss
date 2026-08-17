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
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import TourGuide, { TourRestartButton } from '@/components/common/TourGuide'
import { ExportDialog } from '@/components/common'
import { matchesWithHanja } from '@/lib/hanja-map'
import { setInlineToastTimeout } from '@/hooks/useToast'
import { logError } from '@/lib/errors'
import {
  fetchMyPatients,
  createMyPatient,
  importLocalData,
  hasLegacyLocalData,
  type MyPatient,
} from '@/services/myPatients'

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


/**
 * 서버 DTO → 화면 모델.
 * 서버는 미입력 값을 null 로 주지만 이 화면의 렌더링·검색 코드는 문자열을 가정하므로
 * 여기서 한 번만 정규화한다(각 사용처에서 ?? '' 를 흩뿌리지 않게).
 */
function toViewPatient(p: MyPatient): Patient {
  return {
    id: p.id,
    name: p.name,
    birthDate: p.birthDate ?? '',
    gender: p.gender ?? 'F',
    phone: p.phone ?? '',
    constitution: p.constitution ?? undefined,
    lastVisit: p.lastVisitAt ?? p.createdAt,
    totalVisits: p.totalVisits,
    mainComplaint: p.mainComplaint ?? '',
    status: p.status,
  }
}

interface NewPatientForm {
  name: string
  birthDate: string
  /** "출생연도만" 입력 모드 — 1월 1일을 가정해 birthDate 를 채운다. */
  birthYearOnly: string
  birthMode: 'full' | 'year'
  gender: 'M' | 'F'
  phone: string
  constitution: string
  mainComplaint: string
}


export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showNewPatientModal, setShowNewPatientModal] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [newPatientName, setNewPatientName] = useState('')
  const [showTour, setShowTour] = useState(true)
  const [showImportBanner, setShowImportBanner] = useState(() => hasLegacyLocalData())
  const [isImporting, setIsImporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 서버에서 명부를 가져온다. (예전에는 localStorage 에서 읽었고,
  // 기기를 바꾸면 사라지는 데이터를 "전자차트"로 팔고 있었다.)
  const loadPatients = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const rows = await fetchMyPatients()
      setPatients(rows.map(toViewPatient))
    } catch (err) {
      logError(err, 'PatientsPage.load')
      setLoadError('환자 명부를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPatients()
  }, [loadPatients])

  const handleImportLocal = useCallback(async () => {
    setIsImporting(true)
    try {
      const result = await importLocalData()
      setShowImportBanner(false)
      await loadPatients()
      setNewPatientName(
        `환자 ${result.importedPatients}명 · 진료 기록 ${result.importedVisits}건을 서버로 옮겼습니다`,
      )
      setShowSuccessToast(true)
      setInlineToastTimeout(
        () => setShowSuccessToast(false),
        '로컬 데이터를 서버로 옮겼습니다',
        '이제 다른 기기에서도 같은 명부가 열립니다',
      )
    } catch (err) {
      logError(err, 'PatientsPage.import')
      setLoadError('로컬 데이터 이관에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsImporting(false)
    }
  }, [loadPatients])

  // 새 환자 폼
  const [newPatient, setNewPatient] = useState<NewPatientForm>({
    name: '',
    birthDate: '',
    birthYearOnly: '',
    birthMode: 'full',
    gender: 'F',
    phone: '',
    constitution: '',
    mainComplaint: '',
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewPatientForm, string>>>({})

  // 필터링된 환자 목록 (메모이제이션으로 성능 최적화)
  //
  // 검색은 한자/한글 양방향 매칭을 시도한다. 예) "이중탕" 으로 검색하면 "理中湯"
  // 도 매칭되고, 반대로 "理中湯" 으로 검색해도 "이중탕" 이 매칭된다.
  // (apps/web/src/lib/hanja-map.ts)
  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim()
    return patients.filter((patient) => {
      const matchesSearch =
        !q ||
        matchesWithHanja(patient.name, q) ||
        patient.phone.includes(q) ||
        matchesWithHanja(patient.mainComplaint, q)

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

    // 생년월일 또는 출생연도 둘 중 하나는 채워져야 한다.
    if (newPatient.birthMode === 'full') {
      if (!newPatient.birthDate) {
        errors.birthDate = '생년월일을 입력해주세요 (출생연도만 알아도 됩니다)'
      }
    } else {
      const yr = parseInt(newPatient.birthYearOnly, 10)
      const currentYear = new Date().getFullYear()
      if (!yr || yr < 1900 || yr > currentYear) {
        errors.birthYearOnly = `1900 ~ ${currentYear} 사이의 연도를 입력해주세요`
      }
    }

    // 전화번호 — 하이픈 제거 후 010/011/016/017/018/019 모두 허용 (KT/SKT/LGU+ 알뜰폰까지)
    const phoneDigits = newPatient.phone.replace(/[^0-9]/g, '')
    if (!phoneDigits) {
      errors.phone = '전화번호를 입력해주세요'
    } else if (!/^01[016789][0-9]{7,8}$/.test(phoneDigits)) {
      errors.phone = '010·011·016·017·018·019 로 시작하는 휴대전화 번호를 입력해주세요'
    }

    if (!newPatient.mainComplaint.trim()) {
      errors.mainComplaint = '주소증을 입력해주세요'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [newPatient])

  const handleAddPatient = useCallback(async () => {
    if (!validateForm()) return
    if (isSaving) return

    // 출생연도만 입력 모드면 1월 1일을 가정해 birthDate 를 생성
    const resolvedBirthDate =
      newPatient.birthMode === 'year'
        ? `${newPatient.birthYearOnly}-01-01`
        : newPatient.birthDate

    setIsSaving(true)
    let created: Awaited<ReturnType<typeof createMyPatient>>
    try {
      created = await createMyPatient({
        name: newPatient.name.trim(),
        birthDate: resolvedBirthDate || null,
        gender: newPatient.gender,
        phone: newPatient.phone.trim() || null,
        constitution: newPatient.constitution || null,
        mainComplaint: newPatient.mainComplaint.trim() || null,
      })
    } catch (err) {
      logError(err, 'PatientsPage.create')
      setFormErrors({ name: '환자 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.' })
      setIsSaving(false)
      return
    }
    setIsSaving(false)

    setPatients((prev) => [toViewPatient(created), ...prev])
    setNewPatientName(created.name)
    setShowNewPatientModal(false)
    setShowSuccessToast(true)

    // 폼 초기화
    setNewPatient({
      name: '',
      birthDate: '',
      birthYearOnly: '',
      birthMode: 'full',
      gender: 'F',
      phone: '',
      constitution: '',
      mainComplaint: '',
    })
    setFormErrors({})

    // 자동 닫힘 — 글자수 기반 (기본 6초+) 으로 사용자가 충분히 읽을 수 있게.
    setInlineToastTimeout(
      () => setShowSuccessToast(false),
      `${created.name} 환자가 등록되었습니다`,
      '환자 차트에서 진료를 시작하세요',
    )
  }, [newPatient, validateForm, isSaving])

  const formatPhoneNumber = useCallback((value: string) => {
    const numbers = value.replace(/[^0-9]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }, [])

  return (
    <div className="space-y-6">
      {/* 브라우저에만 남아 있던 예전 데이터 이관 — 서버 저장 전환 시 1회만 노출 */}
      {showImportBanner && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-blue-900">
                이 브라우저에 저장돼 있던 환자 기록이 있습니다
              </p>
              <p className="mt-0.5 text-[13px] text-blue-800">
                예전에는 환자 명부가 이 기기에만 저장됐습니다. 서버로 옮기면 다른 PC에서도
                열리고 백업됩니다. 원본은 지우지 않습니다.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={handleImportLocal}
                disabled={isImporting}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isImporting ? '옮기는 중…' : '서버로 옮기기'}
              </button>
              <button
                type="button"
                onClick={() => setShowImportBanner(false)}
                className="rounded-xl px-3 py-2.5 text-[13px] font-medium text-blue-800 transition-colors hover:bg-blue-100"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">
            환자
          </h1>
          <p className="mt-1 text-[14px] text-neutral-500">
            환자 차트와 진료 기록을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportDialog defaultType="patients" />
          <button
            data-tour="add-patient"
            onClick={() => setShowNewPatientModal(true)}
            className="inline-flex items-center gap-2 h-11 px-5 accent-gradient accent-glow text-white text-[14px] font-semibold rounded-md transition-all active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            새 환자 등록
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-tile rounded-2xl p-5">
          <p className="text-sm text-gray-500">전체 환자</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-900">{patients.length}</p>
        </div>
        <div className="glass-tile rounded-2xl p-5">
          <p className="text-sm text-gray-500">활성 환자</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-green-600">{patients.filter((p) => p.status === 'active').length}</p>
        </div>
        <div className="glass-tile rounded-2xl p-5">
          <p className="text-sm text-gray-500">이번 달 방문</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-blue-600">24</p>
        </div>
        <div className="glass-tile rounded-2xl p-5">
          <p className="text-sm text-gray-500">오늘 예약</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-purple-600">5</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div data-tour="search-patients" className="glass-surface rounded-2xl p-4">
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
      <div data-tour="patient-list" className="surface-card rounded-2xl overflow-hidden">
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

        {/* 조회 실패와 "환자 없음"은 완전히 다른 상태다 — 섞으면 한의사가
            자기 명부가 비었다고 오해한다. */}
        {!isLoading && loadError && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <p className="text-[15px] font-semibold text-neutral-700">{loadError}</p>
            <p className="text-[13px] text-neutral-500 mt-1">
              환자가 없는 것이 아니라, 명부 조회에 실패했습니다.
            </p>
            <button
              type="button"
              onClick={() => void loadPatients()}
              className="mt-5 inline-flex items-center gap-2 h-11 px-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[14px] font-semibold rounded-md transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {isLoading && (
          <div className="py-12 text-center text-[13px] text-neutral-500">
            환자 명부를 불러오는 중…
          </div>
        )}

        {!isLoading && !loadError && filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <p className="text-[15px] font-semibold text-neutral-700">
              {searchQuery.trim()
                ? `'${searchQuery}' 에 해당하는 환자가 없습니다`
                : '아직 등록된 환자가 없습니다'}
            </p>
            <p className="text-[13px] text-neutral-500 mt-1">
              {searchQuery.trim()
                ? '한자/한글 표기를 바꿔서 검색해 보세요 (예: 이중탕 ↔ 理中湯).'
                : '첫 환자를 등록하면 차트와 진료 기록을 시작할 수 있어요.'}
            </p>
            <button
              type="button"
              onClick={() => setShowNewPatientModal(true)}
              className="mt-5 inline-flex items-center gap-2 h-11 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-[14px] font-semibold rounded-md transition-colors active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />새 환자 등록
            </button>
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
                <label htmlFor="patient-name" className="block text-sm font-medium text-gray-700 mb-2">
                  이름 <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="patient-name"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.name}
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                    formErrors.name ? 'border-red-300' : 'border-gray-200'
                  )}
                  placeholder="환자 이름"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="patient-birth" className="block text-sm font-medium text-gray-700">
                      {newPatient.birthMode === 'full' ? '생년월일' : '출생연도'}{' '}
                      <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewPatient({
                          ...newPatient,
                          birthMode: newPatient.birthMode === 'full' ? 'year' : 'full',
                        })
                      }
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-700 underline"
                    >
                      {newPatient.birthMode === 'full' ? '연도만 입력' : '월/일까지 입력'}
                    </button>
                  </div>
                  {newPatient.birthMode === 'full' ? (
                    <input
                      id="patient-birth"
                      type="date"
                      required
                      aria-required="true"
                      aria-invalid={!!formErrors.birthDate}
                      value={newPatient.birthDate}
                      onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                      className={cn(
                        'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                        formErrors.birthDate ? 'border-red-300' : 'border-gray-200'
                      )}
                    />
                  ) : (
                    <input
                      id="patient-birth"
                      type="number"
                      inputMode="numeric"
                      required
                      aria-required="true"
                      aria-invalid={!!formErrors.birthYearOnly}
                      min={1900}
                      max={new Date().getFullYear()}
                      value={newPatient.birthYearOnly}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, birthYearOnly: e.target.value })
                      }
                      placeholder="예: 1985"
                      className={cn(
                        'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                        formErrors.birthYearOnly ? 'border-red-300' : 'border-gray-200'
                      )}
                    />
                  )}
                  {(formErrors.birthDate || formErrors.birthYearOnly) && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1" role="alert">
                      <AlertCircle className="h-3 w-3" aria-hidden="true" />{' '}
                      {formErrors.birthDate || formErrors.birthYearOnly}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="patient-gender" className="block text-sm font-medium text-gray-700 mb-2">
                    성별 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="patient-gender"
                    required
                    aria-required="true"
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
                <label htmlFor="patient-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호 <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="patient-phone"
                  type="tel"
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.phone}
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: formatPhoneNumber(e.target.value) })}
                  className={cn(
                    'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all',
                    formErrors.phone ? 'border-red-300' : 'border-gray-200'
                  )}
                  placeholder="010-0000-0000"
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {formErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="patient-constitution" className="block text-sm font-medium text-gray-700">
                    체질 (선택)
                  </label>
                  <Link
                    to="/dashboard/constitution"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 underline"
                  >
                    <HelpCircle className="h-3 w-3" aria-hidden="true" />
                    체질 진단 시작
                  </Link>
                </div>
                <select
                  id="patient-constitution"
                  value={newPatient.constitution}
                  onChange={(e) => setNewPatient({ ...newPatient, constitution: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  title="체질을 모르면 '미정'으로 저장 후, 진단 페이지에서 나중에 갱신할 수 있어요."
                >
                  <option value="">미정 / 미진단</option>
                  <option value="태양인">태양인</option>
                  <option value="태음인">태음인</option>
                  <option value="소양인">소양인</option>
                  <option value="소음인">소음인</option>
                </select>
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  체질을 모르면 일단 미정으로 저장하세요. 진단 페이지에서 언제든 갱신할 수 있습니다.
                </p>
              </div>

              <div>
                <label htmlFor="patient-complaint" className="block text-sm font-medium text-gray-700 mb-2">
                  주소증 <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="patient-complaint"
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.mainComplaint}
                  value={newPatient.mainComplaint}
                  onChange={(e) => setNewPatient({ ...newPatient, mainComplaint: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none h-24',
                    formErrors.mainComplaint ? 'border-red-300' : 'border-gray-200'
                  )}
                  placeholder="주요 증상을 입력하세요"
                />
                {formErrors.mainComplaint && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {formErrors.mainComplaint}
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
                    birthYearOnly: '',
                    birthMode: 'full',
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
          data-print-hide
        >
          <div className="bg-green-500 text-white pl-6 pr-3 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium">{newPatientName} 환자가 등록되었습니다</p>
              <p className="text-sm text-green-100">환자 차트에서 진료를 시작하세요</p>
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
