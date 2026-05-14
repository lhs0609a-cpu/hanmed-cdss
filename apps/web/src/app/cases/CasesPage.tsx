import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search,
  BookOpen,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { ErrorMessage, SearchCategoryFilter, DEFAULT_SEARCH_CATEGORIES } from '@/components/common'
import { BASE_STATS } from '@/config/stats.config'

// API에서 반환하는 케이스 타입
interface CaseFromAPI {
  id: string
  title: string
  chiefComplaint: string
  symptoms: string[]
  formulaName: string
  formulaHanja: string
  constitution: string
  diagnosis: string
  patientAge: number | null
  patientGender: string | null
  outcome: '완치' | '호전' | '무효' | null
  result: string
  originalText: string
  dataSource: string
}

// 상세 보기용 확장 타입
interface CaseRecord extends CaseFromAPI {
  // 상세 정보는 추후 별도 API에서 가져올 수 있음
}

// AI Engine API URL
const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL || 'https://api.ongojisin.co.kr'

// Mock 치험례 데이터 (API 실패 시 사용)
const MOCK_CASES: CaseFromAPI[] = [
  {
    id: 'mock-1',
    title: '만성 소화불량 치험례',
    chiefComplaint: '식후 더부룩함, 소화불량 3개월',
    symptoms: ['식욕부진', '복부팽만', '피로감', '수면장애'],
    formulaName: '보중익기탕',
    formulaHanja: '補中益氣湯',
    constitution: '소음인',
    diagnosis: '비기허증',
    patientAge: 45,
    patientGender: 'F',
    outcome: '완치',
    result: '4주 복용 후 소화기능 정상화, 식욕 회복',
    originalText: '여성 45세. 평소 체력이 약하고 소화가 잘 안 되는 편. 3개월 전부터 식후 더부룩함과 소화불량 증상이 심해짐. 복진상 복부 냉감 및 연약. 보중익기탕 가감 처방 후 4주 복용하여 증상 소실.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-2',
    title: '두통 및 현훈 치험례',
    chiefComplaint: '잦은 두통, 어지러움 2개월',
    symptoms: ['두통', '현훈', '이명', '불면'],
    formulaName: '반하백출천마탕',
    formulaHanja: '半夏白朮天麻湯',
    constitution: '태음인',
    diagnosis: '담음두통',
    patientAge: 52,
    patientGender: 'M',
    outcome: '호전',
    result: '6주 복용 후 두통 빈도 70% 감소',
    originalText: '남성 52세. 비만 체형. 2개월간 잦은 두통과 현훈 호소. 맥침활, 설태백니. 담음두통으로 변증하여 반하백출천마탕 처방. 6주 복용 후 두통 빈도 현저히 감소.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-3',
    title: '만성 요통 치험례',
    chiefComplaint: '허리 통증 6개월',
    symptoms: ['요통', '하지무력', '야간뇨', '피로'],
    formulaName: '팔미지황환',
    formulaHanja: '八味地黃丸',
    constitution: '소양인',
    diagnosis: '신양허증',
    patientAge: 58,
    patientGender: 'M',
    outcome: '호전',
    result: '8주 복용 후 요통 50% 경감, 야간뇨 감소',
    originalText: '남성 58세. 6개월 전부터 만성 요통으로 내원. 야간뇨 2-3회, 하지 무력감 동반. 맥침세, 설담. 신양허로 변증하여 팔미지황환 처방. 8주 복용 후 증상 개선.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-4',
    title: '불면증 치험례',
    chiefComplaint: '수면 장애 4개월',
    symptoms: ['입면곤란', '조기각성', '불안', '심계'],
    formulaName: '귀비탕',
    formulaHanja: '歸脾湯',
    constitution: '소음인',
    diagnosis: '심비양허',
    patientAge: 38,
    patientGender: 'F',
    outcome: '완치',
    result: '6주 복용 후 수면 정상화',
    originalText: '여성 38세. 직장인. 업무 스트레스로 4개월간 불면증 호소. 입면 곤란, 조기 각성, 주간 피로 심함. 심비양허로 변증하여 귀비탕 처방. 6주 복용 후 수면 패턴 정상화.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-5',
    title: '기능성 소화불량 치험례',
    chiefComplaint: '속쓰림, 복통 2개월',
    symptoms: ['속쓰림', '복통', '오심', '식욕부진'],
    formulaName: '소시호탕',
    formulaHanja: '小柴胡湯',
    constitution: '소양인',
    diagnosis: '간위불화',
    patientAge: 42,
    patientGender: 'M',
    outcome: '완치',
    result: '3주 복용 후 증상 소실',
    originalText: '남성 42세. 스트레스성 소화불량. 속쓰림과 복통 호소. 구고, 왕래한열 증상 동반. 소양인 체질로 소시호탕 처방. 3주 복용 후 증상 완전 소실.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-6',
    title: '갱년기 증후군 치험례',
    chiefComplaint: '안면홍조, 발한 1년',
    symptoms: ['안면홍조', '발한', '불면', '심계항진'],
    formulaName: '가미소요산',
    formulaHanja: '加味逍遙散',
    constitution: '태음인',
    diagnosis: '간울화화',
    patientAge: 51,
    patientGender: 'F',
    outcome: '호전',
    result: '8주 복용 후 홍조 발생 60% 감소',
    originalText: '여성 51세. 폐경 후 1년간 갱년기 증상으로 고생. 안면홍조, 야간 발한, 불면 호소. 간울화화로 변증하여 가미소요산 처방. 8주 복용 후 증상 현저히 개선.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-7',
    title: '기침 치험례',
    chiefComplaint: '마른기침 3주',
    symptoms: ['마른기침', '인후건조', '미열', '피로'],
    formulaName: '맥문동탕',
    formulaHanja: '麥門冬湯',
    constitution: '소양인',
    diagnosis: '폐음허',
    patientAge: 35,
    patientGender: 'M',
    outcome: '완치',
    result: '2주 복용 후 기침 소실',
    originalText: '남성 35세. 감기 후유증으로 3주간 마른기침 지속. 인후 건조감, 미열 동반. 맥세삭. 폐음허로 변증하여 맥문동탕 처방. 2주 복용 후 기침 완전 소실.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-8',
    title: '변비 치험례',
    chiefComplaint: '만성 변비 6개월',
    symptoms: ['변비', '복부팽만', '두통', '피부건조'],
    formulaName: '마자인환',
    formulaHanja: '麻子仁丸',
    constitution: '태음인',
    diagnosis: '장조변비',
    patientAge: 62,
    patientGender: 'F',
    outcome: '호전',
    result: '4주 복용 후 배변 주기 정상화',
    originalText: '여성 62세. 6개월간 만성 변비로 고생. 3-4일에 1회 배변, 변이 굳고 건조. 장조변비로 변증하여 마자인환 처방. 4주 복용 후 1-2일 1회 배변으로 개선.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-9',
    title: '감기 (풍한감모) 치험례',
    chiefComplaint: '오한, 발열, 두통 3일 — 감기 초기',
    symptoms: ['감기', '오한', '발열', '두통', '코막힘', '근육통'],
    formulaName: '갈근탕',
    formulaHanja: '葛根湯',
    constitution: '태음인',
    diagnosis: '풍한표실',
    patientAge: 28,
    patientGender: 'M',
    outcome: '완치',
    result: '3일 복용 후 감기 증상 소실',
    originalText: '남성 28세. 환절기 감기로 내원. 오한·미열·두통·항강 호소. 풍한외감으로 변증하여 갈근탕 처방. 3일 복용 후 증상 완전 소실.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-10',
    title: '감기 후 기침 치험례',
    chiefComplaint: '감기 후 잔존 기침 2주',
    symptoms: ['감기', '기침', '가래', '인후통', '피로'],
    formulaName: '소청룡탕',
    formulaHanja: '小靑龍湯',
    constitution: '소음인',
    diagnosis: '외한내음',
    patientAge: 41,
    patientGender: 'F',
    outcome: '완치',
    result: '1주 복용 후 기침·가래 소실',
    originalText: '여성 41세. 2주 전 감기 이후 기침과 묽은 가래 지속. 오한 동반. 외한내음으로 변증하여 소청룡탕 처방. 1주 복용으로 호전.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-11',
    title: '편두통 치험례',
    chiefComplaint: '편측 박동성 두통 반복 3개월',
    symptoms: ['두통', '편두통', '오심', '광공포', '소리공포'],
    formulaName: '천궁차조산',
    formulaHanja: '川芎茶調散',
    constitution: '소양인',
    diagnosis: '간양상항',
    patientAge: 33,
    patientGender: 'F',
    outcome: '호전',
    result: '6주 복용 후 두통 빈도·강도 60% 감소',
    originalText: '여성 33세. 3개월간 월 4–5회 편측 박동성 두통 발작. 두통 발작 시 오심·구토. 간양상항으로 변증하여 천궁차조산 처방. 6주 복용 후 빈도 현저히 감소.',
    dataSource: '대한한방내과학회지',
  },
  {
    id: 'mock-12',
    title: '급성 요통 치험례',
    chiefComplaint: '갑작스러운 허리 통증 1주',
    symptoms: ['요통', '허리통증', '근육경직', '하지방사통'],
    formulaName: '독활기생탕',
    formulaHanja: '獨活寄生湯',
    constitution: '태음인',
    diagnosis: '한습요통',
    patientAge: 47,
    patientGender: 'M',
    outcome: '완치',
    result: '2주 복용 후 통증 소실, 일상 복귀',
    originalText: '남성 47세. 무거운 짐을 들다 발생한 급성 요통. 한습 노출 병력. 한습요통으로 변증하여 독활기생탕 처방. 2주 복용으로 완전 회복.',
    dataSource: '대한한방내과학회지',
  },
]

