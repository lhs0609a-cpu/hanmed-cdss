import { useState, useEffect } from 'react'
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

  const fetchFormulas = async () => {
    setIsLoading(true)
    try {
      const params: any = { page, limit: 12 }
      if (selectedCategory !== '전체') {
        params.category = selectedCategory
      }
      const response = await api.get<FormulasResponse>('/formulas', { params })
      setFormulas(response.data.data)
      setTotalPages(response.data.meta.totalPages)
    } catch (error) {
      // 데모용 더미 데이터
      setFormulas(getDemoFormulas())
      setTotalPages(5)
    } finally {
      setIsLoading(false)
    }
  }

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
      id: '4',
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
      id: '5',
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
      id: '6',
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
  ]
}
