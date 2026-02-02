import { useState } from 'react'
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
  Search,
  Calendar,
  User,
  Pill,
  Activity,
  BookOpen,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// 체질 옵션
const constitutionOptions = [
  { value: 'taeyang', label: '태양인' },
  { value: 'taeeum', label: '태음인' },
  { value: 'soyang', label: '소양인' },
  { value: 'soeum', label: '소음인' },
]

// 증상 카테고리
const symptomCategories = [
  { value: 'digestive', label: '소화기', symptoms: ['소화불량', '복통', '설사', '변비', '식욕부진'] },
  { value: 'respiratory', label: '호흡기', symptoms: ['기침', '가래', '천식', '호흡곤란'] },
  { value: 'musculoskeletal', label: '근골격계', symptoms: ['요통', '관절통', '근육통', '어깨결림'] },
  { value: 'neurological', label: '신경계', symptoms: ['두통', '어지러움', '불면', '이명'] },
  { value: 'cardiovascular', label: '순환기', symptoms: ['가슴두근거림', '흉통', '부종'] },
  { value: 'dermatological', label: '피부과', symptoms: ['습진', '아토피', '두드러기', '가려움'] },
]

// 치료 결과
const outcomeOptions = [
  { value: 'cured', label: '완치' },
  { value: 'improved', label: '호전' },
  { value: 'unchanged', label: '무효' },
]

// 저장된 검색 타입
interface SavedSearch {
  id: string
  name: string
  filters: SearchFilters
  createdAt: Date
}

// 검색 필터 타입
export interface SearchFilters {
  keyword: string
  constitution: string[]
  symptoms: string[]
  formulas: string[]
  dateRange: {
    start: string
    end: string
  }
  patientAge: {
    min: string
    max: string
  }
  patientGender: string
  outcome: string[]
}

// 기본 필터
const defaultFilters: SearchFilters = {
  keyword: '',
  constitution: [],
  symptoms: [],
  formulas: [],
  dateRange: { start: '', end: '' },
  patientAge: { min: '', max: '' },
  patientGender: '',
  outcome: [],
}

interface AdvancedSearchFilterProps {
  onFilterChange: (filters: SearchFilters) => void
  initialFilters?: Partial<SearchFilters>
}

