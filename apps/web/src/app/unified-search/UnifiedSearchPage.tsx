import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { FORMULA_CASES } from '@/data/formula-cases'
import { BYEONGYANG_DATA } from '@/data/byeongyang-data'
import { BYEONGYAK_TABLES } from '@/data/byeongyak-data'
import {
  FormulaCase,
  ByeongYangEntry,
  ByeongYangPattern,
  ByeongYakTable,
  MedicineSchool,
} from '@/types'
import {
  Search,
  BookOpen,
  Pill,
  Stethoscope,
  Activity,
  FileText,
  ChevronRight,
  X,
  Layers,
  Grid3X3,
  Clock,
  Sparkles,
  Keyboard,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Command,
  Loader2,
  Database,
  TrendingUp,
  Zap,
  AlertCircle,
} from 'lucide-react'

// AI Engine API URL
const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL || 'http://3.36.106.82:8080'

// 검색 결과 타입
type SearchResultType = 'formula' | 'byeongyang' | 'byeongyak' | 'pattern' | 'case'

interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  description?: string
  tags?: string[]
  link?: string
  data: FormulaCase | ByeongYangEntry | ByeongYakTable | ByeongYangPattern | CaseResult
  parentData?: ByeongYangEntry
  score?: number
}

// 치험례 검색 결과 타입
interface CaseResult {
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
  outcome: string | null
  result: string
  dataSource: string
}

// 학파 라벨
const SCHOOL_LABELS: Record<MedicineSchool, string> = {
  classical: '고방',
  later: '후세방',
  sasang: '사상방',
  hyungsang: '형상방',
}

// 검색 카테고리 타입
type SearchCategory = 'all' | 'formula' | 'disease' | 'pattern' | 'case'

// 최근 검색어 저장
const RECENT_SEARCHES_KEY = 'hanmed_recent_searches'
const MAX_RECENT_SEARCHES = 8

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentSearch(query: string) {
  const recent = getRecentSearches().filter(s => s !== query)
  recent.unshift(query)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES)))
}

