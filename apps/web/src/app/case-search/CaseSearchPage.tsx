import { useState } from 'react'
import {
  Search,
  X,
  Sparkles,
  Filter,
  Plus,
  CheckCircle2,
  Loader2,
  BookOpen,
  AlertCircle,
  Info,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CaseMatchCard,
  ScoreDetailsCard,
  ConfidenceBadge,
} from '@/components/case-match'
import type {
  CaseSearchRequest,
  CaseSearchResponse,
  MatchedCase,
  SymptomRequest,
  PatientInfoRequest,
} from '@/types/case-search'
import {
  transformCaseSearchRequest,
  transformCaseSearchResponse,
  MATCH_GRADE_COLORS,
  MATCH_GRADE_LABELS,
} from '@/types/case-search'
import type { ConstitutionType } from '@/types'

// Symptom categories for quick selection
const symptomCategories = [
  { name: '전신', symptoms: ['발열', '오한', '피로', '무력감', '자한', '도한', '부종'] },
  { name: '두면부', symptoms: ['두통', '현훈', '이명', '목적', '비색', '인후통', '구안와사'] },
  { name: '흉복부', symptoms: ['흉민', '심계', '해수', '천식', '구토', '오심', '복통', '복창', '설사', '변비'] },
  { name: '사지', symptoms: ['요통', '관절통', '사지마비', '수족냉', '수족열'] },
  { name: '정신', symptoms: ['불면', '다몽', '건망', '불안', '울증', '심번'] },
  { name: '부인과', symptoms: ['월경불조', '월경통', '대하', '붕루', '임신오저'] },
  { name: '비뇨기', symptoms: ['소변불리', '빈뇨', '야뇨', '유정'] },
  { name: '신경계', symptoms: ['중풍', '반신마비', '언어장애', '안면마비'] },
]

const constitutionTypes: ConstitutionType[] = ['소음인', '태음인', '소양인', '태양인']

