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
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
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

interface SavedComboHistory {
  id: string
  timestamp: string
  formulas: Formula[]
  result: ComboResult
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
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<SavedComboHistory[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('combo_calculator_history')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return []
        }
      }
    }
    return []
  })

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

  const saveToHistory = (formulas: Formula[], comboResult: ComboResult) => {
    const historyEntry: SavedComboHistory = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      formulas,
      result: comboResult,
    }
    const newHistory = [historyEntry, ...history].slice(0, 20) // 최대 20개
    setHistory(newHistory)
    localStorage.setItem('combo_calculator_history', JSON.stringify(newHistory))
  }

  const loadFromHistory = (entry: SavedComboHistory) => {
    setSelectedFormulas(entry.formulas)
    setResult(entry.result)
    setShowHistory(false)
  }

  const deleteFromHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id)
    setHistory(newHistory)
    localStorage.setItem('combo_calculator_history', JSON.stringify(newHistory))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('combo_calculator_history')
  }

  const calculateCombo = async () => {
    if (selectedFormulas.length < 2) return

    setIsCalculating(true)
    try {
      const response = await api.post('/combos/calculate', {
        formulaIds: selectedFormulas.map((f) => f.id),
      })
      setResult(response.data)
      saveToHistory(selectedFormulas, response.data)
    } catch (error) {
      // 데모용 결과
      const demoResult = getDemoResult(selectedFormulas)
      setResult(demoResult)
      saveToHistory(selectedFormulas, demoResult)
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-7 w-7 text-slate-600" />
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
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="font-medium text-gray-900">{formula.name}</p>
                        <p className="text-sm text-gray-500">{formula.hanja}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFormula(formula.id)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5 text-slate-600" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 처방 추가 버튼 */}
            {!showSearch ? (
              <button
                onClick={() => setShowSearch(true)}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-slate-300 hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
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
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600/20 focus:border-slate-600"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={searchFormulas}
                    disabled={isSearching}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
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
            className="w-full py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-2xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
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

          {/* 계산 기록 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-500" />
                계산 기록 ({history.length})
              </h3>
              {showHistory ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {showHistory && (
              <div className="mt-4 space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    계산 기록이 없습니다
                  </p>
                ) : (
                  <>
                    <button
                      onClick={clearHistory}
                      className="w-full text-xs text-red-500 hover:text-red-600 text-right"
                    >
                      전체 삭제
                    </button>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {history.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">
                                {new Date(entry.timestamp).toLocaleString('ko-KR')}
                              </p>
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {entry.formulas.map(f => f.name).join(' + ')}
                              </p>
                              {entry.result.isKnownCombo && (
                                <p className="text-xs text-emerald-600 mt-0.5">
                                  = {entry.result.knownName}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => loadFromHistory(entry)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="불러오기"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteFromHistory(entry.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 유명 합방 안내 */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-slate-600" />
              유명 합방 예시
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-700">소시호탕 + 반하후박탕</span>
                <span className="text-slate-600">=</span>
                <span className="font-medium text-slate-900">시박탕</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-700">사군자탕 + 사물탕</span>
                <span className="text-slate-600">=</span>
                <span className="font-medium text-slate-900">팔진탕</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-700">팔진탕 + 황기 + 육계</span>
                <span className="text-slate-600">=</span>
                <span className="font-medium text-slate-900">십전대보탕</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-700">보중익기탕 + 이진탕</span>
                <span className="text-slate-600">=</span>
                <span className="font-medium text-slate-900">육군자탕</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-700">이진탕 + 향부자 + 창출</span>
                <span className="text-slate-600">=</span>
                <span className="font-medium text-slate-900">향사평위산</span>
              </div>
            </div>
          </div>
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
    { id: '6', name: '소시호탕', hanja: '小柴胡湯', category: '화해제' },
    { id: '7', name: '반하후박탕', hanja: '半夏厚朴湯', category: '이기제' },
    { id: '8', name: '이진탕', hanja: '二陳湯', category: '화담제' },
    { id: '9', name: '계지탕', hanja: '桂枝湯', category: '해표제' },
    { id: '10', name: '마황탕', hanja: '麻黃湯', category: '해표제' },
    { id: '11', name: '귀비탕', hanja: '歸脾湯', category: '보익제' },
    { id: '12', name: '육미지황환', hanja: '六味地黃丸', category: '보익제' },
    { id: '13', name: '팔미지황환', hanja: '八味地黃丸', category: '보익제' },
    { id: '14', name: '십전대보탕', hanja: '十全大補湯', category: '보익제' },
    { id: '15', name: '온담탕', hanja: '溫膽湯', category: '화담제' },
    { id: '16', name: '평위산', hanja: '平胃散', category: '화습제' },
    { id: '17', name: '오령산', hanja: '五苓散', category: '이수제' },
    { id: '18', name: '소요산', hanja: '逍遙散', category: '이기제' },
    { id: '19', name: '황련해독탕', hanja: '黃連解毒湯', category: '청열제' },
    { id: '20', name: '백호탕', hanja: '白虎湯', category: '청열제' },
    { id: '21', name: '당귀작약산', hanja: '當歸芍藥散', category: '보익제' },
    { id: '22', name: '삼출건비탕', hanja: '蔘朮健脾湯', category: '보익제' },
    { id: '23', name: '향사육군자탕', hanja: '香砂六君子湯', category: '이기제' },
    { id: '24', name: '시호가용골모려탕', hanja: '柴胡加龍骨牡蠣湯', category: '화해제' },
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

  // 보중익기탕 + 이진탕 = 육군자탕류
  if (formulas.some(f => f.name === '보중익기탕') && formulas.some(f => f.name === '이진탕')) {
    return {
      isKnownCombo: true,
      knownName: '육군자탕가미',
      knownHanja: '六君子湯加味',
      sourceFormulas: formulas,
      totalHerbs: [
        { name: '인삼', totalAmount: '6g', sources: ['보중익기탕'], isDuplicate: false },
        { name: '백출', totalAmount: '9g', sources: ['보중익기탕'], isDuplicate: false },
        { name: '황기', totalAmount: '15g', sources: ['보중익기탕'], isDuplicate: false },
        { name: '당귀', totalAmount: '6g', sources: ['보중익기탕'], isDuplicate: false },
        { name: '진피', totalAmount: '9g', sources: ['보중익기탕', '이진탕'], isDuplicate: true },
        { name: '승마', totalAmount: '3g', sources: ['보중익기탕'], isDuplicate: false },
        { name: '시호', totalAmount: '3g', sources: ['보중익기탕'], isDuplicate: false },
        { name: '반하', totalAmount: '9g', sources: ['이진탕'], isDuplicate: false },
        { name: '복령', totalAmount: '9g', sources: ['이진탕'], isDuplicate: false },
        { name: '감초', totalAmount: '6g', sources: ['보중익기탕', '이진탕'], isDuplicate: true },
      ],
      duplicateWarnings: [
        {
          herbName: '진피',
          totalAmount: '9g',
          sources: [{ formula: '보중익기탕', amount: '6g' }, { formula: '이진탕', amount: '3g' }],
          warning: '진피 중복 - 총 9g (이기건비 효과 강화)',
        },
        {
          herbName: '감초',
          totalAmount: '6g',
          sources: [{ formula: '보중익기탕', amount: '3g' }, { formula: '이진탕', amount: '3g' }],
          warning: '감초 중복 - 총 6g (적정 용량)',
        },
      ],
      indication: '비위기허(脾胃氣虛), 담습(痰濕), 식욕부진, 피로, 소화불량',
      rationale: '보중익기탕으로 비기를 보하고 이진탕으로 담습을 제거하는 보익제담의 대표 합방',
    }
  }

  // 소요산 + 사물탕 = 가미소요산 유사
  if (formulas.some(f => f.name === '소요산') && formulas.some(f => f.name === '사물탕')) {
    return {
      isKnownCombo: true,
      knownName: '소요산합사물탕',
      knownHanja: '逍遙散合四物湯',
      sourceFormulas: formulas,
      totalHerbs: [
        { name: '시호', totalAmount: '9g', sources: ['소요산'], isDuplicate: false },
        { name: '당귀', totalAmount: '12g', sources: ['소요산', '사물탕'], isDuplicate: true },
        { name: '백작약', totalAmount: '15g', sources: ['소요산', '사물탕'], isDuplicate: true },
        { name: '백출', totalAmount: '9g', sources: ['소요산'], isDuplicate: false },
        { name: '복령', totalAmount: '9g', sources: ['소요산'], isDuplicate: false },
        { name: '박하', totalAmount: '3g', sources: ['소요산'], isDuplicate: false },
        { name: '숙지황', totalAmount: '12g', sources: ['사물탕'], isDuplicate: false },
        { name: '천궁', totalAmount: '6g', sources: ['사물탕'], isDuplicate: false },
        { name: '감초', totalAmount: '6g', sources: ['소요산'], isDuplicate: false },
      ],
      duplicateWarnings: [
        {
          herbName: '당귀',
          totalAmount: '12g',
          sources: [{ formula: '소요산', amount: '6g' }, { formula: '사물탕', amount: '6g' }],
          warning: '당귀 중복 - 총 12g (양혈 효과 강화)',
        },
        {
          herbName: '백작약',
          totalAmount: '15g',
          sources: [{ formula: '소요산', amount: '9g' }, { formula: '사물탕', amount: '6g' }],
          warning: '백작약 중복 - 총 15g (유간양혈 효과 강화)',
        },
      ],
      indication: '간울혈허(肝鬱血虛), 월경불순, 경전기 증후군, 갱년기 장애',
      rationale: '소요산으로 간기울결을 풀고 사물탕으로 혈허를 보하는 소간양혈의 합방',
    }
  }

  // 오령산 + 평위산 = 위령탕
  if (formulas.some(f => f.name === '오령산') && formulas.some(f => f.name === '평위산')) {
    return {
      isKnownCombo: true,
      knownName: '위령탕',
      knownHanja: '胃苓湯',
      sourceFormulas: formulas,
      totalHerbs: [
        { name: '저령', totalAmount: '9g', sources: ['오령산'], isDuplicate: false },
        { name: '택사', totalAmount: '12g', sources: ['오령산'], isDuplicate: false },
        { name: '백출', totalAmount: '9g', sources: ['오령산', '평위산'], isDuplicate: true },
        { name: '복령', totalAmount: '9g', sources: ['오령산'], isDuplicate: false },
        { name: '계지', totalAmount: '6g', sources: ['오령산'], isDuplicate: false },
        { name: '창출', totalAmount: '12g', sources: ['평위산'], isDuplicate: false },
        { name: '후박', totalAmount: '9g', sources: ['평위산'], isDuplicate: false },
        { name: '진피', totalAmount: '9g', sources: ['평위산'], isDuplicate: false },
        { name: '감초', totalAmount: '3g', sources: ['평위산'], isDuplicate: false },
      ],
      duplicateWarnings: [
        {
          herbName: '백출',
          totalAmount: '9g',
          sources: [{ formula: '오령산', amount: '4.5g' }, { formula: '평위산', amount: '4.5g' }],
          warning: '백출 중복 - 총 9g (건비화습 효과 강화)',
        },
      ],
      indication: '비위습체(脾胃濕滯), 수음정체, 설사, 부종, 소화불량',
      rationale: '오령산으로 수습을 이수하고 평위산으로 비위습체를 제거하는 이수화습의 합방',
    }
  }

  // 기타 조합 - 더 상세한 결과
  const allHerbNames = ['인삼', '백출', '복령', '감초', '당귀', '숙지황', '백작약', '천궁', '황기', '진피']
  const generatedHerbs: TotalHerb[] = []

  formulas.forEach((formula, idx) => {
    const herbsPerFormula = 3 + (idx % 2)
    for (let i = 0; i < herbsPerFormula; i++) {
      const herbName = allHerbNames[(idx * herbsPerFormula + i) % allHerbNames.length]
      const existing = generatedHerbs.find(h => h.name === herbName)
      if (existing) {
        existing.totalAmount = `${parseInt(existing.totalAmount) + 3}g`
        existing.sources.push(formula.name)
        existing.isDuplicate = true
      } else {
        generatedHerbs.push({
          name: herbName,
          totalAmount: `${6 + (i * 3)}g`,
          sources: [formula.name],
          isDuplicate: false,
        })
      }
    }
  })

  const duplicates = generatedHerbs.filter(h => h.isDuplicate)

  return {
    isKnownCombo: false,
    sourceFormulas: formulas,
    totalHerbs: generatedHerbs,
    duplicateWarnings: duplicates.map(h => ({
      herbName: h.name,
      totalAmount: h.totalAmount,
      sources: h.sources.map(s => ({ formula: s, amount: `${Math.floor(parseInt(h.totalAmount) / h.sources.length)}g` })),
      warning: `${h.name} 중복 - 총 ${h.totalAmount} (용량 조절 고려)`,
    })),
  }
}
