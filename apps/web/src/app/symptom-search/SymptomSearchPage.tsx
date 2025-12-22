import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  X,
  Sparkles,
  ChevronRight,
  Plus,
  Filter,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Symptom {
  id: string
  name: string
  category: string
}

interface FormulaResult {
  id: string
  name: string
  hanja: string
  category: string
  matchScore: number
  matchedSymptoms: string[]
  indication: string
  keyHerbs: string[]
}

const symptomCategories = [
  { name: '전신', symptoms: ['발열', '오한', '피로', '무력감', '자한', '도한', '부종'] },
  { name: '두면부', symptoms: ['두통', '현훈', '이명', '목적', '비색', '인후통', '구안와사'] },
  { name: '흉복부', symptoms: ['흉민', '심계', '해수', '천식', '구토', '오심', '복통', '복창', '설사', '변비'] },
  { name: '사지', symptoms: ['요통', '관절통', '사지마비', '수족냉', '수족열'] },
  { name: '정신', symptoms: ['불면', '다몽', '건망', '불안', '울증', '심번'] },
  { name: '부인과', symptoms: ['월경불조', '월경통', '대하', '붕루', '임신오저'] },
  { name: '비뇨기', symptoms: ['소변불리', '빈뇨', '야뇨', '유정'] },
]

const allSymptoms = symptomCategories.flatMap((cat) =>
  cat.symptoms.map((s) => ({ id: s, name: s, category: cat.name }))
)

const formulaDatabase: FormulaResult[] = [
  {
    id: '1',
    name: '소시호탕',
    hanja: '小柴胡湯',
    category: '화해제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '왕래한열, 흉협고만, 묵묵불욕식, 심번희구, 구고, 인건, 목현',
    keyHerbs: ['시호', '황금', '반하', '인삼'],
  },
  {
    id: '2',
    name: '보중익기탕',
    hanja: '補中益氣湯',
    category: '보익제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '비위기허, 사지무력, 중기하함, 탈항, 자궁하수, 만성설사',
    keyHerbs: ['황기', '인삼', '백출', '당귀'],
  },
  {
    id: '3',
    name: '귀비탕',
    hanja: '歸脾湯',
    category: '보익제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '심비양허, 건망, 불면, 심계, 맥세약, 식소체권, 붕루',
    keyHerbs: ['인삼', '황기', '당귀', '용안육', '산조인'],
  },
  {
    id: '4',
    name: '소청룡탕',
    hanja: '小靑龍湯',
    category: '해표제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '외한내음, 오한발열, 무한, 해수, 담다청희, 흉만, 천급',
    keyHerbs: ['마황', '계지', '세신', '반하', '오미자'],
  },
  {
    id: '5',
    name: '반하사심탕',
    hanja: '半夏瀉心湯',
    category: '화해제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '한열호결, 심하비경, 오심구토, 장명설사',
    keyHerbs: ['반하', '황금', '황련', '인삼', '건강'],
  },
  {
    id: '6',
    name: '천왕보심단',
    hanja: '天王補心丹',
    category: '안신제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '심신부족, 불면다몽, 심계정충, 건망, 대변건조, 구설생창',
    keyHerbs: ['생지황', '인삼', '단삼', '현삼', '산조인'],
  },
  {
    id: '7',
    name: '사물탕',
    hanja: '四物湯',
    category: '보익제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '혈허, 월경불조, 월경통, 안색위황, 현훈, 심계',
    keyHerbs: ['숙지황', '당귀', '백작약', '천궁'],
  },
  {
    id: '8',
    name: '육미지황환',
    hanja: '六味地黃丸',
    category: '보익제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '신음허, 요슬산연, 두훈이명, 유정, 도한, 소갈, 골증조열',
    keyHerbs: ['숙지황', '산수유', '산약', '택사', '목단피', '복령'],
  },
  {
    id: '9',
    name: '독활기생탕',
    hanja: '獨活寄生湯',
    category: '거풍습제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '간신양허, 풍한습비, 요슬냉통, 지절굴신불리, 하지마비',
    keyHerbs: ['독활', '상기생', '두충', '우슬', '숙지황'],
  },
  {
    id: '10',
    name: '온담탕',
    hanja: '溫膽湯',
    category: '이기제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '담열내요, 허번불면, 경계불안, 구역, 현훈',
    keyHerbs: ['반하', '진피', '복령', '지실', '죽여'],
  },
]

const symptomToFormulas: Record<string, string[]> = {
  '발열': ['소시호탕', '소청룡탕'],
  '오한': ['소청룡탕', '소시호탕'],
  '피로': ['보중익기탕', '귀비탕'],
  '무력감': ['보중익기탕', '귀비탕'],
  '자한': ['보중익기탕'],
  '도한': ['육미지황환'],
  '두통': ['소시호탕', '천왕보심단'],
  '현훈': ['귀비탕', '사물탕', '육미지황환', '온담탕'],
  '이명': ['육미지황환'],
  '흉민': ['소시호탕'],
  '심계': ['귀비탕', '천왕보심단', '사물탕'],
  '해수': ['소청룡탕'],
  '구토': ['반하사심탕', '소시호탕'],
  '오심': ['반하사심탕', '소시호탕'],
  '복통': ['반하사심탕'],
  '설사': ['보중익기탕', '반하사심탕'],
  '변비': ['천왕보심단'],
  '요통': ['독활기생탕', '육미지황환'],
  '관절통': ['독활기생탕'],
  '사지마비': ['독활기생탕'],
  '수족냉': ['독활기생탕'],
  '불면': ['귀비탕', '천왕보심단', '온담탕'],
  '다몽': ['천왕보심단'],
  '건망': ['귀비탕', '천왕보심단'],
  '불안': ['귀비탕', '온담탕'],
  '울증': ['소시호탕'],
  '월경불조': ['사물탕', '귀비탕'],
  '월경통': ['사물탕'],
  '유정': ['육미지황환'],
}