// 성별 표시 함수
function formatGender(gender: string | null): string {
  if (!gender) return '미상'
  const v = String(gender).toLowerCase()
  if (v === 'm' || v === 'male' || v === '남' || v === '남성') return '남성'
  if (v === 'f' || v === 'female' || v === '여' || v === '여성') return '여성'
  if (v === 'unknown' || v === '미상') return '미상'
  return gender
}

// 케이스 데이터에서 처방명 추출 — 백엔드가 옛 코드(매핑 미반영)인 경우에도 동작하도록
// herbalFormulas[0].formulaName 으로 폴백한다.
function getFormulaName(c: any): string {
  if (c?.formulaName && c.formulaName !== '') return c.formulaName
  if (Array.isArray(c?.herbalFormulas) && c.herbalFormulas[0]?.formulaName) {
    return c.herbalFormulas[0].formulaName
  }
  return ''
}

// 결과 enum/한글 매핑
function getOutcome(c: any): string | null {
  return c?.outcome || c?.treatmentOutcome || null
}

// 변증명 폴백
function getDiagnosis(c: any): string {
  return c?.diagnosis || c?.patternDiagnosis || ''
}

// 체질 폴백
function getConstitution(c: any): string {
  return c?.constitution || c?.patientConstitution || ''
}

// 자주 등장하는 한자 괄호 표기 제거 — '딸꾹질(吃逆)' → '딸꾹질'
function stripHanja(text: string): string {
  if (!text) return ''
  return text.replace(/[\(（]([一-龥]+)[\)）]/g, '').trim()
}

