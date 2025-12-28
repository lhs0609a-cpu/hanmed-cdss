/**
 * 본초/처방 정보 페이지 (공공데이터 API)
 * - 식품의약품안전처 생약 약재정보
 * - 지식재산처 한국전통 약재정보
 * - 지식재산처 한국전통 처방정보
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Search,
  Loader2,
  Leaf,
  BookOpen,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  FlaskConical,
  Thermometer,
  Target,
  AlertTriangle,
  Pill,
  ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  searchIntegratedHerb,
  searchTraditionalPrescription,
} from '@/services/herb-api'
import type { IntegratedHerbInfo, TraditionalPrescriptionItem } from '@/types'

type TabType = 'herbs' | 'prescriptions'

// 초성 검색용 자음 목록
const CHOSUNG = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

export default function PublicHerbsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('herbs')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChosung, setSelectedChosung] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [herbResults, setHerbResults] = useState<IntegratedHerbInfo[]>([])
  const [prescResults, setPrescResults] = useState<TraditionalPrescriptionItem[]>([])
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // 초기 로딩
  useEffect(() => {
    loadInitialData()
  }, [activeTab])

  const loadInitialData = async () => {
    setIsLoading(true)
    setExpandedItem(null)
    try {
      if (activeTab === 'herbs') {
        const data = await searchIntegratedHerb('')
        setHerbResults(data.items)
      } else {
        const data = await searchTraditionalPrescription('')
        setPrescResults(data.items)
      }
    } catch (error) {
      console.error('초기 데이터 로딩 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadInitialData()
      return
    }

    setIsLoading(true)
    setHasSearched(true)
    setSelectedChosung(null)
    setExpandedItem(null)

    try {
      if (activeTab === 'herbs') {
        const data = await searchIntegratedHerb(searchQuery.trim())
        setHerbResults(data.items)
      } else {
        const data = await searchTraditionalPrescription(searchQuery.trim())
        setPrescResults(data.items)
      }
    } catch (error) {
      console.error('검색 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, activeTab])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleChosungClick = async (chosung: string) => {
    if (selectedChosung === chosung) {
      setSelectedChosung(null)
      loadInitialData()
      return
    }

    setSelectedChosung(chosung)
    setSearchQuery('')
    setIsLoading(true)
    setHasSearched(true)

    try {
      if (activeTab === 'herbs') {
        const data = await searchIntegratedHerb('')
        const filtered = data.items.filter((item) => {
          const firstChar = item.koreanName.charAt(0)
          return getChosung(firstChar) === chosung
        })
        setHerbResults(filtered)
      } else {
        const data = await searchTraditionalPrescription('')
        const filtered = data.items.filter((item) => {
          const firstChar = item.prescNm.charAt(0)
          return getChosung(firstChar) === chosung
        })
        setPrescResults(filtered)
      }
    } catch (error) {
      console.error('초성 검색 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getChosung = (char: string): string => {
    const code = char.charCodeAt(0) - 0xAC00
    if (code < 0 || code > 11171) return ''
    const chosungIndex = Math.floor(code / 588)
    const chosungList = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
    return chosungList[chosungIndex] || ''
  }

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSelectedChosung(null)
    setHasSearched(false)
    loadInitialData()
  }

  const currentResults = activeTab === 'herbs' ? herbResults : prescResults
  const totalCount = currentResults.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
              <Leaf className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">본초 & 처방 DB</h1>
              <p className="text-sm text-gray-500">
                한국전통지식포털 & 식약처 공공데이터
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setActiveTab('herbs')
                setSearchQuery('')
                setSelectedChosung(null)
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                activeTab === 'herbs'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <Leaf className="h-4 w-4" />
              본초 (약재)
            </button>
            <button
              onClick={() => {
                setActiveTab('prescriptions')
                setSearchQuery('')
                setSelectedChosung(null)
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                activeTab === 'prescriptions'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <ScrollText className="h-4 w-4" />
              처방
            </button>
          </div>

          {/* Search Input */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeTab === 'herbs'
                    ? '약재명, 효능, 주치병증 (예: 감초, 보기)'
                    : '처방명, 구성약재, 주치 (예: 사군자탕)'
                }
                className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white transition-all text-lg"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              검색
            </button>
          </div>

          {/* Chosung Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 flex-shrink-0">초성:</span>
            <div className="flex gap-1">
              {CHOSUNG.map((cho) => (
                <button
                  key={cho}
                  onClick={() => handleChosungClick(cho)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                    selectedChosung === cho
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {cho}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 text-green-500 animate-spin mb-4" />
            <p className="text-gray-500">
              {activeTab === 'herbs' ? '본초 정보를' : '처방 정보를'} 검색 중입니다...
            </p>
          </div>
        ) : totalCount > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                총 <span className="font-semibold text-gray-900">{totalCount}</span>개의{' '}
                {activeTab === 'herbs' ? '약재' : '처방'}
                {selectedChosung && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    '{selectedChosung}' 초성
                  </span>
                )}
              </p>
            </div>

            <div className="grid gap-4">
              {activeTab === 'herbs'
                ? herbResults.map((herb) => (
                    <HerbCard
                      key={herb.id}
                      herb={herb}
                      isExpanded={expandedItem === herb.id}
                      onToggle={() => toggleExpand(herb.id)}
                    />
                  ))
                : prescResults.map((presc) => (
                    <PrescriptionCard
                      key={presc.cntntsNo}
                      prescription={presc}
                      isExpanded={expandedItem === presc.cntntsNo}
                      onToggle={() => toggleExpand(presc.cntntsNo)}
                    />
                  ))}
            </div>
          </>
        ) : hasSearched ? (
          <EmptyState type="no-results" tabType={activeTab} />
        ) : (
          <EmptyState
            type="initial"
            tabType={activeTab}
            onSearch={(term) => {
              setSearchQuery(term)
              setTimeout(() => handleSearch(), 100)
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-4 mt-8">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs text-gray-500 text-center">
            데이터 출처: 식품의약품안전처, 지식재산처 한국전통지식포털
          </p>
        </div>
      </div>
    </div>
  )
}

// 본초 카드 컴포넌트
function HerbCard({
  herb,
  isExpanded,
  onToggle,
}: {
  herb: IntegratedHerbInfo
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-xl font-bold text-gray-900">{herb.koreanName}</h3>
              {herb.chineseName && (
                <span className="text-lg text-gray-500 font-medium">{herb.chineseName}</span>
              )}
              <span
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full',
                  herb.dataSource === 'both'
                    ? 'bg-purple-100 text-purple-700'
                    : herb.dataSource === 'kipo'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                )}
              >
                {herb.dataSource === 'both' ? '통합' : herb.dataSource === 'kipo' ? '전통지식' : '식약처'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              {herb.medicinalPart && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{herb.medicinalPart}</span>
              )}
              {herb.latinName && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="italic">{herb.latinName}</span>
                </>
              )}
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gradient-to-br from-green-50/50 to-emerald-50/50 p-5">
          <div className="grid md:grid-cols-2 gap-4">
            {(herb.nature || herb.taste || herb.meridian) && (
              <div className="space-y-3">
                {herb.nature && (
                  <div className="flex items-start gap-3">
                    <Thermometer className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">성질 (性)</p>
                      <p className="text-gray-900">{herb.nature}</p>
                    </div>
                  </div>
                )}
                {herb.taste && (
                  <div className="flex items-start gap-3">
                    <FlaskConical className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">맛 (味)</p>
                      <p className="text-gray-900">{herb.taste}</p>
                    </div>
                  </div>
                )}
                {herb.meridian && (
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">귀경 (歸經)</p>
                      <p className="text-gray-900">{herb.meridian}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {herb.efficacy && (
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">효능</p>
                    <p className="text-gray-900">{herb.efficacy}</p>
                  </div>
                </div>
              )}
              {herb.symptoms && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">주치병증</p>
                    <p className="text-gray-900">{herb.symptoms}</p>
                  </div>
                </div>
              )}
              {herb.contraindication && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">금기</p>
                    <p className="text-red-600">{herb.contraindication}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {herb.source && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">출전: {herb.source}</div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <a
              href="https://www.koreantk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              한국전통지식포털에서 더 보기
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// 처방 카드 컴포넌트
function PrescriptionCard({
  prescription,
  isExpanded,
  onToggle,
}: {
  prescription: TraditionalPrescriptionItem
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-xl font-bold text-gray-900">{prescription.prescNm}</h3>
              {prescription.prescNmHanja && (
                <span className="text-lg text-gray-500 font-medium">{prescription.prescNmHanja}</span>
              )}
              {prescription.category && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">{prescription.category}</span>
              )}
            </div>
            {prescription.ingredients && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Pill className="h-4 w-4 text-green-500" />
                <span className="line-clamp-1">{prescription.ingredients}</span>
              </div>
            )}
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {prescription.ingredients && (
                <div className="flex items-start gap-3">
                  <Pill className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">구성약재</p>
                    <p className="text-gray-900">{prescription.ingredients}</p>
                  </div>
                </div>
              )}
              {prescription.preparation && (
                <div className="flex items-start gap-3">
                  <FlaskConical className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">조제용법</p>
                    <p className="text-gray-900">{prescription.preparation}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {prescription.efficacy && (
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">효능</p>
                    <p className="text-gray-900">{prescription.efficacy}</p>
                  </div>
                </div>
              )}
              {prescription.symptoms && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">주치병증</p>
                    <p className="text-gray-900">{prescription.symptoms}</p>
                  </div>
                </div>
              )}
              {prescription.contraindication && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">금기</p>
                    <p className="text-red-600">{prescription.contraindication}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {prescription.modification && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700 mb-1">가감법</p>
              <p className="text-sm text-blue-900">{prescription.modification}</p>
            </div>
          )}

          {prescription.source && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">출전: {prescription.source}</div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <a
              href="https://www.koreantk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              한국전통지식포털에서 더 보기
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// 빈 상태 컴포넌트
function EmptyState({
  type,
  tabType,
  onSearch,
}: {
  type: 'initial' | 'no-results'
  tabType: TabType
  onSearch?: (term: string) => void
}) {
  const isHerbs = tabType === 'herbs'
  const exampleTerms = isHerbs
    ? ['감초', '인삼', '황기', '당귀', '백출']
    : ['사군자탕', '사물탕', '보중익기탕', '육군자탕', '팔물탕']

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Search className="h-10 w-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
        <p className="text-gray-500 text-center max-w-sm">
          다른 검색어로 시도해 보세요.
          <br />
          {isHerbs ? '약재명, 효능, 주치병증으로 검색할 수 있습니다.' : '처방명, 구성약재, 주치병증으로 검색할 수 있습니다.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
        {isHerbs ? <Leaf className="h-10 w-10 text-green-500" /> : <ScrollText className="h-10 w-10 text-green-500" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{isHerbs ? '본초(약재)를' : '처방을'} 검색해 보세요</h3>
      <p className="text-gray-500 text-center max-w-sm mb-6">
        {isHerbs
          ? '한국전통지식포털과 식약처 데이터를 통합하여 본초 정보를 제공합니다.'
          : '한국전통지식포털의 처방 정보를 검색할 수 있습니다.'}
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {exampleTerms.map((term) => (
          <button
            key={term}
            onClick={() => onSearch?.(term)}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}
