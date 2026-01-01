import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  BookOpen,
  ChevronRight,
  Loader2,
  Leaf,
  Filter,
} from 'lucide-react'
import { MedicineSchool } from '@/types'
import { SchoolBadge } from '@/components/formula/SchoolBadge'
import { SchoolFilter } from '@/components/formula/SchoolFilter'
// JSON 데이터 직접 import
import allFormulasData from '@/data/formulas/all-formulas.json'

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
  school?: MedicineSchool
}

interface JsonFormulaData {
  id: string
  name: string
  hanja: string
  code?: string
  category: string
  categoryLabel?: string
  source: string
  composition: Array<{
    herb: string
    amount: string
    processing?: string | null
  }>
  indicationText?: string
  indications?: string[]
  description?: string
  dataSource?: string
}

// 카테고리 매핑
const categoryMap: Record<string, string> = {
  'etc': '기타',
  '해표': '해표제',
  '청열': '청열제',
  '보익': '보익제',
  '이기': '이기제',
  '화담': '화담제',
  '이수': '이수제',
  '온리': '온리제',
  '소도': '소도제',
  '고섭': '고섭제',
}

// JSON 데이터를 Formula 형식으로 변환
function transformJsonToFormula(json: JsonFormulaData): Formula {
  const category = categoryMap[json.category] || json.categoryLabel || json.category || '기타'

  return {
    id: json.id,
    name: json.name,
    hanja: json.hanja || '',
    category: category,
    source: json.source || '',
    indication: json.indicationText || json.indications?.join(', ') || json.description?.slice(0, 100) || '',
    herbs: json.composition?.map((comp, idx) => ({
      id: String(idx + 1),
      name: comp.herb?.replace(/各[\d\w]+/g, '').trim() || '',
      amount: comp.amount || '',
      role: '',
    })).filter(h => h.name) || [],
  }
}

// 모든 JSON 데이터를 변환
const allFormulas: Formula[] = (allFormulasData as JsonFormulaData[]).map(transformJsonToFormula)

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
  '기타',
]

const ITEMS_PER_PAGE = 12

export default function FormulasPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedSchool, setSelectedSchool] = useState<MedicineSchool | 'all'>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    // 짧은 로딩 효과
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  // 필터링된 데이터
  const filteredFormulas = useMemo(() => {
    let result = allFormulas

    // 카테고리 필터
    if (selectedCategory !== '전체') {
      result = result.filter(f => f.category === selectedCategory)
    }

    // 학파 필터
    if (selectedSchool !== 'all') {
      result = result.filter(f => f.school === selectedSchool)
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.hanja.toLowerCase().includes(query) ||
        f.indication.toLowerCase().includes(query) ||
        f.herbs.some(h => h.name.toLowerCase().includes(query))
      )
    }

    return result
  }, [selectedCategory, selectedSchool, searchQuery])

  // 페이지네이션
  const totalPages = Math.ceil(filteredFormulas.length / ITEMS_PER_PAGE)
  const paginatedFormulas = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredFormulas.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredFormulas, page])

  const handleSearch = () => {
    setPage(1)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setPage(1)
  }

  const handleSchoolChange = (school: MedicineSchool | 'all') => {
    setSelectedSchool(school)
    setPage(1)
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
          한의학 처방의 구성 약재와 적응증을 확인하세요 ({allFormulas.length}개 처방)
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
                placeholder="처방명, 적응증, 약재명으로 검색..."
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
              onClick={() => handleCategoryChange(category)}
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

        {/* School Filter */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">학파별 분류</span>
          </div>
          <SchoolFilter
            selected={selectedSchool}
            onChange={handleSchoolChange}
          />
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : paginatedFormulas.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">검색 결과가 없습니다</p>
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="text-sm text-gray-500">
            총 {filteredFormulas.length}개 처방 중 {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, filteredFormulas.length)}개 표시
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedFormulas.map((formula) => (
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
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
                      {formula.category}
                    </span>
                    {formula.school && (
                      <SchoolBadge school={formula.school} size="sm" />
                    )}
                  </div>
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