// 해시태그 후보 추출 — 증상·체질·변증·결과를 하나의 태그 배열로
function buildHashtags(c: any): string[] {
  const tags: string[] = []
  const constitution = getConstitution(c)
  if (constitution) tags.push(`#${constitution}`)
  const diagnosis = getDiagnosis(c)
  if (diagnosis) tags.push(`#${stripHanja(diagnosis)}`)
  const outcome = getOutcome(c)
  if (outcome) tags.push(`#${outcome}`)
  const symptoms = Array.isArray(c?.symptoms) ? c.symptoms : []
  for (const s of symptoms.slice(0, 4)) {
    const name = typeof s === 'string' ? s : s?.name
    if (name) tags.push(`#${stripHanja(name)}`)
  }
  // 중복 제거
  return Array.from(new Set(tags.filter(Boolean)))
}

// 번호가 붙은 텍스트를 분리하여 포맷팅
function formatObservations(text: string): { number: string; content: string }[] {
  const pattern = /([①②③④⑤⑥⑦⑧⑨⑩])\s*([^①②③④⑤⑥⑦⑧⑨⑩]+)/g
  const matches: { number: string; content: string }[] = []
  let match
  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      number: match[1],
      content: match[2].trim()
    })
  }
  return matches
}

export default function CasesPage() {
  useSEO(PAGE_SEO.cases)

  const token = useAuthStore((state) => state.accessToken)
  const [searchParams, setSearchParams] = useSearchParams()

  // URL 파라미터에서 초기값 로드 (뒤로가기 시 상태 유지)
  const initialSearch = searchParams.get('q') || searchParams.get('keyword') || ''
  const initialCategory = searchParams.get('category') || 'all'
  const initialConstitution = searchParams.get('constitution') || ''
  const initialOutcome = searchParams.get('outcome') || ''
  const initialPage = parseInt(searchParams.get('page') || '1', 10)

  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [searchCategory, setSearchCategory] = useState(initialCategory)
  const [selectedConstitution, setSelectedConstitution] = useState(initialConstitution)
  const [selectedOutcome, setSelectedOutcome] = useState(initialOutcome)

  // API 데이터 상태
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [totalCases, setTotalCases] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(0)
  const [stats, setStats] = useState({ cured: 0, improved: 0, total: 0 })
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const ITEMS_PER_PAGE = 20

  // 상세 모달
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // 디바운스된 검색어
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)

  // URL 파라미터 업데이트 함수
  const updateSearchParams = useCallback((updates: Record<string, string | number>) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all' && value !== 1) {
        newParams.set(key, String(value))
      } else {
        newParams.delete(key)
      }
    })
    // replace: true로 설정하여 히스토리 스택 오염 방지
    setSearchParams(newParams, { replace: true })
  }, [searchParams, setSearchParams])

  // 검색어 디바운스 + URL 업데이트
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
      updateSearchParams({ q: searchQuery, page: 1 })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, updateSearchParams])

  // 필터 변경 시 첫 페이지로 + URL 업데이트
  useEffect(() => {
    setCurrentPage(1)
    updateSearchParams({
      category: searchCategory,
      constitution: selectedConstitution,
      outcome: selectedOutcome,
      page: 1,
    })
  }, [selectedConstitution, selectedOutcome, searchCategory, updateSearchParams])

  // 페이지 변경 시 URL 업데이트
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage)
    updateSearchParams({ page: newPage })
    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [updateSearchParams])

  // API에서 데이터 가져오기
  const fetchCases = useCallback(async (isManualRetry = false) => {
    if (isManualRetry) {
      setIsRetrying(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      })

      if (debouncedSearch) {
        params.append('search', debouncedSearch)
        // 검색 카테고리 필터 적용
        if (searchCategory !== 'all') {
          params.append('searchField', searchCategory)
        }
      }
      if (selectedConstitution) params.append('constitution', selectedConstitution)
      if (selectedOutcome) params.append('outcome', selectedOutcome)

      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

      // 백엔드 경로는 GET /api/v1/cases (이전엔 존재하지 않는 /cases/list 를 호출해서
      // 항상 mock 으로 fallback 되던 버그). 응답은 TransformInterceptor 로 한 번 감싸지고,
      // CasesService.findAll 이 { data, meta } 를 또 한 번 감싸므로 2단계 unwrap 한다.
      const response = await fetch(`${AI_ENGINE_URL}/api/v1/cases?${params}`, {
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (${response.status})`)
      }

      const json = await response.json()
      // TransformInterceptor 가 { success, data: <원본> } 으로 감쌈
      const wrapped = (json && typeof json === 'object' && 'data' in json) ? json.data : json
      // CasesService.findAll → { data: cases[], meta: { total, totalPages } }
      const cases = Array.isArray(wrapped?.data) ? wrapped.data : []
      const meta = wrapped?.meta || {}

      setCases(cases)
      setTotalCases(meta.total || 0)
      setTotalPages(meta.totalPages || 0)
      setRetryCount(0)
      setIsUsingMockData(false)

      // 통계 계산 — 백엔드는 treatmentOutcome enum 사용. 프론트 표시값과 매핑.
      const cured = cases.filter((c: any) => c.treatmentOutcome === '완치' || c.outcome === '완치').length
      const improved = cases.filter((c: any) => c.treatmentOutcome === '호전' || c.outcome === '호전').length
      setStats({ cured, improved, total: meta.total || 0 })
    } catch (err) {
      // API 실패 시 Mock 데이터 사용
      setIsUsingMockData(true)
      console.warn('치험례 API 호출 실패, Mock 데이터 사용:', err)

      // 검색어로 Mock 데이터 필터링
      let filteredMock = [...MOCK_CASES]

      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase()
        filteredMock = filteredMock.filter(c =>
          c.title.toLowerCase().includes(searchLower) ||
          c.chiefComplaint.toLowerCase().includes(searchLower) ||
          c.symptoms.some(s => s.toLowerCase().includes(searchLower)) ||
          c.formulaName.toLowerCase().includes(searchLower) ||
          c.diagnosis.toLowerCase().includes(searchLower) ||
          (c.originalText || '').toLowerCase().includes(searchLower) ||
          c.constitution.toLowerCase().includes(searchLower)
        )
      }
      if (selectedConstitution) {
        filteredMock = filteredMock.filter(c => c.constitution === selectedConstitution)
      }
      if (selectedOutcome) {
        filteredMock = filteredMock.filter(c => c.outcome === selectedOutcome)
      }

      setCases(filteredMock)
      // 검색·필터가 걸려있으면 실제 일치 건수를, 아니면 전체 DB 통계를 노출
      const hasActiveFilter = !!(debouncedSearch || selectedConstitution || selectedOutcome)
      const displayTotal = hasActiveFilter ? filteredMock.length : BASE_STATS.cases
      setTotalCases(displayTotal)
      setTotalPages(Math.max(1, Math.ceil(filteredMock.length / ITEMS_PER_PAGE)))

      // 통계 계산
      const cured = filteredMock.filter(c => c.outcome === '완치').length
      const improved = filteredMock.filter(c => c.outcome === '호전').length
      setStats({ cured, improved, total: displayTotal })

      setError(null) // Mock 데이터 사용 시 에러 숨김
      setRetryCount(0)
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }, [currentPage, debouncedSearch, searchCategory, selectedConstitution, selectedOutcome, token, cases.length])

  // 수동 재시도 핸들러
  const handleRetry = useCallback(() => {
    fetchCases(true)
  }, [fetchCases])

  useEffect(() => {
    fetchCases(false)
  }, [fetchCases])

  const openDetailModal = useCallback((caseItem: CaseRecord) => {
    setSelectedCase(caseItem)
    setShowDetailModal(true)
  }, [])

  const getOutcomeColor = useCallback((outcome: string | null) => {
    // Toss 톤 — 채도 줄이고 의미 구분만 유지 (성공=초록, 부분=호박, 실패=빨강)
    switch (outcome) {
      case '완치':
        return 'bg-green-50 text-green-700'
      case '호전':
        return 'bg-amber-50 text-amber-700'
      case '무효':
      case '악화':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-neutral-100 text-neutral-600'
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Demo Data Warning — 실제 API fallback 으로 mock 쓰는 경우에만 노출 */}
      {isUsingMockData && (
        <div className="mb-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center gap-2 text-[12px]">
          <span className="text-neutral-700 font-medium">샘플 데이터 표시 중</span>
          <span className="text-neutral-500">API 서버 연결 대기 — 실제 7,000+건이 DB에 있습니다.</span>
        </div>
      )}

      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">
          치험례
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          {totalCases > 0 ? `${totalCases.toLocaleString()}건의 치험례에서 검색합니다.` : '치험례 데이터를 불러오는 중…'}
        </p>
      </div>

      {/* 중복 데모 모드 배너 제거 — 상단에 이미 표시됨 */}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        {/* Search Category Filter - Pills */}
        <SearchCategoryFilter
          selectedCategory={searchCategory}
          onCategoryChange={setSearchCategory}
          variant="pills"
        />

        {/* Search Input & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={DEFAULT_SEARCH_CATEGORIES.find(c => c.id === searchCategory)?.placeholder || '검색어 입력...'}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={selectedConstitution}
            onChange={(e) => setSelectedConstitution(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          >
            <option value="">전체 체질</option>
            <option value="태양인">태양인</option>
            <option value="태음인">태음인</option>
            <option value="소양인">소양인</option>
            <option value="소음인">소음인</option>
          </select>
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          >
            <option value="">전체 결과</option>
            <option value="완치">완치</option>
            <option value="호전">호전</option>
            <option value="무효">무효</option>
          </select>
        </div>

        {/* Search tip based on category */}
        {searchCategory !== 'all' && (
          <p className="text-xs text-gray-500">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium mr-1">
              {DEFAULT_SEARCH_CATEGORIES.find(c => c.id === searchCategory)?.label}
            </span>
            필드에서만 검색합니다
          </p>
        )}
      </div>

      {/* Stats — Toss 톤: 검색 결과 한 줄로 텍스트로만, 카드 그리드 제거 */}
      <div className="flex items-baseline gap-2 px-1">
        <span className="text-[14px] text-neutral-500">
          {debouncedSearch || selectedConstitution || selectedOutcome ? '검색 결과' : '전체'}
        </span>
        <span className="text-[16px] font-bold text-neutral-900 tabular">
          {totalCases.toLocaleString()}건
        </span>
        {(stats.cured > 0 || stats.improved > 0) && (
          <span className="text-[12px] text-neutral-400 ml-2">
            완치 {stats.cured} · 호전 {stats.improved}
          </span>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="h-12 w-12 text-amber-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">치험례를 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태 - 자동 재시도 포함 */}
        {error && !loading && (
          <ErrorMessage
            severity="warning"
            message={error}
            description={
              retryCount > 2
                ? '여러 번 시도했지만 연결에 실패했습니다. 네트워크 상태를 확인해 주세요.'
                : '잠시 후 자동으로 다시 연결을 시도합니다.'
            }
            suggestion={
              retryCount > 2
                ? '문제가 지속되면 support@ongojisin.ai로 문의해 주세요.'
                : '인터넷 연결을 확인하시거나 잠시 기다려 주세요.'
            }
            onRetry={handleRetry}
            autoRetrySeconds={retryCount > 2 ? 0 : 10}
            isRetrying={isRetrying}
          />
        )}

        {/* 결과 목록 — Toss 톤: 핵심 정보 + 해시태그 칩, 군더더기 제거 */}
        {!loading && !error && cases.map((caseItem: any) => {
          const formulaName = getFormulaName(caseItem)
          const constitution = getConstitution(caseItem)
          const outcome = getOutcome(caseItem)
          const diagnosis = getDiagnosis(caseItem)
          const tags = buildHashtags(caseItem)
          const genderText = formatGender(caseItem.patientGender)
          const ageText = caseItem.patientAge ? `${caseItem.patientAge}세` : ''

          return (
            <button
              key={caseItem.id}
              type="button"
              onClick={() => openDetailModal(caseItem)}
              className="w-full text-left bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 hover:shadow-soft transition-all group"
            >
              {/* 헤더: 처방명 + 결과 배지 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[16px] text-neutral-900 truncate group-hover:text-primary transition-colors">
                    {formulaName || '처방 미기재'}
                  </h3>
                  <p className="text-[12px] text-neutral-500 mt-0.5 line-clamp-1">
                    {stripHanja(caseItem.chiefComplaint || '') || '주소증 미기재'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {outcome && (
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${getOutcomeColor(outcome)}`}>
                      {outcome}
                    </span>
                  )}
                  {constitution && (
                    <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-neutral-100 text-neutral-700">
                      {constitution}
                    </span>
                  )}
                </div>
              </div>

              {/* 해시태그 */}
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {tags.slice(0, 6).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium text-neutral-600 bg-neutral-50 hover:bg-neutral-100 px-2 py-0.5 rounded-md transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 메타 정보 한 줄 */}
              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[12px] text-neutral-500">
                <div className="flex items-center gap-3">
                  <span>
                    {genderText !== '미상' || ageText ? `${genderText} ${ageText}`.trim() : ''}
                  </span>
                  {diagnosis && (
                    <span className="truncate max-w-[200px]">
                      변증 · {stripHanja(diagnosis)}
                    </span>
                  )}
                </div>
                <span className="text-primary font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  상세 <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          )
        })}

        {/* 빈 결과 */}
        {!loading && !error && cases.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">검색 결과가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">다른 검색어로 시도해보세요</p>
          </div>
        )}

        {/* 페이지네이션 */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium ${
                      currentPage === pageNum
                        ? 'bg-amber-500 text-white'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 페이지 정보 */}
        {!loading && !error && totalCases > 0 && (
          <div className="text-center text-sm text-gray-500 pt-2">
            {totalCases.toLocaleString()}건 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, totalCases)}건 표시
          </div>
        )}
      </div>

      {/* 상세 정보 모달 — Toss 톤 단정한 카드형. 컬러 박스 줄이고 정보 위계로 구분 */}
      {showDetailModal && selectedCase && (() => {
        const c = selectedCase as any
        const formulaName = getFormulaName(c)
        const constitution = getConstitution(c)
        const outcome = getOutcome(c)
        const diagnosis = getDiagnosis(c)
        const genderText = formatGender(c.patientGender)
        const ageText = c.patientAge ? `${c.patientAge}세` : ''
        const tags = buildHashtags(c)
        const symptomList: string[] = (() => {
          if (Array.isArray(c.symptoms)) {
            return c.symptoms
              .map((s: any) => (typeof s === 'string' ? s : s?.name))
              .filter(Boolean) as string[]
          }
          return []
        })()
        const observations = formatObservations(c.originalText || '')

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-detail-title"
            onClick={() => setShowDetailModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col border border-neutral-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 — 흰 배경, 정보 위계 */}
              <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    {outcome && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${getOutcomeColor(outcome)}`}>
                        {outcome}
                      </span>
                    )}
                    {constitution && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                        {constitution}
                      </span>
                    )}
                    {(genderText !== '미상' || ageText) && (
                      <span className="text-[11px] text-neutral-500">
                        {`${genderText} ${ageText}`.trim()}
                      </span>
                    )}
                  </div>
                  <h2 id="case-detail-title" className="text-[22px] font-bold tracking-tight text-neutral-900">
                    {formulaName || '처방 미기재'}
                  </h2>
                  {c.formulaHanja && (
                    <p className="text-neutral-500 mt-0.5 text-[14px]">{c.formulaHanja}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-shrink-0 p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  aria-label="닫기"
                >
                  <X className="h-5 w-5 text-neutral-500" />
                </button>
              </div>

              {/* 본문 */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* 해시태그 한 줄 — 가장 빠른 컨텍스트 */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[12px] font-medium text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 주요 증상 */}
                {c.chiefComplaint && (
                  <section>
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      주요 증상
                    </h3>
                    <p className="text-[15px] text-neutral-800 leading-relaxed whitespace-pre-wrap">
                      {stripHanja(c.chiefComplaint)}
                    </p>
                  </section>
                )}

                {/* 변증 */}
                {diagnosis && (
                  <section className="pt-4 border-t border-neutral-100">
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      변증
                    </h3>
                    <p className="text-[15px] text-neutral-800">{stripHanja(diagnosis)}</p>
                  </section>
                )}

                {/* 증상 칩 — 해시태그와 다르게 증상만 깔끔히 */}
                {symptomList.length > 0 && (
                  <section className="pt-4 border-t border-neutral-100">
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      증상
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {symptomList.map((s, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-md text-[13px]"
                        >
                          {stripHanja(s)}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* 치료 결과 */}
                {c.result && (
                  <section className="pt-4 border-t border-neutral-100">
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      치료 결과 / 경과
                    </h3>
                    <p className="text-[15px] text-neutral-800 leading-relaxed whitespace-pre-wrap">
                      {c.result}
                    </p>
                  </section>
                )}

                {/* 세부 관찰 사항 ①②③ — 번호 위주, 시각 노이즈 줄임 */}
                {observations.length > 0 && (
                  <section className="pt-4 border-t border-neutral-100">
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-3">
                      세부 관찰 사항
                    </h3>
                    <ol className="space-y-2">
                      {observations.map((obs, idx) => (
                        <li key={idx} className="flex gap-3 text-[14px] leading-relaxed">
                          <span className="flex-shrink-0 w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-[13px]">
                            {idx + 1}
                          </span>
                          <p className="text-neutral-800 flex-1">{stripHanja(obs.content)}</p>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {/* 원문 전체 — 접힘 (기본 닫힘, 클릭으로 펼침) */}
                {c.originalText && (
                  <details className="pt-4 border-t border-neutral-100 group">
                    <summary className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700 select-none flex items-center justify-between">
                      <span>원문 전체</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                    </summary>
                    <pre className="mt-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-[13px] text-neutral-700 leading-relaxed whitespace-pre-wrap font-sans max-h-[400px] overflow-y-auto">
                      {c.originalText}
                    </pre>
                  </details>
                )}

                {c.dataSource && (
                  <p className="pt-2 text-[11px] text-neutral-400">
                    출처 · {c.dataSource}
                  </p>
                )}
              </div>

              {/* 푸터 — Toss 톤 검정 단색 */}
              <div className="px-6 py-4 border-t border-neutral-100 flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 h-11 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-semibold text-[14px]"
                >
                  닫기
                </button>
                <Link
                  to={`/dashboard/consultation?formula=${encodeURIComponent(formulaName || '')}`}
                  className="flex-1 h-11 leading-[44px] bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl transition-colors font-semibold text-[14px] text-center"
                >
                  이 처방으로 진료 시작
                </Link>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
