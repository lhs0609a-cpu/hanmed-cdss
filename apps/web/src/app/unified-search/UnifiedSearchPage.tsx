import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
  Filter,
  BookOpen,
  Pill,
  Stethoscope,
  Activity,
  FileText,
  ChevronRight,
  X,
  Layers,
  Grid3X3,
  List,
  GraduationCap,
} from 'lucide-react'

// 검색 결과 타입
type SearchResultType = 'formula' | 'byeongyang' | 'byeongyak' | 'pattern'

interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  description?: string
  tags?: string[]
  link?: string
  data: FormulaCase | ByeongYangEntry | ByeongYakTable | ByeongYangPattern
  parentData?: ByeongYangEntry
}

// 학파 라벨
const SCHOOL_LABELS: Record<MedicineSchool, string> = {
  classical: '고방',
  later: '후세방',
  sasang: '사상방',
  hyungsang: '형상방',
}

// 검색 카테고리 타입
type SearchCategory = 'all' | 'formula' | 'disease' | 'pattern'

export default function UnifiedSearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all')
  const [selectedSchool, setSelectedSchool] = useState<MedicineSchool | 'all'>('all')
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)

  // 통합 검색 수행
  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return []

    const results: SearchResult[] = []

    // 1. 처방(FormulaCase) 검색
    if (selectedCategory === 'all' || selectedCategory === 'formula') {
      FORMULA_CASES.forEach((formula) => {
        // 학파 필터
        if (selectedSchool !== 'all' && formula.school !== selectedSchool) return

        const matchScore = calculateFormulaMatchScore(formula, query)
        if (matchScore > 0) {
          results.push({
            id: `formula-${formula.id}`,
            type: 'formula',
            title: formula.name,
            subtitle: formula.hanja,
            description: formula.indication,
            tags: [
              SCHOOL_LABELS[formula.school],
              formula.category,
              ...(formula.keySymptoms?.slice(0, 3) || []),
            ],
            link: `/formulas/${formula.id}`,
            data: formula,
          })
        }
      })
    }

    // 2. 병양도표(ByeongYang) 검색 - 질환
    if (selectedCategory === 'all' || selectedCategory === 'disease') {
      BYEONGYANG_DATA.forEach((disease) => {
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
          })
        }

        // 3. 변증 패턴 검색
        if (selectedCategory === 'all' || selectedCategory === 'pattern') {
          disease.patterns.forEach((pattern) => {
            const matchesPattern =
              pattern.patternName.toLowerCase().includes(query) ||
              pattern.hanja?.includes(query) ||
              pattern.symptoms.some((s) => s.name.toLowerCase().includes(query)) ||
              pattern.treatment.formulaNames.some((f) =>
                f.toLowerCase().includes(query)
              ) ||
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
                  ...pattern.symptoms
                    .filter((s) => s.isKey)
                    .slice(0, 2)
                    .map((s) => s.name),
                ],
                link: '/byeongyang',
                data: pattern,
                parentData: disease,
              })
            }
          })
        }
      })
    }

    // 4. 병약도표(ByeongYak) 검색
    if (selectedCategory === 'all' || selectedCategory === 'disease') {
      BYEONGYAK_TABLES.forEach((table) => {
        const matchesTable =
          table.disease.toLowerCase().includes(query) ||
          table.hanja.includes(query) ||
          table.description?.toLowerCase().includes(query) ||
          table.rows.some((row) =>
            Object.values(row.cells).some((cells) =>
              cells?.some((cell) => cell.formula.toLowerCase().includes(query))
            )
          )

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
          })
        }
      })
    }

    // 중복 제거 및 정렬
    return results.slice(0, 50)
  }, [searchQuery, selectedCategory, selectedSchool])

  // 처방 매칭 점수 계산
  function calculateFormulaMatchScore(formula: FormulaCase, query: string): number {
    let score = 0
    if (formula.name.toLowerCase().includes(query)) score += 10
    if (formula.hanja?.includes(query)) score += 8
    if (formula.indication.toLowerCase().includes(query)) score += 5
    if (formula.keySymptoms?.some((s) => s.toLowerCase().includes(query))) score += 3
    if (formula.targetPatterns?.some((p) => p.toLowerCase().includes(query))) score += 3
    if (formula.modernApplications?.some((a) => a.toLowerCase().includes(query)))
      score += 2
    if (formula.herbs.some((h) => h.name.toLowerCase().includes(query))) score += 2
    return score
  }

  // 결과 타입별 아이콘
  const getTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case 'formula':
        return <Pill className="h-4 w-4 text-blue-600" />
      case 'byeongyang':
        return <Activity className="h-4 w-4 text-teal-600" />
      case 'byeongyak':
        return <Grid3X3 className="h-4 w-4 text-pink-600" />
      case 'pattern':
        return <Stethoscope className="h-4 w-4 text-amber-600" />
    }
  }

  // 결과 타입별 배지 색상
  const getTypeBadgeColor = (type: SearchResultType) => {
    switch (type) {
      case 'formula':
        return 'bg-blue-100 text-blue-800'
      case 'byeongyang':
        return 'bg-teal-100 text-teal-800'
      case 'byeongyak':
        return 'bg-pink-100 text-pink-800'
      case 'pattern':
        return 'bg-amber-100 text-amber-800'
    }
  }

  // 결과 타입별 라벨
  const getTypeLabel = (type: SearchResultType) => {
    switch (type) {
      case 'formula':
        return '처방'
      case 'byeongyang':
        return '병증'
      case 'byeongyak':
        return '병약도표'
      case 'pattern':
        return '변증'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Search className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">통합 검색</h1>
              <p className="text-sm text-gray-500">
                처방, 병증, 변증, 치험례를 한 곳에서 검색하세요
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="처방명, 증상, 병명, 변증 검색... (예: 두통, 계지탕, 간양상항)"
                className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            {/* Category Filter */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[
                { value: 'all', label: '전체' },
                { value: 'formula', label: '처방' },
                { value: 'disease', label: '병증' },
                { value: 'pattern', label: '변증' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as SearchCategory)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    selectedCategory === cat.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* School Filter (처방 검색 시) */}
            {(selectedCategory === 'all' || selectedCategory === 'formula') && (
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setSelectedSchool('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    selectedSchool === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  전체 학파
                </button>
                {(['classical', 'later', 'sasang'] as MedicineSchool[]).map((school) => (
                  <button
                    key={school}
                    onClick={() => setSelectedSchool(school)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      selectedSchool === school
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {SCHOOL_LABELS[school]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Results */}
          <div className="lg:col-span-2 space-y-3">
            {!searchQuery ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  검색어를 입력하면 처방, 병증, 변증을 통합 검색합니다.
                </p>
                <div className="text-sm text-gray-400">
                  <p className="mb-2">검색 예시:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['두통', '계지탕', '간양상항', '보중익기탕', '불면'].map((example) => (
                      <button
                        key={example}
                        onClick={() => setSearchQuery(example)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  "{searchQuery}"에 대한 검색 결과가 없습니다.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{searchResults.length}</span>개 결과
                  </p>
                </div>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedResult(result)}
                    className={cn(
                      'w-full bg-white rounded-xl p-4 border transition-all text-left',
                      selectedResult?.id === result.id
                        ? 'border-indigo-500 ring-2 ring-indigo-100'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg">
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
                            <span className="text-gray-400 text-sm">{result.subtitle}</span>
                          )}
                        </div>
                        {result.description && (
                          <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                            {result.description}
                          </p>
                        )}
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {result.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedResult ? (
              <div className="bg-white rounded-xl border border-gray-200 sticky top-40">
                {/* Detail Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(selectedResult.type)}
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        getTypeBadgeColor(selectedResult.type)
                      )}
                    >
                      {getTypeLabel(selectedResult.type)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedResult(null)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                <div className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {/* 처방 상세 */}
                  {selectedResult.type === 'formula' && (
                    <FormulaDetail formula={selectedResult.data as FormulaCase} />
                  )}

                  {/* 병증 상세 */}
                  {selectedResult.type === 'byeongyang' && (
                    <DiseaseDetail disease={selectedResult.data as ByeongYangEntry} />
                  )}

                  {/* 변증 상세 */}
                  {selectedResult.type === 'pattern' && (
                    <PatternDetail
                      pattern={selectedResult.data as ByeongYangPattern}
                      disease={selectedResult.parentData as ByeongYangEntry}
                    />
                  )}

                  {/* 병약도표 상세 */}
                  {selectedResult.type === 'byeongyak' && (
                    <ByeongyakDetail table={selectedResult.data as ByeongYakTable} />
                  )}

                  {/* 관련 페이지 링크 */}
                  {selectedResult.link && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Link
                        to={selectedResult.link}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        상세 페이지로 이동
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center sticky top-40">
                <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  검색 결과를 선택하면
                  <br />
                  상세 정보가 표시됩니다.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/byeongyang"
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <List className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">병양도표</h3>
                <p className="text-sm text-gray-500">병증별 변증 가이드</p>
              </div>
            </div>
          </Link>

          <Link
            to="/formulas"
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Pill className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">처방 검색</h3>
                <p className="text-sm text-gray-500">학파별 처방 탐색</p>
              </div>
            </div>
          </Link>

          <Link
            to="/school-compare"
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <GraduationCap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">학파 비교</h3>
                <p className="text-sm text-gray-500">고방/후세방/사상방 비교</p>
              </div>
            </div>
          </Link>

          <Link
            to="/integrated-diagnosis"
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Stethoscope className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">통합 진단</h3>
                <p className="text-sm text-gray-500">ICD-10 연계 진단</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

// 처방 상세 컴포넌트
function FormulaDetail({ formula }: { formula: FormulaCase }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{formula.name}</h3>
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
        <h4 className="text-sm font-medium text-gray-700 mb-1">적응증</h4>
        <p className="text-sm text-gray-600">{formula.indication}</p>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-1">핵심 증상</h4>
        <div className="flex flex-wrap gap-1">
          {formula.keySymptoms?.map((symptom, idx) => (
            <span key={idx} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">
              {symptom}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-1">구성 약재</h4>
        <div className="space-y-1">
          {formula.herbs.map((herb, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'w-6 h-6 flex items-center justify-center rounded text-xs font-medium',
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
              <span className="text-gray-500">{herb.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {formula.clinicalNotes && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-1">임상 노트</h4>
          <p className="text-sm text-blue-700">{formula.clinicalNotes}</p>
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
        <h3 className="text-lg font-bold text-gray-900">{disease.disease}</h3>
        <p className="text-sm text-gray-500">{disease.hanja}</p>
      </div>

      {disease.description && (
        <p className="text-sm text-gray-600">{disease.description}</p>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">변증 목록</h4>
        <div className="space-y-2">
          {disease.patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="font-medium text-gray-900">{pattern.patternName}</div>
              <div className="text-xs text-gray-500 mt-1">
                치법: {pattern.treatment.principle}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {pattern.treatment.formulaNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                  >
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
function PatternDetail({
  pattern,
  disease,
}: {
  pattern: ByeongYangPattern
  disease: ByeongYangEntry
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">{disease.disease}</p>
        <h3 className="text-lg font-bold text-gray-900">{pattern.patternName}</h3>
        {pattern.hanja && <p className="text-sm text-gray-500">{pattern.hanja}</p>}
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">주요 증상</h4>
        <div className="space-y-1">
          {pattern.symptoms.map((symptom, idx) => (
            <div
              key={idx}
              className={cn(
                'px-3 py-2 rounded-lg text-sm',
                symptom.isKey ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50'
              )}
            >
              <span className={symptom.isKey ? 'font-medium text-teal-800' : 'text-gray-700'}>
                {symptom.name}
              </span>
              {symptom.specifics && (
                <span className="text-gray-500 ml-1">- {symptom.specifics}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-pink-50 rounded-lg">
          <div className="text-xs font-medium text-pink-800 mb-1">설진</div>
          <p className="text-sm text-gray-700">
            {pattern.tongue.body} / {pattern.tongue.coating}
          </p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-xs font-medium text-red-800 mb-1">맥진</div>
          <p className="text-sm text-gray-700">{pattern.pulse.type}</p>
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="text-xs font-medium text-blue-800 mb-1">치법</div>
        <p className="text-sm text-gray-700">{pattern.treatment.principle}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {pattern.treatment.formulaNames.map((name, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-white text-blue-700 text-sm rounded border border-blue-200"
            >
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
        <h3 className="text-lg font-bold text-gray-900">{table.disease} 병약도표</h3>
        <p className="text-sm text-gray-500">{table.hanja}</p>
      </div>

      {table.description && (
        <p className="text-sm text-gray-600">{table.description}</p>
      )}

      <div className="p-3 bg-pink-50 rounded-lg">
        <div className="text-xs font-medium text-pink-800 mb-2">체질별 처방 매트릭스</div>
        <p className="text-sm text-gray-600">
          환자의 체질(열/건실도)과 병인을 기준으로 적합한 처방을 찾을 수 있습니다.
        </p>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">포함된 처방</h4>
        <div className="flex flex-wrap gap-1">
          {table.rows
            .flatMap((row) =>
              Object.values(row.cells)
                .filter(Boolean)
                .flatMap((cells) => cells!.map((c) => c.formula))
            )
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 10)
            .map((formula, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {formula}
              </span>
            ))}
        </div>
      </div>

      {table.footnotes && table.footnotes.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-700 mb-1">참고</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {table.footnotes.map((note, idx) => (
              <li key={idx}>• {note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