export default function CaseSearchPage() {
  // Form state
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [symptoms, setSymptoms] = useState<SymptomRequest[]>([])
  const [patientInfo, setPatientInfo] = useState<PatientInfoRequest>({})
  const [symptomInput, setSymptomInput] = useState('')
  const [showSymptomSelector, setShowSymptomSelector] = useState(false)

  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<CaseSearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null)
  const [showScoreDetails, setShowScoreDetails] = useState(false)
  const [selectedCase, setSelectedCase] = useState<MatchedCase | null>(null)

  // Add symptom
  const addSymptom = (name: string, severity?: number) => {
    if (!symptoms.find((s) => s.name === name)) {
      setSymptoms([...symptoms, { name, severity }])
    }
    setSymptomInput('')
  }

  // Remove symptom
  const removeSymptom = (name: string) => {
    setSymptoms(symptoms.filter((s) => s.name !== name))
  }

  // Handle search
  const handleSearch = async () => {
    if (!chiefComplaint.trim()) {
      setError('주소증을 입력해주세요')
      return
    }

    setIsSearching(true)
    setError(null)
    setSearchResult(null)

    const request: CaseSearchRequest = {
      patientInfo,
      chiefComplaint: chiefComplaint.trim(),
      symptoms,
      options: {
        topK: 20,
        minConfidence: 0,
      },
    }

    try {
      const apiUrl = import.meta.env.VITE_AI_ENGINE_URL || 'http://localhost:8001'
      const response = await fetch(`${apiUrl}/api/v1/cases/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformCaseSearchRequest(request)),
      })

      if (!response.ok) {
        throw new Error('검색 중 오류가 발생했습니다')
      }

      const data = await response.json()
      setSearchResult(transformCaseSearchResponse(data))
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다')
    } finally {
      setIsSearching(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setChiefComplaint('')
    setSymptoms([])
    setPatientInfo({})
    setSearchResult(null)
    setError(null)
  }

  // Filter symptoms based on input
  const allSymptoms = symptomCategories.flatMap((cat) => cat.symptoms)
  const filteredSymptoms = symptomInput
    ? allSymptoms.filter((s) => s.includes(symptomInput))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-indigo-500" />
          AI 치험례 검색
        </h1>
        <p className="mt-1 text-gray-500">
          환자 증상을 입력하면 4,300+ 치험례 중 유사 사례를 AI가 찾아드립니다
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            검색 조건
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Info */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">환자 정보 (선택)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="age" className="text-xs text-gray-500">나이</Label>
                <Input
                  id="age"
                  type="number"
                  min={0}
                  max={120}
                  value={patientInfo.age || ''}
                  onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="예: 65"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">성별</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={patientInfo.gender === 'M' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPatientInfo({ ...patientInfo, gender: 'M' })}
                    className="flex-1"
                  >
                    남성
                  </Button>
                  <Button
                    type="button"
                    variant={patientInfo.gender === 'F' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPatientInfo({ ...patientInfo, gender: 'F' })}
                    className="flex-1"
                  >
                    여성
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">체질</Label>
                <select
                  value={patientInfo.constitution || ''}
                  onChange={(e) => setPatientInfo({ ...patientInfo, constitution: e.target.value as ConstitutionType || undefined })}
                  className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">선택 안함</option>
                  {constitutionTypes.map((type) => (
                    <option key={type} value={type || ''}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <Label htmlFor="chief" className="text-sm font-medium text-gray-700">
              주소증 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="chief"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="예: 중풍, 두통, 요통, 불면 등"
              className="mt-1"
            />
          </div>

          {/* Symptoms */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              증상 (선택)
            </Label>

            {/* Selected Symptoms */}
            {symptoms.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {symptoms.map((symptom) => (
                  <Badge key={symptom.name} variant="secondary" className="gap-1 pr-1">
                    {symptom.name}
                    {symptom.severity && (
                      <span className="text-xs opacity-70">({symptom.severity}/10)</span>
                    )}
                    <button
                      onClick={() => removeSymptom(symptom.name)}
                      className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Symptom Input */}
            <div className="relative">
              <Input
                value={symptomInput}
                onChange={(e) => {
                  setSymptomInput(e.target.value)
                  setShowSymptomSelector(true)
                }}
                onFocus={() => setShowSymptomSelector(true)}
                placeholder="증상을 입력하거나 선택하세요"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && symptomInput.trim()) {
                    addSymptom(symptomInput.trim())
                    e.preventDefault()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowSymptomSelector(!showSymptomSelector)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', showSymptomSelector && 'rotate-180')} />
              </button>
            </div>

            {/* Symptom Suggestions */}
            {showSymptomSelector && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border max-h-64 overflow-y-auto">
                {symptomInput && filteredSymptoms.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {filteredSymptoms.map((symptom) => {
                      const isSelected = symptoms.some((s) => s.name === symptom)
                      return (
                        <button
                          key={symptom}
                          onClick={() => addSymptom(symptom)}
                          disabled={isSelected}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
                            isSelected
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border'
                          )}
                        >
                          {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          {symptom}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {symptomCategories.map((category) => (
                      <div key={category.name}>
                        <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {category.name}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {category.symptoms.map((symptom) => {
                            const isSelected = symptoms.some((s) => s.name === symptom)
                            return (
                              <button
                                key={symptom}
                                onClick={() => addSymptom(symptom)}
                                className={cn(
                                  'px-2 py-1 rounded text-xs font-medium transition-all',
                                  isSelected
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border'
                                )}
                              >
                                {symptom}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSearch}
              disabled={isSearching || !chiefComplaint.trim()}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  검색 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  유사 치험례 검색
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grade Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg text-sm">
        <span className="text-gray-500 font-medium">매칭 등급:</span>
        {(['S', 'A', 'B', 'C', 'D'] as const).map((grade) => (
          <div key={grade} className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs',
                MATCH_GRADE_COLORS[grade].bg,
                MATCH_GRADE_COLORS[grade].text,
                MATCH_GRADE_COLORS[grade].border,
                'border'
              )}
            >
              {grade}
            </span>
            <span className="text-gray-600">{MATCH_GRADE_LABELS[grade]}</span>
          </div>
        ))}
      </div>

      {/* Results */}
      {searchResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              검색 결과 ({searchResult.totalFound}건)
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>검색 시간: {searchResult.searchMetadata.processingTimeMs.toFixed(0)}ms</span>
              {searchResult.searchMetadata.vectorSearchUsed && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI 벡터 검색
                </Badge>
              )}
            </div>
          </div>

          {searchResult.results.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">조건에 맞는 치험례를 찾지 못했습니다</p>
              <p className="text-sm text-gray-400 mt-2">다른 조건으로 검색해보세요</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {searchResult.results.map((matchedCase, index) => (
                <CaseMatchCard
                  key={matchedCase.caseId}
                  matchedCase={matchedCase}
                  rank={index + 1}
                  expanded={expandedCaseId === matchedCase.caseId}
                  onToggleExpand={() => {
                    setExpandedCaseId(
                      expandedCaseId === matchedCase.caseId ? null : matchedCase.caseId
                    )
                    setSelectedCase(matchedCase)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Score Details Modal/Sidebar - could be expanded */}
      {showScoreDetails && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowScoreDetails(false)}>
          <Card className="max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>점수 분석</span>
                <button onClick={() => setShowScoreDetails(false)}>
                  <X className="h-5 w-5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-3">
                <ConfidenceBadge score={selectedCase.matchScore} size="lg" />
              </div>
              <ScoreDetailsCard score={selectedCase.matchScore} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
        <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium mb-1">매칭 점수 안내</p>
          <p className="text-blue-600">
            매칭 점수는 AI 벡터 유사도(40%), 키워드 매칭(30%), 메타데이터 매칭(30%)을 종합하여 산출됩니다.
            점수가 높을수록 입력하신 환자와 유사한 사례입니다.
          </p>
        </div>
      </div>
    </div>
  )
}