export default function UnifiedSearchPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all')
  const [selectedSchool, setSelectedSchool] = useState<MedicineSchool | 'all'>('all')
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches())

  // API 검색 상태
  const [caseResults, setCaseResults] = useState<CaseResult[]>([])
  const [caseLoading, setCaseLoading] = useState(false)
  const [totalCases, setTotalCases] = useState(0)

  // 디바운스 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setSelectedIndex(0)
    }, 150) // 빠른 응답을 위해 150ms
    return () => clearTimeout(timer)
  }, [searchQuery])

  // API 검색 (치험례)
  useEffect(() => {
    if (!debouncedQuery || (selectedCategory !== 'all' && selectedCategory !== 'case')) {
      setCaseResults([])
      return
    }

    const fetchCases = async () => {
      setCaseLoading(true)
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '10',
          search: debouncedQuery,
        })
        const response = await fetch(`${AI_ENGINE_URL}/api/v1/cases/list?${params}`)
        if (response.ok) {
          const data = await response.json()
          const result = data.data || data
          setCaseResults(result.cases || [])
          setTotalCases(result.total || 0)
        }
      } catch (err) {
        console.error('Case search error:', err)
      } finally {
        setCaseLoading(false)
      }
    }

    fetchCases()
  }, [debouncedQuery, selectedCategory])

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: 검색창 포커스
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }

      // ESC: 검색창 클리어 또는 선택 해제
      if (e.key === 'Escape') {
        if (selectedResult) {
          setSelectedResult(null)
        } else if (searchQuery) {
          setSearchQuery('')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, selectedResult])

  // 검색 결과 내 키보드 네비게이션
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault()
      const result = allResults[selectedIndex]
      setSelectedResult(result)
      if (searchQuery) {
        addRecentSearch(searchQuery)
        setRecentSearches(getRecentSearches())
      }
      // 처방이면 상세 페이지로 바로 이동
      if (result.type === 'formula' && result.link) {
        navigate(result.link)
      }
    }
  }

  // 처방 매칭 점수 계산
  function calculateFormulaMatchScore(formula: FormulaCase, query: string): number {
    let score = 0
    const q = query.toLowerCase()
    if (formula.name.toLowerCase().includes(q)) score += 100
    if (formula.hanja?.includes(query)) score += 80
    if (formula.indication.toLowerCase().includes(q)) score += 50
    if (formula.keySymptoms?.some((s) => s.toLowerCase().includes(q))) score += 30
    if (formula.targetPatterns?.some((p) => p.toLowerCase().includes(q))) score += 30
    if (formula.modernApplications?.some((a) => a.toLowerCase().includes(q))) score += 20
    if (formula.herbs.some((h) => h.name.toLowerCase().includes(q))) score += 20
    return score
  }

  // 로컬 데이터 검색 결과
  const localResults = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim()
    if (!query) return []

    const results: SearchResult[] = []

    // 1. 처방(FormulaCase) 검색
    if (selectedCategory === 'all' || selectedCategory === 'formula') {
      FORMULA_CASES.forEach((formula) => {
        if (selectedSchool !== 'all' && formula.school !== selectedSchool) return

        const score = calculateFormulaMatchScore(formula, query)
        if (score > 0) {
          results.push({
            id: `formula-${formula.id}`,
            type: 'formula',
            title: formula.name,
            subtitle: formula.hanja,
            description: formula.indication,
            tags: [
              SCHOOL_LABELS[formula.school],
              formula.category,
              ...(formula.keySymptoms?.slice(0, 2) || []),
            ],
            link: `/formulas/${formula.id}`,
            data: formula,
            score,
          })
        }
      })
    }

    // 2. 병양도표 검색
    if (selectedCategory === 'all' || selectedCategory === 'disease' || selectedCategory === 'pattern') {
      BYEONGYANG_DATA.forEach((disease) => {
        if (selectedCategory === 'all' || selectedCategory === 'disease') {
          const matchesDisease =
            disease.disease.toLowerCase().includes(query) ||
            disease.hanja.includes(query) ||
            disease.description?.toLowerCase().includes(query)

          if (matchesDisease) {
            results.push({
              id: `byeongyang-${disease.id}`,
              type: 'byeongyang',
              title: disease.disease,
              subtitle: disease.hanja,
              description: disease.description,
              tags: [`${disease.patterns.length}개 변증`],
              link: '/byeongyang',
              data: disease,
              score: 50,
            })
          }
        }

        if (selectedCategory === 'all' || selectedCategory === 'pattern') {
          disease.patterns.forEach((pattern) => {
            const matchesPattern =
              pattern.patternName.toLowerCase().includes(query) ||
              pattern.hanja?.includes(query) ||
              pattern.symptoms.some((s) => s.name.toLowerCase().includes(query)) ||
              pattern.treatment.formulaNames.some((f) => f.toLowerCase().includes(query)) ||
              pattern.treatment.principle.toLowerCase().includes(query)

            if (matchesPattern) {
              results.push({
                id: `pattern-${disease.id}-${pattern.id}`,
                type: 'pattern',
                title: pattern.patternName,
                subtitle: `${disease.disease} > ${pattern.hanja || ''}`,
                description: `치법: ${pattern.treatment.principle}`,
                tags: [
                  ...pattern.treatment.formulaNames.slice(0, 2),
                  ...pattern.symptoms.filter((s) => s.isKey).slice(0, 1).map((s) => s.name),
                ],
                link: '/byeongyang',
                data: pattern,
                parentData: disease,
                score: 40,
              })
            }
          })
        }
      })
    }

    // 4. 병약도표 검색
    if (selectedCategory === 'all' || selectedCategory === 'disease') {
      BYEONGYAK_TABLES.forEach((table) => {
        const matchesTable =
          table.disease.toLowerCase().includes(query) ||
          table.hanja.includes(query) ||
          table.description?.toLowerCase().includes(query)

        if (matchesTable) {
          results.push({
            id: `byeongyak-${table.id}`,
            type: 'byeongyak',
            title: `${table.disease} 병약도표`,
            subtitle: table.hanja,
            description: table.description,
            tags: ['병약도표', '체질별 처방'],
            link: '/byeongyang',
            data: table,
            score: 45,
          })
        }
      })
    }

    // 점수순 정렬
    return results.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 30)
  }, [debouncedQuery, selectedCategory, selectedSchool])

  // 치험례 결과를 SearchResult 형식으로 변환
  const caseSearchResults: SearchResult[] = useMemo(() => {
    return caseResults.map(c => ({
      id: `case-${c.id}`,
      type: 'case' as SearchResultType,
      title: c.chiefComplaint || c.title,
      subtitle: c.formulaName,
      description: Array.isArray(c.symptoms) ? c.symptoms.slice(0, 3).join(', ') : '',
      tags: [
        c.constitution,
        c.outcome,
        c.patientAge ? `${c.patientAge}세` : '',
      ].filter(Boolean) as string[],
      link: '/cases',
      data: c,
      score: 60,
    }))
  }, [caseResults])

  // 전체 결과 병합
  const allResults = useMemo(() => {
    const merged = [...localResults, ...caseSearchResults]
    // 타입별로 그룹화하여 처방 > 치험례 > 병증 > 변증 순으로 정렬
    const typeOrder = { formula: 0, case: 1, byeongyang: 2, pattern: 3, byeongyak: 4 }
    return merged.sort((a, b) => {
      const typeA = typeOrder[a.type] ?? 5
      const typeB = typeOrder[b.type] ?? 5
      if (typeA !== typeB) return typeA - typeB
      return (b.score || 0) - (a.score || 0)
    }).slice(0, 50)
  }, [localResults, caseSearchResults])

  // 스크롤 동기화
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const items = resultsRef.current.querySelectorAll('[data-result-item]')
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // 검색 실행
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query) {
      addRecentSearch(query)
      setRecentSearches(getRecentSearches())
    }
  }

  // 결과 타입별 아이콘
  const getTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case 'formula':
        return <Pill className="h-4 w-4 text-blue-600" />
      case 'case':
        return <BookOpen className="h-4 w-4 text-amber-600" />
      case 'byeongyang':
        return <Activity className="h-4 w-4 text-teal-600" />
      case 'byeongyak':
        return <Grid3X3 className="h-4 w-4 text-pink-600" />
      case 'pattern':
        return <Stethoscope className="h-4 w-4 text-purple-600" />
    }
  }

  // 결과 타입별 배지 색상
  const getTypeBadgeColor = (type: SearchResultType) => {
    switch (type) {
      case 'formula':
        return 'bg-blue-100 text-blue-800'
      case 'case':
        return 'bg-amber-100 text-amber-800'
      case 'byeongyang':
        return 'bg-teal-100 text-teal-800'
      case 'byeongyak':
        return 'bg-pink-100 text-pink-800'
      case 'pattern':
        return 'bg-purple-100 text-purple-800'
    }
  }

  // 결과 타입별 라벨
  const getTypeLabel = (type: SearchResultType) => {
    switch (type) {
      case 'formula':
        return '처방'
      case 'case':
        return '치험례'
      case 'byeongyang':
        return '병증'
      case 'byeongyak':
        return '병약도표'
      case 'pattern':
        return '변증'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Compact Header with Search */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Search Bar - 핵심 */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="증상, 처방명, 변증 검색... (⌘K)"
                className="w-full pl-12 pr-24 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-16 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-gray-400">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>

            {/* 키보드 단축키 힌트 */}
            {allResults.length > 0 && (
              <div className="absolute right-4 -bottom-6 flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                  이동
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" />
                  선택
                </span>
              </div>
            )}
          </div>

          {/* Compact Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[
                { value: 'all', label: '전체', icon: Layers },
                { value: 'formula', label: '처방', icon: Pill },
                { value: 'case', label: '치험례', icon: BookOpen },
                { value: 'disease', label: '병증', icon: Activity },
                { value: 'pattern', label: '변증', icon: Stethoscope },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as SearchCategory)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    selectedCategory === cat.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>

            {(selectedCategory === 'all' || selectedCategory === 'formula') && (
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { value: 'all', label: '전체학파' },
                  { value: 'classical', label: '고방' },
                  { value: 'later', label: '후세방' },
                  { value: 'sasang', label: '사상방' },
                ].map((school) => (
                  <button
                    key={school.value}
                    onClick={() => setSelectedSchool(school.value as MedicineSchool | 'all')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-md text-sm font-medium transition-all',
                      selectedSchool === school.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {school.label}
                  </button>
                ))}
              </div>
            )}

            {/* 검색 통계 */}
            {debouncedQuery && (
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                {caseLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{allResults.length}개 결과</span>
                {totalCases > 0 && selectedCategory !== 'formula' && (
                  <span className="text-amber-600">
                    (치험례 {totalCases.toLocaleString()}건 중 검색)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {!debouncedQuery ? (
          /* 검색 전 화면 */
          <div className="space-y-8">
            {/* 최근 검색어 */}
            {recentSearches.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  최근 검색
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearch(query)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 인기 검색어 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                자주 검색되는 키워드
              </h3>
              <div className="flex flex-wrap gap-2">
                {['두통', '불면', '소화불량', '피로', '감기', '요통', '보중익기탕', '귀비탕', '소시호탕', '반하사심탕'].map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => handleSearch(keyword)}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-full text-sm text-indigo-700 hover:from-indigo-100 hover:to-purple-100 transition-all"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                to="/case-search"
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all group"
              >
                <div className="p-3 bg-amber-100 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-gray-900">AI 치험례 검색</h3>
                <p className="text-sm text-gray-500 mt-1">6,115건 AI 분석</p>
              </Link>

              <Link
                to="/consultation"
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all group"
              >
                <div className="p-3 bg-blue-100 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">AI 진료</h3>
                <p className="text-sm text-gray-500 mt-1">증상 입력 → 처방 추천</p>
              </Link>

              <Link
                to="/interactions"
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all group"
              >
                <div className="p-3 bg-red-100 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900">상호작용 검사</h3>
                <p className="text-sm text-gray-500 mt-1">양약-한약 체크</p>
              </Link>

              <Link
                to="/formulas"
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all group"
              >
                <div className="p-3 bg-teal-100 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
                  <Database className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-gray-900">처방 DB</h3>
                <p className="text-sm text-gray-500 mt-1">학파별 처방 탐색</p>
              </Link>
            </div>
          </div>
        ) : (
          /* 검색 결과 */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Results List */}
            <div ref={resultsRef} className="lg:col-span-3 space-y-2">
              {allResults.length === 0 && !caseLoading ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                  <Search className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">"{searchQuery}"에 대한 결과가 없습니다</p>
                  <p className="text-gray-400 text-sm mt-2">다른 검색어를 시도해보세요</p>
                </div>
              ) : (
                allResults.map((result, idx) => (
                  <button
                    key={result.id}
                    data-result-item
                    onClick={() => {
                      setSelectedResult(result)
                      setSelectedIndex(idx)
                    }}
                    className={cn(
                      'w-full bg-white rounded-xl p-4 border-2 transition-all text-left group',
                      selectedIndex === idx
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-md'
                        : selectedResult?.id === result.id
                        ? 'border-indigo-300 shadow-sm'
                        : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg transition-colors',
                        selectedIndex === idx ? 'bg-indigo-100' : 'bg-gray-50 group-hover:bg-gray-100'
                      )}>
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              getTypeBadgeColor(result.type)
                            )}
                          >
                            {getTypeLabel(result.type)}
                          </span>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {result.title}
                          </h3>
                          {result.subtitle && (
                            <span className="text-gray-400 text-sm truncate">{result.subtitle}</span>
                          )}
                        </div>
                        {result.description && (
                          <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                            {result.description}
                          </p>
                        )}
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {result.tags.filter(Boolean).slice(0, 4).map((tag, tidx) => (
                              <span
                                key={tidx}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        'h-5 w-5 flex-shrink-0 transition-colors',
                        selectedIndex === idx ? 'text-indigo-500' : 'text-gray-300'
                      )} />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-2">
              <div className="sticky top-32">
                {selectedResult ? (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(selectedResult.type)}
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getTypeBadgeColor(selectedResult.type))}>
                          {getTypeLabel(selectedResult.type)}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedResult(null)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>

                    <div className="p-4 max-h-[60vh] overflow-y-auto">
                      {selectedResult.type === 'formula' && (
                        <FormulaDetail formula={selectedResult.data as FormulaCase} />
                      )}
                      {selectedResult.type === 'case' && (
                        <CaseDetail caseData={selectedResult.data as CaseResult} />
                      )}
                      {selectedResult.type === 'byeongyang' && (
                        <DiseaseDetail disease={selectedResult.data as ByeongYangEntry} />
                      )}
                      {selectedResult.type === 'pattern' && (
                        <PatternDetail
                          pattern={selectedResult.data as ByeongYangPattern}
                          disease={selectedResult.parentData as ByeongYangEntry}
                        />
                      )}
                      {selectedResult.type === 'byeongyak' && (
                        <ByeongyakDetail table={selectedResult.data as ByeongYakTable} />
                      )}

                      {selectedResult.link && (
                        <Link
                          to={selectedResult.link}
                          className="mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                        >
                          <FileText className="h-4 w-4" />
                          상세 페이지로 이동
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-8 text-center">
                    <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      결과를 선택하면<br />상세 정보가 표시됩니다
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                      <Keyboard className="h-3 w-3" />
                      <span>↑↓ 키로 이동, Enter로 선택</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 처방 상세 컴포넌트
function FormulaDetail({ formula }: { formula: FormulaCase }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-gray-900">{formula.name}</h3>
        <p className="text-sm text-gray-500">{formula.hanja}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
          {SCHOOL_LABELS[formula.school]}
        </span>
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
          {formula.category}
        </span>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-1">적응증</h4>
        <p className="text-sm text-gray-600">{formula.indication}</p>
      </div>

      {formula.keySymptoms && formula.keySymptoms.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">핵심 증상</h4>
          <div className="flex flex-wrap gap-1">
            {formula.keySymptoms.map((symptom, idx) => (
              <span key={idx} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                {symptom}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">구성 약재</h4>
        <div className="space-y-1">
          {formula.herbs.slice(0, 8).map((herb, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'w-6 h-6 flex items-center justify-center rounded text-xs font-bold',
                  herb.role === '군'
                    ? 'bg-red-100 text-red-700'
                    : herb.role === '신'
                    ? 'bg-orange-100 text-orange-700'
                    : herb.role === '좌'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                )}
              >
                {herb.role}
              </span>
              <span className="font-medium text-gray-900">{herb.name}</span>
              <span className="text-gray-400">{herb.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {formula.clinicalNotes && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="text-xs font-semibold text-blue-800 mb-1">임상 노트</h4>
          <p className="text-sm text-blue-700">{formula.clinicalNotes}</p>
        </div>
      )}
    </div>
  )
}

// 치험례 상세 컴포넌트
function CaseDetail({ caseData }: { caseData: CaseResult }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-gray-900">{caseData.chiefComplaint || caseData.title}</h3>
        <p className="text-sm text-amber-600 font-medium">{caseData.formulaName}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {caseData.constitution && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
            {caseData.constitution}
          </span>
        )}
        {caseData.outcome && (
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded',
            caseData.outcome === '완치' ? 'bg-green-100 text-green-800' :
            caseData.outcome === '호전' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          )}>
            {caseData.outcome}
          </span>
        )}
        {caseData.patientAge && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {caseData.patientAge}세
          </span>
        )}
        {caseData.patientGender && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {caseData.patientGender === 'M' ? '남성' : caseData.patientGender === 'F' ? '여성' : caseData.patientGender}
          </span>
        )}
      </div>

      {caseData.symptoms && caseData.symptoms.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">증상</h4>
          <div className="flex flex-wrap gap-1">
            {caseData.symptoms.slice(0, 6).map((symptom, idx) => (
              <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full">
                {symptom}
              </span>
            ))}
          </div>
        </div>
      )}

      {caseData.diagnosis && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
          <h4 className="text-xs font-semibold text-purple-800 mb-1">변증</h4>
          <p className="text-sm text-purple-700">{caseData.diagnosis}</p>
        </div>
      )}

      {caseData.result && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <h4 className="text-xs font-semibold text-green-800 mb-1">치료 결과</h4>
          <p className="text-sm text-green-700">{caseData.result}</p>
        </div>
      )}
    </div>
  )
}

// 병증 상세 컴포넌트
function DiseaseDetail({ disease }: { disease: ByeongYangEntry }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-gray-900">{disease.disease}</h3>
        <p className="text-sm text-gray-500">{disease.hanja}</p>
      </div>

      {disease.description && (
        <p className="text-sm text-gray-600">{disease.description}</p>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">변증 목록 ({disease.patterns.length})</h4>
        <div className="space-y-2">
          {disease.patterns.slice(0, 5).map((pattern) => (
            <div key={pattern.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900 text-sm">{pattern.patternName}</div>
              <div className="text-xs text-gray-500 mt-1">치법: {pattern.treatment.principle}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {pattern.treatment.formulaNames.slice(0, 3).map((name, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 변증 상세 컴포넌트
function PatternDetail({ pattern, disease }: { pattern: ByeongYangPattern; disease: ByeongYangEntry }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">{disease.disease}</p>
        <h3 className="text-xl font-bold text-gray-900">{pattern.patternName}</h3>
        {pattern.hanja && <p className="text-sm text-gray-500">{pattern.hanja}</p>}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">주요 증상</h4>
        <div className="space-y-1">
          {pattern.symptoms.slice(0, 6).map((symptom, idx) => (
            <div
              key={idx}
              className={cn(
                'px-3 py-2 rounded-lg text-sm',
                symptom.isKey ? 'bg-teal-50 border border-teal-200 font-medium' : 'bg-gray-50'
              )}
            >
              {symptom.name}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-pink-50 rounded-lg">
          <div className="text-xs font-semibold text-pink-800 mb-1">설진</div>
          <p className="text-sm text-gray-700">{pattern.tongue.body} / {pattern.tongue.coating}</p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-xs font-semibold text-red-800 mb-1">맥진</div>
          <p className="text-sm text-gray-700">{pattern.pulse.type}</p>
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="text-xs font-semibold text-blue-800 mb-1">치법</div>
        <p className="text-sm text-gray-700">{pattern.treatment.principle}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {pattern.treatment.formulaNames.map((name, idx) => (
            <span key={idx} className="px-2 py-1 bg-white text-blue-700 text-sm rounded border border-blue-200">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// 병약도표 상세 컴포넌트
function ByeongyakDetail({ table }: { table: ByeongYakTable }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-gray-900">{table.disease} 병약도표</h3>
        <p className="text-sm text-gray-500">{table.hanja}</p>
      </div>

      {table.description && (
        <p className="text-sm text-gray-600">{table.description}</p>
      )}

      <div className="p-3 bg-pink-50 rounded-lg">
        <div className="text-xs font-semibold text-pink-800 mb-2">체질별 처방 매트릭스</div>
        <p className="text-sm text-gray-600">
          환자의 체질과 병인을 기준으로 적합한 처방을 찾을 수 있습니다.
        </p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">포함된 처방</h4>
        <div className="flex flex-wrap gap-1">
          {table.rows
            .flatMap((row) =>
              Object.values(row.cells)
                .filter(Boolean)
                .flatMap((cells) => cells!.map((c) => c.formula))
            )
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 12)
            .map((formula, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {formula}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}
