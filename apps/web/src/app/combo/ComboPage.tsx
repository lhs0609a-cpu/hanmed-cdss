import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus,
  X,
  Calculator,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Leaf,
  BookOpen,
  Search,
  Shield,
} from 'lucide-react'
import api from '@/services/api'

interface Formula {
  id: string
  name: string
  hanja: string
  category: string
}

interface HerbSource {
  formula: string
  amount: string
}

interface TotalHerb {
  name: string
  totalAmount: string
  sources: string[]
  isDuplicate: boolean
}

interface DuplicateWarning {
  herbName: string
  totalAmount: string
  sources: HerbSource[]
  warning: string
}

interface ComboResult {
  isKnownCombo: boolean
  knownName?: string
  knownHanja?: string
  sourceFormulas: Formula[]
  totalHerbs: TotalHerb[]
  duplicateWarnings: DuplicateWarning[]
  indication?: string
  rationale?: string
}

export default function ComboPage() {
  const [searchParams] = useSearchParams()
  const [selectedFormulas, setSelectedFormulas] = useState<Formula[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Formula[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<ComboResult | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const formulaId = searchParams.get('formula')
    if (formulaId) {
      loadFormulaById(formulaId)
    }
  }, [searchParams])

  const loadFormulaById = async (id: string) => {
    try {
      const response = await api.get(`/formulas/${id}`)
      const formula = response.data
      addFormula({
        id: formula.id,
        name: formula.name,
        hanja: formula.hanja,
        category: formula.category,
      })
    } catch (error) {
      // 데모용
      const demoFormula = getDemoFormulas().find((f) => f.id === id)
      if (demoFormula) {
        addFormula(demoFormula)
      }
    }
  }

  const searchFormulas = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await api.get('/formulas/search', {
        params: { q: searchQuery, limit: 10 },
      })
      setSearchResults(response.data.data)
    } catch (error) {
      const filtered = getDemoFormulas().filter(
        (f) =>
          f.name.includes(searchQuery) ||
          f.hanja.includes(searchQuery)
      )
      setSearchResults(filtered)
    } finally {
      setIsSearching(false)
    }
  }

  const addFormula = (formula: Formula) => {
    if (!selectedFormulas.find((f) => f.id === formula.id)) {
      setSelectedFormulas([...selectedFormulas, formula])
    }
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const removeFormula = (id: string) => {
    setSelectedFormulas(selectedFormulas.filter((f) => f.id !== id))
    setResult(null)
  }

  const calculateCombo = async () => {
    if (selectedFormulas.length < 2) return

    setIsCalculating(true)
    try {
      const response = await api.post('/combos/calculate', {
        formulaIds: selectedFormulas.map((f) => f.id),
      })
      setResult(response.data)
    } catch (error) {
      // 데모용 결과
      setResult(getDemoResult(selectedFormulas))
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-7 w-7 text-purple-500" />
          합방 계산기
        </h1>
        <p className="mt-1 text-gray-500">
          여러 처방을 합쳐서 총 약재 구성을 계산합니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* 선택된 처방 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">선택된 처방</h2>

            <div className="space-y-3 mb-4">
              {selectedFormulas.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>처방을 추가해주세요</p>
                </div>
              ) : (
                selectedFormulas.map((formula) => (
                  <div
                    key={formula.id}
                    className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900">{formula.name}</p>
                        <p className="text-sm text-gray-500">{formula.hanja}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFormula(formula.id)}
                      className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5 text-purple-500" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 처방 추가 버튼 */}
            {!showSearch ? (
              <button
                onClick={() => setShowSearch(true)}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-purple-300 hover:text-purple-500 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                처방 추가
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchFormulas()}
                      placeholder="처방명 검색..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={searchFormulas}
                    disabled={isSearching}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                  >
                    {isSearching ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      '검색'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowSearch(false)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    취소
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {searchResults.map((formula) => (
                      <button
                        key={formula.id}
                        onClick={() => addFormula(formula)}
                        disabled={selectedFormulas.some((f) => f.id === formula.id)}
                        className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <p className="font-medium text-gray-900">{formula.name}</p>
                        <p className="text-sm text-gray-500">{formula.hanja} · {formula.category}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 계산 버튼 */}
          <button
            onClick={calculateCombo}
            disabled={selectedFormulas.length < 2 || isCalculating}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {isCalculating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                계산 중...
              </>
            ) : (
              <>
                <Calculator className="h-5 w-5" />
                합방 계산하기
              </>
            )}
          </button>

          {selectedFormulas.length > 0 && selectedFormulas.length < 2 && (
            <p className="text-sm text-amber-600 text-center">
              합방을 위해서는 최소 2개의 처방이 필요합니다
            </p>
          )}
        </div>

        {/* Result Section */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* 알려진 합방 여부 */}
              <div
                className={`rounded-2xl border-2 p-6 ${
                  result.isKnownCombo
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.isKnownCombo ? (
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  ) : (
                    <Calculator className="h-8 w-8 text-gray-400" />
                  )}
                  <div>
                    {result.isKnownCombo ? (
                      <>
                        <p className="text-sm text-emerald-600">알려진 합방입니다</p>
                        <p className="text-xl font-bold text-emerald-900">
                          {result.knownName} {result.knownHanja}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">새로운 합방 조합</p>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedFormulas.map((f) => f.name).join(' + ')}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {result.indication && (
                  <p className="mt-3 text-sm text-emerald-700 bg-emerald-100 rounded-lg p-3">
                    <span className="font-medium">적응증:</span> {result.indication}
                  </p>
                )}
              </div>

              {/* 중복 약재 경고 */}
              {result.duplicateWarnings.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
                  <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    중복 약재 알림
                  </h3>
                  <div className="space-y-2">
                    {result.duplicateWarnings.map((warning, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg">
                        <p className="font-medium text-amber-800">{warning.herbName}</p>
                        <p className="text-sm text-amber-600">
                          총 {warning.totalAmount} ({warning.sources.map(s => `${s.formula} ${s.amount}`).join(' + ')})
                        </p>
                        <p className="text-xs text-amber-500 mt-1">→ 용량 조절 고려 필요</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 총 구성 약재 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-teal-500" />
                  총 구성 약재 ({result.totalHerbs.length}종)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 font-medium text-gray-500">약재명</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-500">총용량</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-500">출처</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.totalHerbs.map((herb, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-gray-50 ${
                            herb.isDuplicate ? 'bg-amber-50' : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            <span className="flex items-center gap-2">
                              {herb.isDuplicate && (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              )}
                              {herb.name}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium">{herb.totalAmount}</td>
                          <td className="py-2 px-3 text-gray-500">
                            {herb.sources.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3">
                <Link
                  to="/dashboard/interactions"
                  className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="h-5 w-5" />
                  상호작용 검사
                </Link>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center">
                  <Calculator className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  합방 계산을 시작하세요
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  2개 이상의 처방을 선택하고<br />
                  합방 계산 버튼을 클릭하세요
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getDemoFormulas(): Formula[] {
  return [
    { id: '1', name: '소청룡탕', hanja: '小靑龍湯', category: '해표제' },
    { id: '2', name: '갈근탕', hanja: '葛根湯', category: '해표제' },
    { id: '3', name: '사군자탕', hanja: '四君子湯', category: '보익제' },
    { id: '4', name: '사물탕', hanja: '四物湯', category: '보익제' },
    { id: '5', name: '보중익기탕', hanja: '補中益氣湯', category: '보익제' },
    { id: '6', name: '소시호탕', hanja: '小柴胡湯', category: '이기제' },
    { id: '7', name: '반하후박탕', hanja: '半夏厚朴湯', category: '이기제' },
    { id: '8', name: '이진탕', hanja: '二陳湯', category: '화담제' },
  ]
}

function getDemoResult(formulas: Formula[]): ComboResult {
  // 소시호탕 + 반하후박탕 = 시박탕
  if (formulas.some(f => f.name === '소시호탕') && formulas.some(f => f.name === '반하후박탕')) {
    return {
      isKnownCombo: true,
      knownName: '시박탕',
      knownHanja: '柴朴湯',
      sourceFormulas: formulas,
      totalHerbs: [
        { name: '시호', totalAmount: '12g', sources: ['소시호탕'], isDuplicate: false },
        { name: '황금', totalAmount: '9g', sources: ['소시호탕'], isDuplicate: false },
        { name: '반하', totalAmount: '15g', sources: ['소시호탕', '반하후박탕'], isDuplicate: true },
        { name: '인삼', totalAmount: '6g', sources: ['소시호탕'], isDuplicate: false },
        { name: '후박', totalAmount: '9g', sources: ['반하후박탕'], isDuplicate: false },
        { name: '자소엽', totalAmount: '6g', sources: ['반하후박탕'], isDuplicate: false },
        { name: '복령', totalAmount: '12g', sources: ['반하후박탕'], isDuplicate: false },
        { name: '생강', totalAmount: '9g', sources: ['소시호탕', '반하후박탕'], isDuplicate: true },
        { name: '대조', totalAmount: '4매', sources: ['소시호탕'], isDuplicate: false },
        { name: '감초', totalAmount: '3g', sources: ['소시호탕'], isDuplicate: false },
      ],
      duplicateWarnings: [
        {
          herbName: '반하',
          totalAmount: '15g',
          sources: [{ formula: '소시호탕', amount: '9g' }, { formula: '반하후박탕', amount: '6g' }],
          warning: '반하 중복 - 총 15g (용량 조절 고려)',
        },
        {
          herbName: '생강',
          totalAmount: '9g',
          sources: [{ formula: '소시호탕', amount: '6g' }, { formula: '반하후박탕', amount: '3g' }],
          warning: '생강 중복 - 총 9g (용량 조절 고려)',
        },
      ],
      indication: '기울담결(氣鬱痰結), 인후 이물감, 흉협고만, 기침',
      rationale: '소시호탕의 소양병 치료 효능에 반하후박탕의 이기화담 효능을 합한 처방',
    }
  }

  // 사군자탕 + 사물탕 = 팔진탕
  if (formulas.some(f => f.name === '사군자탕') && formulas.some(f => f.name === '사물탕')) {
    return {
      isKnownCombo: true,
      knownName: '팔진탕',
      knownHanja: '八珍湯',
      sourceFormulas: formulas,
      totalHerbs: [
        { name: '인삼', totalAmount: '9g', sources: ['사군자탕'], isDuplicate: false },
        { name: '백출', totalAmount: '9g', sources: ['사군자탕'], isDuplicate: false },
        { name: '복령', totalAmount: '9g', sources: ['사군자탕'], isDuplicate: false },
        { name: '감초', totalAmount: '6g', sources: ['사군자탕'], isDuplicate: false },
        { name: '숙지황', totalAmount: '12g', sources: ['사물탕'], isDuplicate: false },
        { name: '당귀', totalAmount: '9g', sources: ['사물탕'], isDuplicate: false },
        { name: '백작약', totalAmount: '9g', sources: ['사물탕'], isDuplicate: false },
        { name: '천궁', totalAmount: '6g', sources: ['사물탕'], isDuplicate: false },
      ],
      duplicateWarnings: [],
      indication: '기혈양허(氣血兩虛), 면색창백, 권태무력, 심계실면',
      rationale: '사군자탕으로 기를 보하고 사물탕으로 혈을 보하는 기혈쌍보의 대표 처방',
    }
  }

  // 기타 조합
  return {
    isKnownCombo: false,
    sourceFormulas: formulas,
    totalHerbs: [
      { name: '마황', totalAmount: '9g', sources: [formulas[0].name], isDuplicate: false },
      { name: '계지', totalAmount: '6g', sources: [formulas[0].name], isDuplicate: false },
      { name: '감초', totalAmount: '6g', sources: formulas.map(f => f.name), isDuplicate: true },
    ],
    duplicateWarnings: [
      {
        herbName: '감초',
        totalAmount: '6g',
        sources: formulas.map(f => ({ formula: f.name, amount: '3g' })),
        warning: '감초 중복 - 총 6g (용량 조절 고려)',
      },
    ],
  }
}