export default function SymptomSearchPage() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<FormulaResult[]>([])

  const handleAddSymptom = (symptom: Symptom) => {
    if (!selectedSymptoms.find((s) => s.id === symptom.id)) {
      setSelectedSymptoms([...selectedSymptoms, symptom])
    }
  }

  const handleRemoveSymptom = (symptomId: string) => {
    setSelectedSymptoms(selectedSymptoms.filter((s) => s.id !== symptomId))
  }

  const handleSearch = () => {
    if (selectedSymptoms.length === 0) return

    const formulaScores: Record<string, { score: number; matched: string[] }> = {}

    selectedSymptoms.forEach((symptom) => {
      const matchingFormulas = symptomToFormulas[symptom.name] || []
      matchingFormulas.forEach((formulaName) => {
        if (!formulaScores[formulaName]) {
          formulaScores[formulaName] = { score: 0, matched: [] }
        }
        formulaScores[formulaName].score += 1
        formulaScores[formulaName].matched.push(symptom.name)
      })
    })

    const scoredResults = formulaDatabase
      .map((formula) => ({
        ...formula,
        matchScore: formulaScores[formula.name]?.score || 0,
        matchedSymptoms: formulaScores[formula.name]?.matched || [],
      }))
      .filter((f) => f.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)

    setResults(scoredResults)
    setShowResults(true)
  }

  const filteredSymptoms = allSymptoms.filter((s) =>
    s.name.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Search className="h-7 w-7 text-indigo-500" />
          증상→처방 검색
        </h1>
        <p className="mt-1 text-gray-500">
          증상을 선택하면 적합한 처방을 추천해 드립니다
        </p>
      </div>

      {/* Selected Symptoms */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">선택된 증상</h2>
          {selectedSymptoms.length > 0 && (
            <button
              onClick={() => setSelectedSymptoms([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              모두 지우기
            </button>
          )}
        </div>

        {selectedSymptoms.length === 0 ? (
          <p className="text-gray-400 text-center py-4">
            아래에서 증상을 선택해주세요
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedSymptoms.map((symptom) => (
              <span
                key={symptom.id}
                className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium"
              >
                {symptom.name}
                <button
                  onClick={() => handleRemoveSymptom(symptom.id)}
                  className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={selectedSymptoms.length === 0}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="h-5 w-5" />
          처방 검색
        </button>
      </div>

      {/* Symptom Selection */}
      {!showResults && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Quick Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="증상 검색..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {searchQuery ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">검색 결과</p>
              <div className="flex flex-wrap gap-2">
                {filteredSymptoms.map((symptom) => (
                  <button
                    key={symptom.id}
                    onClick={() => handleAddSymptom(symptom)}
                    disabled={selectedSymptoms.some((s) => s.id === symptom.id)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
                      selectedSymptoms.some((s) => s.id === symptom.id)
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                    )}
                  >
                    {selectedSymptoms.some((s) => s.id === symptom.id) ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {symptom.name}
                    <span className="text-xs text-gray-400">({symptom.category})</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {symptomCategories.map((category) => (
                <div key={category.name}>
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    {category.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {category.symptoms.map((symptom) => {
                      const isSelected = selectedSymptoms.some((s) => s.name === symptom)
                      return (
                        <button
                          key={symptom}
                          onClick={() => handleAddSymptom({ id: symptom, name: symptom, category: category.name })}
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
                            isSelected
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                          )}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
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

      {/* Results */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">
              추천 처방 ({results.length}건)
            </h2>
            <button
              onClick={() => setShowResults(false)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              증상 수정
            </button>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">선택한 증상에 맞는 처방을 찾지 못했습니다</p>
              <button
                onClick={() => setShowResults(false)}
                className="mt-4 text-indigo-600 hover:underline"
              >
                다른 증상으로 검색
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((formula, index) => (
                <div
                  key={formula.id}
                  className={cn(
                    'bg-white rounded-2xl shadow-sm border p-6 transition-all hover:shadow-md',
                    index === 0 ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-gray-100'
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {index === 0 && (
                        <span className="px-2 py-1 bg-indigo-500 text-white text-xs font-bold rounded-lg">
                          최적 추천
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-5 w-5 text-indigo-500" />
                          <h3 className="text-lg font-bold text-gray-900">{formula.name}</h3>
                          <span className="text-gray-500">{formula.hanja}</span>
                        </div>
                        <span className="text-sm text-gray-500">{formula.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-600">
                        {Math.round((formula.matchScore / selectedSymptoms.length) * 100)}%
                      </div>
                      <p className="text-xs text-gray-500">일치도</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">일치 증상</p>
                    <div className="flex flex-wrap gap-2">
                      {formula.matchedSymptoms.map((symptom, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-lg"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">주치</p>
                    <p className="text-gray-700">{formula.indication}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">주요 약재:</span>
                      {formula.keyHerbs.slice(0, 4).map((herb, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {herb}
                        </span>
                      ))}
                    </div>
                    <Link
                      to={`/formulas/${formula.id}`}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      상세 보기
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
