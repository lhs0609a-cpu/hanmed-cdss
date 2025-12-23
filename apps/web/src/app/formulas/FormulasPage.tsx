import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  BookOpen,
  ChevronRight,
  Loader2,
  Leaf,
  Filter,
} from 'lucide-react'
import api from '@/services/api'
import { logError } from '@/lib/errors'

interface QueryParams {
  page: number
  limit: number
  category?: string
  q?: string
}

interface FormulaHerb {
  id: string
  name: string
  amount: string
  role: string
}

interface Formula {
  id: string
  name: string
  hanja: string
  category: string
  source: string
  indication: string
  herbs: FormulaHerb[]
}

interface FormulasResponse {
  data: Formula[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const categories = [
  '전체',
  '해표제',
  '청열제',
  '보익제',
  '이기제',
  '화담제',
  '이수제',
  '온리제',
  '소도제',
  '고섭제',
]

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchFormulas()
  }, [page, selectedCategory])

  const fetchFormulas = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: QueryParams = { page, limit: 12 }
      if (selectedCategory !== '전체') {
        params.category = selectedCategory
      }
      const response = await api.get<FormulasResponse>('/formulas', { params })
      setFormulas(response.data.data)
      setTotalPages(response.data.meta.totalPages)
    } catch (error) {
      logError(error, 'FormulasPage')
      // 데모용 더미 데이터
      setFormulas(getDemoFormulas())
      setTotalPages(5)
    } finally {
      setIsLoading(false)
    }
  }, [page, selectedCategory])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchFormulas()
      return
    }

    setIsLoading(true)
    try {
      const response = await api.get<FormulasResponse>('/formulas/search', {
        params: { q: searchQuery, page: 1, limit: 12 },
      })
      setFormulas(response.data.data)
      setTotalPages(response.data.meta.totalPages)
      setPage(1)
    } catch (error) {
      // 데모용 필터링
      const filtered = getDemoFormulas().filter(
        (f) =>
          f.name.includes(searchQuery) ||
          f.hanja.includes(searchQuery) ||
          f.indication.includes(searchQuery)
      )
      setFormulas(filtered)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-blue-500" />
          처방(방제) 검색
        </h1>
        <p className="mt-1 text-gray-500">
          한의학 처방의 구성 약재와 적응증을 확인하세요
        </p>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="처방명, 적응증으로 검색..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
            >
              검색
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category)
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : formulas.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">검색 결과가 없습니다</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formulas.map((formula) => (
              <Link
                key={formula.id}
                to={`/formulas/${formula.id}`}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {formula.name}
                    </h3>
                    <p className="text-sm text-gray-500">{formula.hanja}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
                    {formula.category}
                  </span>
                </div>

                {formula.source && (
                  <p className="text-xs text-gray-400 mb-2">출전: {formula.source}</p>
                )}

                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {formula.indication}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {formula.herbs.slice(0, 6).map((herb, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md"
                    >
                      <Leaf className="h-3 w-3" />
                      {herb.name}
                    </span>
                  ))}
                  {formula.herbs.length > 6 && (
                    <span className="px-2 py-1 bg-gray-50 text-gray-400 text-xs rounded-md">
                      +{formula.herbs.length - 6}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  상세 보기
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// 데모용 더미 데이터
function getDemoFormulas(): Formula[] {
  return [
    // ===== 해표제 (解表劑) =====
    {
      id: '1',
      name: '소청룡탕',
      hanja: '小靑龍湯',
      category: '해표제',
      source: '상한론',
      indication: '외한내음(外寒內飮). 오한발열, 무한, 수양성 콧물, 천해기급, 흉만 등',
      herbs: [
        { id: '1', name: '마황', amount: '9g', role: '군' },
        { id: '2', name: '계지', amount: '6g', role: '신' },
        { id: '3', name: '작약', amount: '6g', role: '신' },
        { id: '4', name: '세신', amount: '3g', role: '좌' },
        { id: '5', name: '건강', amount: '3g', role: '좌' },
        { id: '6', name: '반하', amount: '6g', role: '좌' },
        { id: '7', name: '오미자', amount: '3g', role: '좌' },
        { id: '8', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '2',
      name: '갈근탕',
      hanja: '葛根湯',
      category: '해표제',
      source: '상한론',
      indication: '태양병, 항강통(項强痛), 무한, 오풍 등',
      herbs: [
        { id: '1', name: '갈근', amount: '12g', role: '군' },
        { id: '2', name: '마황', amount: '9g', role: '신' },
        { id: '3', name: '계지', amount: '6g', role: '신' },
        { id: '4', name: '작약', amount: '6g', role: '좌' },
        { id: '5', name: '생강', amount: '9g', role: '좌' },
        { id: '6', name: '대조', amount: '4매', role: '좌' },
        { id: '7', name: '감초', amount: '6g', role: '사' },
      ],
    },
    {
      id: '3',
      name: '마황탕',
      hanja: '麻黃湯',
      category: '해표제',
      source: '상한론',
      indication: '태양상한, 오한발열, 무한, 두통, 신체동통, 천해 등',
      herbs: [
        { id: '1', name: '마황', amount: '9g', role: '군' },
        { id: '2', name: '계지', amount: '6g', role: '신' },
        { id: '3', name: '행인', amount: '9g', role: '좌' },
        { id: '4', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '4',
      name: '계지탕',
      hanja: '桂枝湯',
      category: '해표제',
      source: '상한론',
      indication: '태양중풍, 두통발열, 한출오풍, 비색, 구건, 맥부완 등',
      herbs: [
        { id: '1', name: '계지', amount: '9g', role: '군' },
        { id: '2', name: '작약', amount: '9g', role: '신' },
        { id: '3', name: '생강', amount: '9g', role: '좌' },
        { id: '4', name: '대조', amount: '4매', role: '좌' },
        { id: '5', name: '감초', amount: '6g', role: '사' },
      ],
    },
    {
      id: '5',
      name: '구미강활탕',
      hanja: '九味羌活湯',
      category: '해표제',
      source: '차사난지',
      indication: '외감풍한습사, 오한발열, 무한, 두통, 지체산통 등',
      herbs: [
        { id: '1', name: '강활', amount: '6g', role: '군' },
        { id: '2', name: '방풍', amount: '6g', role: '신' },
        { id: '3', name: '창출', amount: '6g', role: '신' },
        { id: '4', name: '세신', amount: '3g', role: '좌' },
        { id: '5', name: '천궁', amount: '6g', role: '좌' },
        { id: '6', name: '백지', amount: '6g', role: '좌' },
        { id: '7', name: '황금', amount: '6g', role: '좌' },
        { id: '8', name: '생지황', amount: '6g', role: '좌' },
        { id: '9', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '6',
      name: '은교산',
      hanja: '銀翹散',
      category: '해표제',
      source: '온병조변',
      indication: '온병초기, 발열무한 혹 유한불창, 미오풍한, 두통, 구갈, 인통 등',
      herbs: [
        { id: '1', name: '금은화', amount: '15g', role: '군' },
        { id: '2', name: '연교', amount: '15g', role: '군' },
        { id: '3', name: '박하', amount: '6g', role: '신' },
        { id: '4', name: '우방자', amount: '9g', role: '신' },
        { id: '5', name: '형개', amount: '6g', role: '좌' },
        { id: '6', name: '담두시', amount: '6g', role: '좌' },
        { id: '7', name: '길경', amount: '6g', role: '좌' },
        { id: '8', name: '죽엽', amount: '6g', role: '좌' },
        { id: '9', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '7',
      name: '상국음',
      hanja: '桑菊飮',
      category: '해표제',
      source: '온병조변',
      indication: '풍온초기, 해수, 신열불감, 구미갈, 맥부삭 등',
      herbs: [
        { id: '1', name: '상엽', amount: '9g', role: '군' },
        { id: '2', name: '국화', amount: '6g', role: '군' },
        { id: '3', name: '행인', amount: '6g', role: '신' },
        { id: '4', name: '연교', amount: '6g', role: '신' },
        { id: '5', name: '박하', amount: '3g', role: '좌' },
        { id: '6', name: '길경', amount: '6g', role: '좌' },
        { id: '7', name: '노근', amount: '9g', role: '좌' },
        { id: '8', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '8',
      name: '승마갈근탕',
      hanja: '升麻葛根湯',
      category: '해표제',
      source: '태평혜민화제국방',
      indication: '마진초기, 발열두통, 기해, 목적, 진발불투 등',
      herbs: [
        { id: '1', name: '승마', amount: '6g', role: '군' },
        { id: '2', name: '갈근', amount: '9g', role: '신' },
        { id: '3', name: '작약', amount: '6g', role: '좌' },
        { id: '4', name: '감초', amount: '3g', role: '사' },
      ],
    },

    // ===== 청열제 (清熱劑) =====
    {
      id: '9',
      name: '황련해독탕',
      hanja: '黃連解毒湯',
      category: '청열제',
      source: '외대비요',
      indication: '삼초화독, 대열번조, 구건인통, 착어광망, 토혈, 비혈, 발반발진 등',
      herbs: [
        { id: '1', name: '황련', amount: '9g', role: '군' },
        { id: '2', name: '황금', amount: '6g', role: '신' },
        { id: '3', name: '황백', amount: '6g', role: '좌' },
        { id: '4', name: '치자', amount: '9g', role: '좌' },
      ],
    },
    {
      id: '10',
      name: '백호탕',
      hanja: '白虎湯',
      category: '청열제',
      source: '상한론',
      indication: '양명경증, 대열, 대한, 대갈, 맥홍대 등',
      herbs: [
        { id: '1', name: '석고', amount: '30g', role: '군' },
        { id: '2', name: '지모', amount: '9g', role: '신' },
        { id: '3', name: '갱미', amount: '9g', role: '좌' },
        { id: '4', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '11',
      name: '청영탕',
      hanja: '淸營湯',
      category: '청열제',
      source: '온병조변',
      indication: '열입영분, 신열야감, 심번불면, 시혹섬어, 반은은은, 설강 등',
      herbs: [
        { id: '1', name: '서각', amount: '30g', role: '군' },
        { id: '2', name: '생지황', amount: '15g', role: '신' },
        { id: '3', name: '현삼', amount: '9g', role: '신' },
        { id: '4', name: '맥문동', amount: '9g', role: '좌' },
        { id: '5', name: '금은화', amount: '9g', role: '좌' },
        { id: '6', name: '연교', amount: '6g', role: '좌' },
        { id: '7', name: '단삼', amount: '6g', role: '좌' },
        { id: '8', name: '황련', amount: '5g', role: '좌' },
        { id: '9', name: '죽엽심', amount: '3g', role: '사' },
      ],
    },
    {
      id: '12',
      name: '인진호탕',
      hanja: '茵蔯蒿湯',
      category: '청열제',
      source: '상한론',
      indication: '습열황달, 일신구면피부개황, 황색선명, 발열, 소변불리 등',
      herbs: [
        { id: '1', name: '인진', amount: '18g', role: '군' },
        { id: '2', name: '치자', amount: '12g', role: '신' },
        { id: '3', name: '대황', amount: '6g', role: '좌' },
      ],
    },
    {
      id: '13',
      name: '용담사간탕',
      hanja: '龍膽瀉肝湯',
      category: '청열제',
      source: '의방집해',
      indication: '간담실화상염, 두통목적, 협통, 구고, 설홍, 이농, 이종 등',
      herbs: [
        { id: '1', name: '용담초', amount: '6g', role: '군' },
        { id: '2', name: '황금', amount: '9g', role: '신' },
        { id: '3', name: '치자', amount: '9g', role: '신' },
        { id: '4', name: '택사', amount: '12g', role: '좌' },
        { id: '5', name: '목통', amount: '6g', role: '좌' },
        { id: '6', name: '차전자', amount: '9g', role: '좌' },
        { id: '7', name: '당귀', amount: '6g', role: '좌' },
        { id: '8', name: '생지황', amount: '9g', role: '좌' },
        { id: '9', name: '시호', amount: '6g', role: '좌' },
        { id: '10', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '14',
      name: '청위산',
      hanja: '淸胃散',
      category: '청열제',
      source: '난실비장',
      indication: '위화치통, 치은종통, 출혈, 견치, 견토, 구취 등',
      herbs: [
        { id: '1', name: '황련', amount: '6g', role: '군' },
        { id: '2', name: '승마', amount: '6g', role: '신' },
        { id: '3', name: '당귀', amount: '6g', role: '좌' },
        { id: '4', name: '생지황', amount: '6g', role: '좌' },
        { id: '5', name: '목단피', amount: '9g', role: '좌' },
      ],
    },
    {
      id: '15',
      name: '옥녀전',
      hanja: '玉女煎',
      category: '청열제',
      source: '경악전서',
      indication: '위열음허, 두통치통, 번열구갈, 치은출혈, 설홍태황 등',
      herbs: [
        { id: '1', name: '석고', amount: '15g', role: '군' },
        { id: '2', name: '숙지황', amount: '12g', role: '신' },
        { id: '3', name: '맥문동', amount: '6g', role: '좌' },
        { id: '4', name: '지모', amount: '6g', role: '좌' },
        { id: '5', name: '우슬', amount: '6g', role: '좌' },
      ],
    },
    {
      id: '16',
      name: '도적산',
      hanja: '導赤散',
      category: '청열제',
      source: '소아약증직결',
      indication: '심경열성, 심흉번열, 구설생창, 소변적삽 등',
      herbs: [
        { id: '1', name: '생지황', amount: '9g', role: '군' },
        { id: '2', name: '목통', amount: '6g', role: '신' },
        { id: '3', name: '죽엽', amount: '6g', role: '좌' },
        { id: '4', name: '감초', amount: '3g', role: '사' },
      ],
    },

    // ===== 보익제 (補益劑) =====
    {
      id: '17',
      name: '사군자탕',
      hanja: '四君子湯',
      category: '보익제',
      source: '태평혜민화제국방',
      indication: '비기허증. 면색위황, 식욕부진, 권태무력, 설담맥허 등',
      herbs: [
        { id: '1', name: '인삼', amount: '9g', role: '군' },
        { id: '2', name: '백출', amount: '9g', role: '신' },
        { id: '3', name: '복령', amount: '9g', role: '좌' },
        { id: '4', name: '감초', amount: '6g', role: '사' },
      ],
    },
    {
      id: '18',
      name: '사물탕',
      hanja: '四物湯',
      category: '보익제',
      source: '태평혜민화제국방',
      indication: '혈허증. 면색창백, 두훈목현, 심계실면, 월경부조 등',
      herbs: [
        { id: '1', name: '숙지황', amount: '12g', role: '군' },
        { id: '2', name: '당귀', amount: '9g', role: '신' },
        { id: '3', name: '백작약', amount: '9g', role: '좌' },
        { id: '4', name: '천궁', amount: '6g', role: '사' },
      ],
    },
    {
      id: '19',
      name: '보중익기탕',
      hanja: '補中益氣湯',
      category: '보익제',
      source: '비위론',
      indication: '비위기허, 중기하함. 권태무력, 식욕부진, 자한, 내장하수 등',
      herbs: [
        { id: '1', name: '황기', amount: '15g', role: '군' },
        { id: '2', name: '인삼', amount: '9g', role: '신' },
        { id: '3', name: '백출', amount: '9g', role: '신' },
        { id: '4', name: '당귀', amount: '6g', role: '좌' },
        { id: '5', name: '진피', amount: '6g', role: '좌' },
        { id: '6', name: '승마', amount: '3g', role: '좌' },
        { id: '7', name: '시호', amount: '3g', role: '좌' },
        { id: '8', name: '감초', amount: '6g', role: '사' },
      ],
    },
    {
      id: '20',
      name: '십전대보탕',
      hanja: '十全大補湯',
      category: '보익제',
      source: '태평혜민화제국방',
      indication: '기혈양허, 면색창백, 두훈목현, 권태무력, 심계기단 등',
      herbs: [
        { id: '1', name: '인삼', amount: '9g', role: '군' },
        { id: '2', name: '백출', amount: '9g', role: '군' },
        { id: '3', name: '복령', amount: '9g', role: '신' },
        { id: '4', name: '감초', amount: '3g', role: '신' },
        { id: '5', name: '숙지황', amount: '12g', role: '신' },
        { id: '6', name: '당귀', amount: '9g', role: '좌' },
        { id: '7', name: '백작약', amount: '9g', role: '좌' },
        { id: '8', name: '천궁', amount: '6g', role: '좌' },
        { id: '9', name: '황기', amount: '12g', role: '좌' },
        { id: '10', name: '육계', amount: '3g', role: '사' },
      ],
    },
    {
      id: '21',
      name: '귀비탕',
      hanja: '歸脾湯',
      category: '보익제',
      source: '제생방',
      indication: '심비양허, 사려과도, 노상심비, 건망, 심계, 도한 등',
      herbs: [
        { id: '1', name: '인삼', amount: '9g', role: '군' },
        { id: '2', name: '황기', amount: '12g', role: '군' },
        { id: '3', name: '백출', amount: '9g', role: '신' },
        { id: '4', name: '복신', amount: '9g', role: '신' },
        { id: '5', name: '산조인', amount: '9g', role: '좌' },
        { id: '6', name: '용안육', amount: '9g', role: '좌' },
        { id: '7', name: '당귀', amount: '6g', role: '좌' },
        { id: '8', name: '원지', amount: '6g', role: '좌' },
        { id: '9', name: '목향', amount: '3g', role: '좌' },
        { id: '10', name: '감초', amount: '3g', role: '사' },
        { id: '11', name: '생강', amount: '6g', role: '사' },
        { id: '12', name: '대조', amount: '3매', role: '사' },
      ],
    },
    {
      id: '22',
      name: '팔진탕',
      hanja: '八珍湯',
      category: '보익제',
      source: '정체류요',
      indication: '기혈양허, 면색창백 혹 위황, 두훈목현, 권태무력, 심계 등',
      herbs: [
        { id: '1', name: '인삼', amount: '9g', role: '군' },
        { id: '2', name: '백출', amount: '9g', role: '군' },
        { id: '3', name: '복령', amount: '9g', role: '신' },
        { id: '4', name: '감초', amount: '3g', role: '신' },
        { id: '5', name: '숙지황', amount: '12g', role: '좌' },
        { id: '6', name: '당귀', amount: '9g', role: '좌' },
        { id: '7', name: '백작약', amount: '9g', role: '좌' },
        { id: '8', name: '천궁', amount: '6g', role: '사' },
      ],
    },
    {
      id: '23',
      name: '육군자탕',
      hanja: '六君子湯',
      category: '보익제',
      source: '의학정전',
      indication: '비위기허겸담습, 식욕부진, 권태무력, 흉완비민, 구토 등',
      herbs: [
        { id: '1', name: '인삼', amount: '9g', role: '군' },
        { id: '2', name: '백출', amount: '9g', role: '신' },
        { id: '3', name: '복령', amount: '9g', role: '신' },
        { id: '4', name: '반하', amount: '9g', role: '좌' },
        { id: '5', name: '진피', amount: '6g', role: '좌' },
        { id: '6', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '24',
      name: '향사육군자탕',
      hanja: '香砂六君子湯',
      category: '보익제',
      source: '고금명의방론',
      indication: '비위기허겸기체담습, 흉완창민, 완복동통, 구토, 설사 등',
      herbs: [
        { id: '1', name: '인삼', amount: '9g', role: '군' },
        { id: '2', name: '백출', amount: '9g', role: '신' },
        { id: '3', name: '복령', amount: '9g', role: '신' },
        { id: '4', name: '반하', amount: '9g', role: '좌' },
        { id: '5', name: '진피', amount: '6g', role: '좌' },
        { id: '6', name: '목향', amount: '6g', role: '좌' },
        { id: '7', name: '사인', amount: '6g', role: '좌' },
        { id: '8', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '25',
      name: '생맥산',
      hanja: '生脈散',
      category: '보익제',
      source: '내외상변혹론',
      indication: '온열병후기, 서열상진, 기음양허, 한다체권, 맥허미세 등',
      herbs: [
        { id: '1', name: '인삼', amount: '9g', role: '군' },
        { id: '2', name: '맥문동', amount: '9g', role: '신' },
        { id: '3', name: '오미자', amount: '6g', role: '좌' },
      ],
    },
    {
      id: '26',
      name: '육미지황환',
      hanja: '六味地黃丸',
      category: '보익제',
      source: '소아약증직결',
      indication: '신음허, 요슬산연, 두훈목현, 이명이롱, 도한유정 등',
      herbs: [
        { id: '1', name: '숙지황', amount: '24g', role: '군' },
        { id: '2', name: '산수유', amount: '12g', role: '신' },
        { id: '3', name: '산약', amount: '12g', role: '신' },
        { id: '4', name: '택사', amount: '9g', role: '좌' },
        { id: '5', name: '복령', amount: '9g', role: '좌' },
        { id: '6', name: '목단피', amount: '9g', role: '좌' },
      ],
    },
    {
      id: '27',
      name: '팔미지황환',
      hanja: '八味地黃丸',
      category: '보익제',
      source: '금궤요략',
      indication: '신양부족, 요통각연, 하반신상냉, 소변불리 혹 반다, 각기, 담음 등',
      herbs: [
        { id: '1', name: '숙지황', amount: '24g', role: '군' },
        { id: '2', name: '산수유', amount: '12g', role: '신' },
        { id: '3', name: '산약', amount: '12g', role: '신' },
        { id: '4', name: '택사', amount: '9g', role: '좌' },
        { id: '5', name: '복령', amount: '9g', role: '좌' },
        { id: '6', name: '목단피', amount: '9g', role: '좌' },
        { id: '7', name: '부자', amount: '3g', role: '좌' },
        { id: '8', name: '육계', amount: '3g', role: '좌' },
      ],
    },
    {
      id: '28',
      name: '자음강화탕',
      hanja: '滋陰降火湯',
      category: '보익제',
      source: '의학입문',
      indication: '음허화왕, 골증조열, 도한, 해수기급, 객혈 등',
      herbs: [
        { id: '1', name: '숙지황', amount: '12g', role: '군' },
        { id: '2', name: '천문동', amount: '9g', role: '신' },
        { id: '3', name: '맥문동', amount: '9g', role: '신' },
        { id: '4', name: '당귀', amount: '6g', role: '좌' },
        { id: '5', name: '백작약', amount: '6g', role: '좌' },
        { id: '6', name: '백출', amount: '6g', role: '좌' },
        { id: '7', name: '진피', amount: '6g', role: '좌' },
        { id: '8', name: '지모', amount: '6g', role: '좌' },
        { id: '9', name: '황백', amount: '6g', role: '좌' },
        { id: '10', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '29',
      name: '좌귀음',
      hanja: '左歸飮',
      category: '보익제',
      source: '경악전서',
      indication: '진음부족, 요산슬연, 도한유정, 구조인갈 등',
      herbs: [
        { id: '1', name: '숙지황', amount: '12g', role: '군' },
        { id: '2', name: '산수유', amount: '6g', role: '신' },
        { id: '3', name: '산약', amount: '6g', role: '신' },
        { id: '4', name: '구기자', amount: '6g', role: '좌' },
        { id: '5', name: '복령', amount: '6g', role: '좌' },
        { id: '6', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '30',
      name: '우귀음',
      hanja: '右歸飮',
      category: '보익제',
      source: '경악전서',
      indication: '신양부족, 기허신냉, 완복냉통, 대변불실 등',
      herbs: [
        { id: '1', name: '숙지황', amount: '12g', role: '군' },
        { id: '2', name: '산수유', amount: '6g', role: '신' },
        { id: '3', name: '산약', amount: '6g', role: '신' },
        { id: '4', name: '구기자', amount: '6g', role: '좌' },
        { id: '5', name: '두충', amount: '6g', role: '좌' },
        { id: '6', name: '육계', amount: '3g', role: '좌' },
        { id: '7', name: '부자', amount: '3g', role: '좌' },
        { id: '8', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '31',
      name: '당귀보혈탕',
      hanja: '當歸補血湯',
      category: '보익제',
      source: '내외상변혹론',
      indication: '혈허발열, 면적목적, 번갈욕음, 맥홍대이허 등',
      herbs: [
        { id: '1', name: '황기', amount: '30g', role: '군' },
        { id: '2', name: '당귀', amount: '6g', role: '신' },
      ],
    },

    // ===== 이기제 (理氣劑) =====
    {
      id: '32',
      name: '소시호탕',
      hanja: '小柴胡湯',
      category: '이기제',
      source: '상한론',
      indication: '소양병, 왕래한열, 흉협고만, 목현, 인건, 구고 등',
      herbs: [
        { id: '1', name: '시호', amount: '12g', role: '군' },
        { id: '2', name: '황금', amount: '9g', role: '신' },
        { id: '3', name: '반하', amount: '9g', role: '좌' },
        { id: '4', name: '인삼', amount: '6g', role: '좌' },
        { id: '5', name: '생강', amount: '6g', role: '좌' },
        { id: '6', name: '대조', amount: '4매', role: '좌' },
        { id: '7', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '33',
      name: '소요산',
      hanja: '逍遙散',
      category: '이기제',
      source: '태평혜민화제국방',
      indication: '간울혈허비약, 양협작통, 두통목현, 구조인건, 신피식소 등',
      herbs: [
        { id: '1', name: '시호', amount: '9g', role: '군' },
        { id: '2', name: '당귀', amount: '9g', role: '신' },
        { id: '3', name: '백작약', amount: '9g', role: '신' },
        { id: '4', name: '백출', amount: '9g', role: '좌' },
        { id: '5', name: '복령', amount: '9g', role: '좌' },
        { id: '6', name: '박하', amount: '3g', role: '좌' },
        { id: '7', name: '생강', amount: '6g', role: '좌' },
        { id: '8', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '34',
      name: '가미소요산',
      hanja: '加味逍遙散',
      category: '이기제',
      source: '내과적요',
      indication: '간울혈허화왕, 조열도한, 월경부조, 번조이노 등',
      herbs: [
        { id: '1', name: '시호', amount: '9g', role: '군' },
        { id: '2', name: '당귀', amount: '9g', role: '신' },
        { id: '3', name: '백작약', amount: '9g', role: '신' },
        { id: '4', name: '백출', amount: '9g', role: '좌' },
        { id: '5', name: '복령', amount: '9g', role: '좌' },
        { id: '6', name: '박하', amount: '3g', role: '좌' },
        { id: '7', name: '생강', amount: '6g', role: '좌' },
        { id: '8', name: '목단피', amount: '6g', role: '좌' },
        { id: '9', name: '치자', amount: '6g', role: '좌' },
        { id: '10', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '35',
      name: '대시호탕',
      hanja: '大柴胡湯',
      category: '이기제',
      source: '상한론',
      indication: '소양양명합병, 왕래한열, 흉협고만, 울울미번, 구고, 구역 등',
      herbs: [
        { id: '1', name: '시호', amount: '12g', role: '군' },
        { id: '2', name: '황금', amount: '9g', role: '신' },
        { id: '3', name: '작약', amount: '9g', role: '신' },
        { id: '4', name: '반하', amount: '9g', role: '좌' },
        { id: '5', name: '지실', amount: '9g', role: '좌' },
        { id: '6', name: '대황', amount: '6g', role: '좌' },
        { id: '7', name: '생강', amount: '9g', role: '좌' },
        { id: '8', name: '대조', amount: '4매', role: '사' },
      ],
    },
    {
      id: '36',
      name: '시호소간산',
      hanja: '柴胡疏肝散',
      category: '이기제',
      source: '경악전서',
      indication: '간기울결, 협륵동통, 흉민선태, 왕래한열, 애기탄산 등',
      herbs: [
        { id: '1', name: '시호', amount: '9g', role: '군' },
        { id: '2', name: '천궁', amount: '6g', role: '신' },
        { id: '3', name: '작약', amount: '6g', role: '신' },
        { id: '4', name: '진피', amount: '6g', role: '좌' },
        { id: '5', name: '지각', amount: '6g', role: '좌' },
        { id: '6', name: '향부자', amount: '6g', role: '좌' },
        { id: '7', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '37',
      name: '반하후박탕',
      hanja: '半夏厚朴湯',
      category: '이기제',
      source: '금궤요략',
      indication: '매핵기, 인중여유자란, 토지불출, 연지불하, 흉협만민 등',
      herbs: [
        { id: '1', name: '반하', amount: '12g', role: '군' },
        { id: '2', name: '후박', amount: '9g', role: '신' },
        { id: '3', name: '자소엽', amount: '6g', role: '좌' },
        { id: '4', name: '복령', amount: '12g', role: '좌' },
        { id: '5', name: '생강', amount: '9g', role: '좌' },
      ],
    },

    // ===== 화담제 (化痰劑) =====
    {
      id: '38',
      name: '이진탕',
      hanja: '二陳湯',
      category: '화담제',
      source: '태평혜민화제국방',
      indication: '습담해수, 담다색백이희, 흉만완비, 오심구토 등',
      herbs: [
        { id: '1', name: '반하', amount: '15g', role: '군' },
        { id: '2', name: '진피', amount: '15g', role: '신' },
        { id: '3', name: '복령', amount: '9g', role: '좌' },
        { id: '4', name: '감초', amount: '5g', role: '사' },
      ],
    },
    {
      id: '39',
      name: '온담탕',
      hanja: '溫膽湯',
      category: '화담제',
      source: '삼인극일병증방론',
      indication: '담열내요, 허번불면, 심계, 경계, 오심, 구고, 흉민 등',
      herbs: [
        { id: '1', name: '반하', amount: '9g', role: '군' },
        { id: '2', name: '죽여', amount: '6g', role: '신' },
        { id: '3', name: '지실', amount: '6g', role: '신' },
        { id: '4', name: '진피', amount: '9g', role: '좌' },
        { id: '5', name: '복령', amount: '6g', role: '좌' },
        { id: '6', name: '생강', amount: '3g', role: '좌' },
        { id: '7', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '40',
      name: '반하백출천마탕',
      hanja: '半夏白朮天麻湯',
      category: '화담제',
      source: '의학심오',
      indication: '풍담상요, 현훈, 두통, 흉완비민, 오심구토 등',
      herbs: [
        { id: '1', name: '반하', amount: '9g', role: '군' },
        { id: '2', name: '백출', amount: '9g', role: '신' },
        { id: '3', name: '천마', amount: '6g', role: '신' },
        { id: '4', name: '진피', amount: '6g', role: '좌' },
        { id: '5', name: '복령', amount: '6g', role: '좌' },
        { id: '6', name: '생강', amount: '3g', role: '좌' },
        { id: '7', name: '대조', amount: '2매', role: '좌' },
        { id: '8', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '41',
      name: '청기화담환',
      hanja: '淸氣化痰丸',
      category: '화담제',
      source: '의방고',
      indication: '담열해수, 담황점조, 흉완비민, 기급구역 등',
      herbs: [
        { id: '1', name: '담남성', amount: '45g', role: '군' },
        { id: '2', name: '반하', amount: '45g', role: '신' },
        { id: '3', name: '과루인', amount: '30g', role: '신' },
        { id: '4', name: '황금', amount: '30g', role: '좌' },
        { id: '5', name: '진피', amount: '30g', role: '좌' },
        { id: '6', name: '행인', amount: '30g', role: '좌' },
        { id: '7', name: '지실', amount: '30g', role: '좌' },
        { id: '8', name: '복령', amount: '30g', role: '좌' },
      ],
    },

    // ===== 이수제 (利水劑) =====
    {
      id: '42',
      name: '오령산',
      hanja: '五苓散',
      category: '이수제',
      source: '상한론',
      indication: '수습내정, 소변불리, 두통미열, 번갈욕음, 수입즉토 등',
      herbs: [
        { id: '1', name: '저령', amount: '9g', role: '군' },
        { id: '2', name: '택사', amount: '15g', role: '신' },
        { id: '3', name: '복령', amount: '9g', role: '좌' },
        { id: '4', name: '백출', amount: '9g', role: '좌' },
        { id: '5', name: '계지', amount: '6g', role: '사' },
      ],
    },
    {
      id: '43',
      name: '저령탕',
      hanja: '豬苓湯',
      category: '이수제',
      source: '상한론',
      indication: '수열호결, 소변불리, 발열, 갈욕음수, 심번불안 등',
      herbs: [
        { id: '1', name: '저령', amount: '9g', role: '군' },
        { id: '2', name: '복령', amount: '9g', role: '신' },
        { id: '3', name: '택사', amount: '9g', role: '좌' },
        { id: '4', name: '활석', amount: '9g', role: '좌' },
        { id: '5', name: '아교', amount: '9g', role: '좌' },
      ],
    },
    {
      id: '44',
      name: '팔정산',
      hanja: '八正散',
      category: '이수제',
      source: '태평혜민화제국방',
      indication: '습열림증, 빈뇨삽통, 소변혼탁, 구조인건 등',
      herbs: [
        { id: '1', name: '구맥', amount: '9g', role: '군' },
        { id: '2', name: '편축', amount: '9g', role: '신' },
        { id: '3', name: '차전자', amount: '9g', role: '좌' },
        { id: '4', name: '활석', amount: '9g', role: '좌' },
        { id: '5', name: '치자', amount: '9g', role: '좌' },
        { id: '6', name: '목통', amount: '9g', role: '좌' },
        { id: '7', name: '대황', amount: '9g', role: '좌' },
        { id: '8', name: '감초', amount: '6g', role: '사' },
      ],
    },
    {
      id: '45',
      name: '방기황기탕',
      hanja: '防己黃芪湯',
      category: '이수제',
      source: '금궤요략',
      indication: '풍수 혹 풍습, 한출오풍, 신중, 소변불리, 표허부종 등',
      herbs: [
        { id: '1', name: '방기', amount: '12g', role: '군' },
        { id: '2', name: '황기', amount: '15g', role: '신' },
        { id: '3', name: '백출', amount: '9g', role: '좌' },
        { id: '4', name: '생강', amount: '6g', role: '좌' },
        { id: '5', name: '대조', amount: '4매', role: '좌' },
        { id: '6', name: '감초', amount: '3g', role: '사' },
      ],
    },

    // ===== 온리제 (溫裏劑) =====
    {
      id: '46',
      name: '이중환',
      hanja: '理中丸',
      category: '온리제',
      source: '상한론',
      indication: '비위허한, 완복동통, 구토설사, 복만, 불욕음식 등',
      herbs: [
        { id: '1', name: '인삼', amount: '9g', role: '군' },
        { id: '2', name: '건강', amount: '9g', role: '신' },
        { id: '3', name: '백출', amount: '9g', role: '좌' },
        { id: '4', name: '감초', amount: '9g', role: '사' },
      ],
    },
    {
      id: '47',
      name: '사역탕',
      hanja: '四逆湯',
      category: '온리제',
      source: '상한론',
      indication: '양허한역, 사지궐냉, 오한권와, 신피욕매, 면색창백 등',
      herbs: [
        { id: '1', name: '부자', amount: '9g', role: '군' },
        { id: '2', name: '건강', amount: '9g', role: '신' },
        { id: '3', name: '감초', amount: '6g', role: '좌' },
      ],
    },
    {
      id: '48',
      name: '오수유탕',
      hanja: '吳茱萸湯',
      category: '온리제',
      source: '상한론',
      indication: '한범위간, 식곡욕구, 축축토연, 두정두통, 사지궐냉 등',
      herbs: [
        { id: '1', name: '오수유', amount: '9g', role: '군' },
        { id: '2', name: '인삼', amount: '9g', role: '신' },
        { id: '3', name: '생강', amount: '18g', role: '좌' },
        { id: '4', name: '대조', amount: '4매', role: '사' },
      ],
    },
    {
      id: '49',
      name: '진무탕',
      hanja: '眞武湯',
      category: '온리제',
      source: '상한론',
      indication: '양허수범, 소변불리, 사지침중동통, 복통하리 등',
      herbs: [
        { id: '1', name: '부자', amount: '9g', role: '군' },
        { id: '2', name: '백출', amount: '6g', role: '신' },
        { id: '3', name: '복령', amount: '9g', role: '좌' },
        { id: '4', name: '생강', amount: '9g', role: '좌' },
        { id: '5', name: '작약', amount: '9g', role: '좌' },
      ],
    },
    {
      id: '50',
      name: '부자이중환',
      hanja: '附子理中丸',
      category: '온리제',
      source: '태평혜민화제국방',
      indication: '비신양허, 완복냉통, 구토설사, 오한지냉 등',
      herbs: [
        { id: '1', name: '부자', amount: '9g', role: '군' },
        { id: '2', name: '인삼', amount: '9g', role: '신' },
        { id: '3', name: '건강', amount: '9g', role: '좌' },
        { id: '4', name: '백출', amount: '9g', role: '좌' },
        { id: '5', name: '감초', amount: '6g', role: '사' },
      ],
    },

    // ===== 활혈거어제 (活血祛瘀劑) =====
    {
      id: '51',
      name: '혈부축어탕',
      hanja: '血府逐瘀湯',
      category: '활혈거어제',
      source: '의림개착',
      indication: '흉중혈어, 흉통, 두통, 일구건조 등',
      herbs: [
        { id: '1', name: '도인', amount: '12g', role: '군' },
        { id: '2', name: '홍화', amount: '9g', role: '군' },
        { id: '3', name: '당귀', amount: '9g', role: '신' },
        { id: '4', name: '천궁', amount: '5g', role: '신' },
        { id: '5', name: '적작약', amount: '6g', role: '좌' },
        { id: '6', name: '시호', amount: '3g', role: '좌' },
        { id: '7', name: '우슬', amount: '9g', role: '좌' },
        { id: '8', name: '지각', amount: '6g', role: '좌' },
        { id: '9', name: '길경', amount: '5g', role: '좌' },
        { id: '10', name: '생지황', amount: '9g', role: '좌' },
        { id: '11', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '52',
      name: '보양환오탕',
      hanja: '補陽還五湯',
      category: '활혈거어제',
      source: '의림개착',
      indication: '중풍후유증, 반신불수, 구안괘사, 언어건삽 등',
      herbs: [
        { id: '1', name: '황기', amount: '120g', role: '군' },
        { id: '2', name: '당귀', amount: '6g', role: '신' },
        { id: '3', name: '적작약', amount: '5g', role: '좌' },
        { id: '4', name: '천궁', amount: '3g', role: '좌' },
        { id: '5', name: '도인', amount: '3g', role: '좌' },
        { id: '6', name: '홍화', amount: '3g', role: '좌' },
        { id: '7', name: '지룡', amount: '3g', role: '좌' },
      ],
    },
    {
      id: '53',
      name: '도핵승기탕',
      hanja: '桃核承氣湯',
      category: '활혈거어제',
      source: '상한론',
      indication: '하초축혈, 소복급결, 야열조경, 대변색흑 등',
      herbs: [
        { id: '1', name: '도인', amount: '12g', role: '군' },
        { id: '2', name: '대황', amount: '12g', role: '신' },
        { id: '3', name: '계지', amount: '6g', role: '좌' },
        { id: '4', name: '망초', amount: '6g', role: '좌' },
        { id: '5', name: '감초', amount: '3g', role: '사' },
      ],
    },

    // ===== 안신제 (安神劑) =====
    {
      id: '54',
      name: '산조인탕',
      hanja: '酸棗仁湯',
      category: '안신제',
      source: '금궤요략',
      indication: '간혈부족, 허번불면, 심계도한 등',
      herbs: [
        { id: '1', name: '산조인', amount: '15g', role: '군' },
        { id: '2', name: '복령', amount: '6g', role: '신' },
        { id: '3', name: '지모', amount: '6g', role: '좌' },
        { id: '4', name: '천궁', amount: '6g', role: '좌' },
        { id: '5', name: '감초', amount: '3g', role: '사' },
      ],
    },
    {
      id: '55',
      name: '천왕보심단',
      hanja: '天王補心丹',
      category: '안신제',
      source: '세의득효방',
      indication: '음허혈소, 신지불안, 심계실면, 허번, 몽유, 건망 등',
      herbs: [
        { id: '1', name: '생지황', amount: '120g', role: '군' },
        { id: '2', name: '인삼', amount: '15g', role: '신' },
        { id: '3', name: '단삼', amount: '15g', role: '신' },
        { id: '4', name: '현삼', amount: '15g', role: '신' },
        { id: '5', name: '복령', amount: '15g', role: '좌' },
        { id: '6', name: '원지', amount: '15g', role: '좌' },
        { id: '7', name: '산조인', amount: '15g', role: '좌' },
        { id: '8', name: '백자인', amount: '15g', role: '좌' },
        { id: '9', name: '천문동', amount: '30g', role: '좌' },
        { id: '10', name: '맥문동', amount: '30g', role: '좌' },
        { id: '11', name: '당귀', amount: '30g', role: '좌' },
        { id: '12', name: '오미자', amount: '30g', role: '좌' },
        { id: '13', name: '길경', amount: '15g', role: '좌' },
      ],
    },

    // ===== 고섭제 (固澀劑) =====
    {
      id: '56',
      name: '사신환',
      hanja: '四神丸',
      category: '고섭제',
      source: '증치준승',
      indication: '신양부족, 오경설사, 완복냉통, 요슬산냉 등',
      herbs: [
        { id: '1', name: '보골지', amount: '120g', role: '군' },
        { id: '2', name: '오수유', amount: '30g', role: '신' },
        { id: '3', name: '육두구', amount: '60g', role: '좌' },
        { id: '4', name: '오미자', amount: '60g', role: '좌' },
      ],
    },
    {
      id: '57',
      name: '금쇄고정환',
      hanja: '金鎖固精丸',
      category: '고섭제',
      source: '의방집해',
      indication: '신허유정, 신피요산, 이명 등',
      herbs: [
        { id: '1', name: '사원자', amount: '60g', role: '군' },
        { id: '2', name: '부분자', amount: '60g', role: '신' },
        { id: '3', name: '연수', amount: '60g', role: '좌' },
        { id: '4', name: '용골', amount: '30g', role: '좌' },
        { id: '5', name: '모려', amount: '30g', role: '좌' },
      ],
    },

    // ===== 치풍제 (治風劑) =====
    {
      id: '58',
      name: '천마구등음',
      hanja: '天麻鉤藤飮',
      category: '치풍제',
      source: '잡병증치신의',
      indication: '간양상항, 두통, 현훈, 이명, 목적, 실면 등',
      herbs: [
        { id: '1', name: '천마', amount: '9g', role: '군' },
        { id: '2', name: '구등', amount: '12g', role: '군' },
        { id: '3', name: '석결명', amount: '18g', role: '신' },
        { id: '4', name: '치자', amount: '9g', role: '신' },
        { id: '5', name: '황금', amount: '9g', role: '좌' },
        { id: '6', name: '우슬', amount: '12g', role: '좌' },
        { id: '7', name: '두충', amount: '9g', role: '좌' },
        { id: '8', name: '익모초', amount: '9g', role: '좌' },
        { id: '9', name: '상기생', amount: '9g', role: '좌' },
        { id: '10', name: '야교등', amount: '9g', role: '좌' },
        { id: '11', name: '복신', amount: '9g', role: '좌' },
      ],
    },
    {
      id: '59',
      name: '영각구등탕',
      hanja: '羚角鉤藤湯',
      category: '치풍제',
      source: '통속상한론',
      indication: '열극생풍, 고열불퇴, 조급경련, 수족추축, 신혼섬어 등',
      herbs: [
        { id: '1', name: '영양각', amount: '5g', role: '군' },
        { id: '2', name: '구등', amount: '9g', role: '신' },
        { id: '3', name: '상엽', amount: '6g', role: '좌' },
        { id: '4', name: '국화', amount: '9g', role: '좌' },
        { id: '5', name: '생지황', amount: '15g', role: '좌' },
        { id: '6', name: '백작약', amount: '9g', role: '좌' },
        { id: '7', name: '천패모', amount: '12g', role: '좌' },
        { id: '8', name: '죽여', amount: '15g', role: '좌' },
        { id: '9', name: '복신', amount: '9g', role: '좌' },
        { id: '10', name: '감초', amount: '3g', role: '사' },
      ],
    },

    // ===== 소도제 (消導劑) =====
    {
      id: '60',
      name: '보화환',
      hanja: '保和丸',
      category: '소도제',
      source: '단계심법',
      indication: '식적, 완복창만, 애부탄산, 오심구토, 대변불창 등',
      herbs: [
        { id: '1', name: '산사', amount: '180g', role: '군' },
        { id: '2', name: '신곡', amount: '60g', role: '신' },
        { id: '3', name: '반하', amount: '90g', role: '신' },
        { id: '4', name: '복령', amount: '90g', role: '좌' },
        { id: '5', name: '진피', amount: '30g', role: '좌' },
        { id: '6', name: '연교', amount: '30g', role: '좌' },
        { id: '7', name: '나복자', amount: '30g', role: '좌' },
      ],
    },
  ]
}