export function AdvancedSearchFilter({ onFilterChange, initialFilters }: AdvancedSearchFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({ ...defaultFilters, ...initialFilters })
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: '1',
      name: '소화기 질환 검색',
      filters: { ...defaultFilters, symptoms: ['소화불량', '복통'] },
      createdAt: new Date(),
    },
  ])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [searchName, setSearchName] = useState('')

  // 필터 업데이트
  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  // 체질 토글
  const toggleConstitution = (value: string) => {
    const newConstitution = filters.constitution.includes(value)
      ? filters.constitution.filter((c) => c !== value)
      : [...filters.constitution, value]
    updateFilter('constitution', newConstitution)
  }

  // 증상 토글
  const toggleSymptom = (symptom: string) => {
    const newSymptoms = filters.symptoms.includes(symptom)
      ? filters.symptoms.filter((s) => s !== symptom)
      : [...filters.symptoms, symptom]
    updateFilter('symptoms', newSymptoms)
  }

  // 결과 토글
  const toggleOutcome = (value: string) => {
    const newOutcome = filters.outcome.includes(value)
      ? filters.outcome.filter((o) => o !== value)
      : [...filters.outcome, value]
    updateFilter('outcome', newOutcome)
  }

  // 필터 초기화
  const resetFilters = () => {
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  // 검색 저장
  const saveSearch = () => {
    if (!searchName.trim()) return
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      filters: { ...filters },
      createdAt: new Date(),
    }
    setSavedSearches([newSearch, ...savedSearches])
    setSearchName('')
    setShowSaveDialog(false)
  }

  // 저장된 검색 불러오기
  const loadSearch = (search: SavedSearch) => {
    setFilters(search.filters)
    onFilterChange(search.filters)
  }

  // 저장된 검색 삭제
  const deleteSearch = (id: string) => {
    setSavedSearches(savedSearches.filter((s) => s.id !== id))
  }

  // 활성 필터 개수
  const activeFilterCount = [
    filters.constitution.length > 0,
    filters.symptoms.length > 0,
    filters.formulas.length > 0,
    filters.dateRange.start || filters.dateRange.end,
    filters.patientAge.min || filters.patientAge.max,
    filters.patientGender,
    filters.outcome.length > 0,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* 검색창 및 필터 토글 */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="증상, 처방명, 약재명으로 검색..."
            value={filters.keyword}
            onChange={(e) => updateFilter('keyword', e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={isOpen ? 'default' : 'outline'}
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          고급 필터
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* 고급 필터 패널 */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <Card>
            <CardContent className="p-4 space-y-6">
              {/* 저장된 검색 */}
              {savedSearches.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    저장된 검색
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {savedSearches.map((search) => (
                      <div
                        key={search.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm group"
                      >
                        <button
                          onClick={() => loadSearch(search)}
                          className="hover:text-teal-600"
                        >
                          {search.name}
                        </button>
                        <button
                          onClick={() => deleteSearch(search.id)}
                          className="opacity-0 group-hover:opacity-100 ml-1 text-gray-400 hover:text-red-500 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 체질 필터 */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  체질
                </Label>
                <div className="flex flex-wrap gap-2">
                  {constitutionOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleConstitution(option.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        filters.constitution.includes(option.value)
                          ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-900/30'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 증상 필터 */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  증상
                </Label>
                <div className="space-y-3">
                  {symptomCategories.map((category) => (
                    <div key={category.value}>
                      <p className="text-xs text-gray-500 mb-1.5">{category.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {category.symptoms.map((symptom) => (
                          <button
                            key={symptom}
                            onClick={() => toggleSymptom(symptom)}
                            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                              filters.symptoms.includes(symptom)
                                ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-900/30'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700'
                            }`}
                          >
                            {symptom}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 기간 및 환자 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 기간 */}
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    기간
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })
                      }
                      className="flex-1"
                    />
                    <span className="text-gray-400">~</span>
                    <Input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) =>
                        updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* 환자 나이 */}
                <div>
                  <Label className="text-sm font-medium mb-2">환자 나이</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="최소"
                      value={filters.patientAge.min}
                      onChange={(e) =>
                        updateFilter('patientAge', { ...filters.patientAge, min: e.target.value })
                      }
                      className="flex-1"
                    />
                    <span className="text-gray-400">~</span>
                    <Input
                      type="number"
                      placeholder="최대"
                      value={filters.patientAge.max}
                      onChange={(e) =>
                        updateFilter('patientAge', { ...filters.patientAge, max: e.target.value })
                      }
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">세</span>
                  </div>
                </div>
              </div>

              {/* 성별 및 결과 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 성별 */}
                <div>
                  <Label className="text-sm font-medium mb-2">환자 성별</Label>
                  <Select
                    value={filters.patientGender}
                    onValueChange={(value) => updateFilter('patientGender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">전체</SelectItem>
                      <SelectItem value="M">남성</SelectItem>
                      <SelectItem value="F">여성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 치료 결과 */}
                <div>
                  <Label className="text-sm font-medium mb-2">치료 결과</Label>
                  <div className="flex gap-2">
                    {outcomeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleOutcome(option.value)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          filters.outcome.includes(option.value)
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    초기화
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveDialog(true)}
                    className="gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    검색 저장
                  </Button>
                </div>
                <Button size="sm" onClick={() => setIsOpen(false)} className="gap-1.5">
                  <Search className="h-4 w-4" />
                  검색
                </Button>
              </div>

              {/* 검색 저장 다이얼로그 */}
              {showSaveDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <Card className="w-full max-w-sm">
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-semibold">검색 조건 저장</h3>
                      <Input
                        placeholder="검색 이름 입력..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>
                          취소
                        </Button>
                        <Button size="sm" onClick={saveSearch} disabled={!searchName.trim()}>
                          저장
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* 활성 필터 표시 */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.constitution.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1">
              {constitutionOptions.find((o) => o.value === c)?.label}
              <button onClick={() => toggleConstitution(c)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.symptoms.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 bg-purple-100 text-purple-700">
              {s}
              <button onClick={() => toggleSymptom(s)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.outcome.map((o) => (
            <Badge key={o} variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700">
              {outcomeOptions.find((opt) => opt.value === o)?.label}
              <button onClick={() => toggleOutcome(o)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
