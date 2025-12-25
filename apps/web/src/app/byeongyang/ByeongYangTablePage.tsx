import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  BYEONGYANG_DATA,
  getByeongYangByCategory,
  searchByeongYang,
} from '@/data/byeongyang-data'
import {
  ByeongYangEntry,
  ByeongYangPattern,
  DiseaseCategory,
  DISEASE_CATEGORY_LABELS,
} from '@/types'
import {
  Search,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Activity,
  Stethoscope,
  Pill,
  AlertCircle,
  Layers,
  FileText,
  X,
} from 'lucide-react'

export default function ByeongYangTablePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<DiseaseCategory | 'all'>('all')
  const [selectedDisease, setSelectedDisease] = useState<ByeongYangEntry | null>(null)
  const [selectedPattern, setSelectedPattern] = useState<ByeongYangPattern | null>(null)
  const [expandedDiseases, setExpandedDiseases] = useState<Set<string>>(new Set())

  // 필터링된 데이터
  const filteredData = (() => {
    let data = BYEONGYANG_DATA

    if (selectedCategory !== 'all') {
      data = getByeongYangByCategory(selectedCategory)
    }

    if (searchQuery) {
      data = searchByeongYang(searchQuery)
    }

    return data
  })()

  const toggleDisease = (id: string) => {
    const newExpanded = new Set(expandedDiseases)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedDiseases(newExpanded)
  }

  const handlePatternClick = (disease: ByeongYangEntry, pattern: ByeongYangPattern) => {
    setSelectedDisease(disease)
    setSelectedPattern(pattern)
  }

  const closeDetail = () => {
    setSelectedPattern(null)
    setSelectedDisease(null)
  }

  const categoryColors: Record<DiseaseCategory, string> = {
    external: 'bg-blue-100 text-blue-800 border-blue-200',
    internal: 'bg-amber-100 text-amber-800 border-amber-200',
    miscellaneous: 'bg-purple-100 text-purple-800 border-purple-200',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-teal-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">병양도표</h1>
              <p className="text-sm text-gray-500">病養圖表 - 병증별 변증 및 처방 가이드</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="병명 또는 변증 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                전체
              </button>
              {(Object.keys(DISEASE_CATEGORY_LABELS) as DiseaseCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedCategory === cat
                      ? categoryColors[cat].replace('border-', 'border ')
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {DISEASE_CATEGORY_LABELS[cat].split('(')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Disease List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredData.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">검색 결과가 없습니다.</p>
              </div>
            ) : (
              filteredData.map((disease) => (
                <div key={disease.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Disease Header */}
                  <button
                    onClick={() => toggleDisease(disease.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        categoryColors[disease.category]
                      )}>
                        {DISEASE_CATEGORY_LABELS[disease.category].split('(')[0]}
                      </span>
                      <span className="font-bold text-gray-900">{disease.disease}</span>
                      <span className="text-gray-400 text-sm">{disease.hanja}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {disease.patterns.length}개 변증
                      </span>
                      {expandedDiseases.has(disease.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Pattern List */}
                  {expandedDiseases.has(disease.id) && (
                    <div className="border-t border-gray-100">
                      {disease.description && (
                        <p className="px-4 py-2 text-sm text-gray-600 bg-gray-50 border-b border-gray-100">
                          {disease.description}
                        </p>
                      )}
                      <div className="divide-y divide-gray-100">
                        {disease.patterns.map((pattern) => (
                          <button
                            key={pattern.id}
                            onClick={() => handlePatternClick(disease, pattern)}
                            className={cn(
                              'w-full px-4 py-3 flex items-center justify-between hover:bg-teal-50 transition-colors text-left',
                              selectedPattern?.id === pattern.id && 'bg-teal-50'
                            )}
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                {pattern.patternName}
                                {pattern.hanja && (
                                  <span className="ml-2 text-gray-400 text-sm">{pattern.hanja}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {pattern.symptoms
                                  .filter((s) => s.isKey)
                                  .slice(0, 3)
                                  .map((symptom, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                    >
                                      {symptom.name}
                                    </span>
                                  ))}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedPattern && selectedDisease ? (
              <div className="bg-white rounded-xl border border-gray-200 sticky top-32">
                {/* Detail Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">{selectedDisease.disease}</span>
                    <h3 className="font-bold text-gray-900">{selectedPattern.patternName}</h3>
                  </div>
                  <button
                    onClick={closeDetail}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {/* Symptoms */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-teal-600" />
                      <h4 className="font-medium text-gray-900">주요 증상</h4>
                    </div>
                    <div className="space-y-1">
                      {selectedPattern.symptoms.map((symptom, idx) => (
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
                          {symptom.isKey && (
                            <span className="ml-2 text-xs text-teal-600">(핵심)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tongue & Pulse */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-pink-50 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <Layers className="h-4 w-4 text-pink-600" />
                        <span className="text-xs font-medium text-pink-800">설진</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {selectedPattern.tongue.body} / {selectedPattern.tongue.coating}
                      </p>
                      {selectedPattern.tongue.description && (
                        <p className="text-xs text-gray-500 mt-1">{selectedPattern.tongue.description}</p>
                      )}
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <Stethoscope className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-red-800">맥진</span>
                      </div>
                      <p className="text-sm text-gray-700">{selectedPattern.pulse.type}</p>
                      {selectedPattern.pulse.description && (
                        <p className="text-xs text-gray-500 mt-1">{selectedPattern.pulse.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Treatment */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-gray-900">치료</h4>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                      <div>
                        <span className="text-xs font-medium text-blue-800">치법</span>
                        <p className="text-sm text-gray-700">{selectedPattern.treatment.principle}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-blue-800">추천 처방</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedPattern.treatment.formulaNames.map((name, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-white text-blue-700 text-sm rounded border border-blue-200"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                      {selectedPattern.treatment.acupoints && (
                        <div>
                          <span className="text-xs font-medium text-blue-800">추천 경혈</span>
                          <p className="text-sm text-gray-700">
                            {selectedPattern.treatment.acupoints.join(', ')}
                          </p>
                        </div>
                      )}
                      {selectedPattern.treatment.notes && (
                        <div>
                          <span className="text-xs font-medium text-blue-800">참고</span>
                          <p className="text-sm text-gray-600">{selectedPattern.treatment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Differential Points */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <h4 className="font-medium text-gray-900">감별 포인트</h4>
                    </div>
                    <ul className="space-y-1">
                      {selectedPattern.differentialPoints.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-gray-700"
                        >
                          <span className="text-amber-500 mt-1">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center sticky top-32">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  좌측에서 병증을 선택하면<br />
                  상세 정보가 표시됩니다.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">{BYEONGYANG_DATA.length}</div>
            <div className="text-sm text-gray-500">등록된 병증</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {BYEONGYANG_DATA.reduce((acc, d) => acc + d.patterns.length, 0)}
            </div>
            <div className="text-sm text-gray-500">변증 패턴</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {getByeongYangByCategory('external').length}
            </div>
            <div className="text-sm text-gray-500">외감병</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {getByeongYangByCategory('internal').length}
            </div>
            <div className="text-sm text-gray-500">내상병</div>
          </div>
        </div>
      </div>
    </div>
  )
}
