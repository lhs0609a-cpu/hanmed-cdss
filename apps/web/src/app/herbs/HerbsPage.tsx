import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Leaf,
  ChevronRight,
  Loader2,
  Filter,
  Beaker,
  AlertCircle,
} from 'lucide-react'
import api from '@/services/api'
import { logError } from '@/lib/errors'

interface QueryParams {
  page: number
  limit: number
  category?: string
  nature?: string
  q?: string
}

interface Herb {
  id: string
  standardName: string
  hanjaName: string
  category: string
  properties: {
    nature?: string
    flavor?: string
  }
  meridianTropism: string[]
  efficacy: string
  activeCompounds?: Array<{ name: string }>
}

interface HerbsResponse {
  data: Herb[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const categories = [
  '전체',
  '보기약',
  '보혈약',
  '보음약',
  '보양약',
  '청열약',
  '해표약',
  '이기약',
  '활혈약',
  '화담약',
]

const natures = ['전체', '한', '량', '평', '온', '열']

export default function HerbsPage() {
  const [herbs, setHerbs] = useState<Herb[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedNature, setSelectedNature] = useState('전체')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    fetchHerbs()
  }, [page, selectedCategory, selectedNature])

  // 조회 실패 시 데모 약재로 조용히 바꿔치지 않는다.
  // 예전에는 배너도 없이 demo 데이터를 띄우고 totalPages 를 3 으로 고정했다 —
  // 한의사는 그게 실제 본초 DB 라고 믿고 처방 판단에 쓰게 된다. 약재 정보에서 이건 허용 범위가 아니다.
  const fetchHerbs = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const params: QueryParams = { page, limit: 12 }
      if (selectedCategory !== '전체') {
        params.category = selectedCategory
      }
      if (selectedNature !== '전체') {
        params.nature = selectedNature
      }
      const response = await api.get<HerbsResponse>('/herbs', { params })
      setHerbs(response.data.data)
      setTotalPages(response.data.meta.totalPages)
    } catch (error) {
      logError(error, 'HerbsPage')
      setHerbs([])
      setTotalPages(1)
      setLoadError('약재 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsLoading(false)
    }
  }, [page, selectedCategory, selectedNature])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchHerbs()
      return
    }

    setIsLoading(true)
    setLoadError('')
    try {
      const response = await api.get<HerbsResponse>('/herbs/search', {
        params: { q: searchQuery, page: 1, limit: 12 },
      })
      setHerbs(response.data.data)
      setTotalPages(response.data.meta.totalPages)
      setPage(1)
    } catch (error) {
      logError(error, 'HerbsPage.search')
      setHerbs([])
      setTotalPages(1)
      setLoadError('약재 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Leaf className="h-7 w-7 text-blue-500" />
          약재 검색
        </h1>
        <p className="mt-1 text-gray-500">
          한약재의 성분과 효능을 확인하세요
        </p>
      </div>

      {/* Search & Filter */}
      <div className="surface-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="약재명, 효능으로 검색..."
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
          <span className="text-sm text-gray-500 flex-shrink-0">분류:</span>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Nature Filter */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-sm text-gray-500 flex-shrink-0 ml-6">성질:</span>
          {natures.map((nature) => (
            <button
              key={nature}
              onClick={() => {
                setSelectedNature(nature)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedNature === nature
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {nature}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : loadError ? (
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <p className="text-[15px] font-medium text-gray-700">{loadError}</p>
          <p className="mt-1 text-[13px] text-gray-500">
            약재 정보가 없는 것이 아니라, 서버 조회에 실패했습니다.
          </p>
          <button
            type="button"
            onClick={() => (searchQuery.trim() ? handleSearch() : fetchHerbs())}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-neutral-100 px-4 py-2.5 text-[13px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-200"
          >
            다시 시도
          </button>
        </div>
      ) : herbs.length === 0 ? (
        <div className="text-center py-20">
          <Leaf className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">검색 결과가 없습니다</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {herbs.map((herb) => (
              <Link
                key={herb.id}
                to={`/herbs/${herb.id}`}
                className="group surface-card rounded-2xl p-6 hover:shadow-lg hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-blue-500" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {herb.standardName}
                      </h3>
                      <p className="text-sm text-gray-500">{herb.hanjaName}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
                    {herb.category}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {herb.properties?.nature && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-md">
                      {herb.properties.nature}
                    </span>
                  )}
                  {herb.properties?.flavor && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md">
                      {herb.properties.flavor}
                    </span>
                  )}
                  {herb.meridianTropism?.slice(0, 3).map((m, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {herb.efficacy}
                </p>

                {herb.activeCompounds && herb.activeCompounds.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Beaker className="h-3.5 w-3.5" />
                    <span>
                      {herb.activeCompounds
                        .slice(0, 3)
                        .map((c) => c.name)
                        .join(', ')}
                      {herb.activeCompounds.length > 3 && ` 외 ${herb.activeCompounds.length - 3}개`}
                    </span>
                  </div>
                )}

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
