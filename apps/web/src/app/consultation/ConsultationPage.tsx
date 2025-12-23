import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  User,
  Pill,
  Activity,
  Brain,
  ChevronRight,
  Info,
  Shield,
  BookOpen,
  Beaker,
  AlertTriangle,
  FileText,
  Copy,
  Check,
} from 'lucide-react'
import api from '@/services/api'
import { logError } from '@/lib/errors'
import TourGuide, { TourRestartButton } from '@/components/common/TourGuide'

const consultationTourSteps = [
  {
    target: '[data-tour="patient-info"]',
    title: '환자 정보 입력',
    content: '먼저 환자의 이름, 나이, 성별을 입력하세요. 정확한 정보가 더 좋은 AI 추천에 도움됩니다.',
    placement: 'right' as const,
    tip: '기존 환자는 환자관리 메뉴에서 선택할 수 있어요',
  },
  {
    target: '[data-tour="symptom-input"]',
    title: '증상 추가하기',
    content: '"+ 증상 추가" 버튼을 눌러 환자의 증상을 입력하세요. 각 증상의 심한 정도(1-10)도 함께 설정합니다.',
    placement: 'right' as const,
    tip: '주증상을 먼저 입력하고 부증상을 추가하면 더 정확해요',
  },
  {
    target: '[data-tour="analyze-button"]',
    title: 'AI 분석 시작',
    content: '증상 입력이 완료되면 이 버튼을 클릭하세요. AI가 증상을 분석하고 최적의 처방을 추천합니다.',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="result-area"]',
    title: '추천 결과 확인',
    content: 'AI가 추천한 처방 목록이 여기에 표시됩니다. 각 처방의 신뢰도, 구성 약재, 추천 이유를 확인하세요.',
    placement: 'left' as const,
    tip: '"상세정보" 버튼으로 처방의 출전, 가감법 등을 볼 수 있어요',
  },
]

interface Symptom {
  name: string
  severity: number
}

interface Recommendation {
  formula_name: string
  confidence_score: number
  herbs: Array<{ name: string; amount: string; role: string }>
  rationale: string
}

// 처방 상세 정보 데이터
const formulaDetails: Record<string, {
  hanja: string
  source: string
  category: string
  indication: string
  pathogenesis: string
  contraindications: string[]
  modifications: Array<{ condition: string; action: string }>
  modernUsage: string[]
  cautions: string[]
}> = {
  '이중탕(理中湯)': {
    hanja: '理中湯',
    source: '상한론(傷寒論)',
    category: '온리제(溫裏劑)',
    indication: '비위허한증(脾胃虛寒證). 자리청희(自利清稀), 복만불식(腹滿不食), 구토복통(嘔吐腹痛), 설질담백(舌質淡白), 맥침세(脈沈細)',
    pathogenesis: '중초허한(中焦虛寒)으로 인해 비위의 운화기능이 약화되어 발생합니다. 비양부족으로 음식을 소화시키지 못하고, 수습이 정체되어 설사와 복통이 나타납니다.',
    contraindications: [
      '음허화왕(陰虛火旺) 환자',
      '실열(實熱) 증상이 있는 경우',
      '임산부 (건강 성분 주의)',
    ],
    modifications: [
      { condition: '복통이 심하면', action: '인삼을 증량하고 백작약 6g 가미' },
      { condition: '구토가 심하면', action: '반하 9g, 생강 6g 가미' },
      { condition: '설사가 심하면', action: '백출을 창출로 대체, 복령 9g 가미' },
      { condition: '수족냉증이 심하면', action: '부자 3g 가미 (부자이중탕)' },
    ],
    modernUsage: [
      '만성 위염, 위궤양',
      '기능성 소화불량',
      '과민성 대장 증후군 (설사형)',
      '만성 장염',
    ],
    cautions: [
      '건강(乾薑)은 열성이 강하므로 복용 중 열감이 있으면 용량 조절',
      '장기 복용 시 정기적인 상태 평가 필요',
      '와파린 복용자는 인삼 상호작용 주의',
    ],
  },
  '보중익기탕(補中益氣湯)': {
    hanja: '補中益氣湯',
    source: '비위론(脾胃論)',
    category: '보익제(補益劑) - 보기제(補氣劑)',
    indication: '비위기허(脾胃氣虛), 중기하함(中氣下陷). 기단나언(氣短懶言), 사지권태(四肢倦怠), 식소복창(食少腹脹), 자한(自汗), 내장하수(內臟下垂)',
    pathogenesis: '비기허약(脾氣虛弱)으로 청양불승(清陽不升)하여 중기하함(中氣下陷)이 발생합니다. 기허로 인해 피로, 숨참, 자한 등의 증상이 나타납니다.',
    contraindications: [
      '음허화왕(陰虛火旺) 환자',
      '간양상항(肝陽上亢) 환자',
      '고혈압 환자 주의 (승마, 시호)',
    ],
    modifications: [
      { condition: '두통이 있으면', action: '만형자 9g, 천궁 6g 가미' },
      { condition: '기침이 있으면', action: '행인 9g, 오미자 6g 가미' },
      { condition: '불면이 있으면', action: '산조인 12g, 용안육 9g 가미' },
      { condition: '자궁하수가 있으면', action: '승마, 시호 증량' },
    ],
    modernUsage: [
      '만성 피로 증후군',
      '위하수, 자궁하수, 탈항',
      '반복성 감기',
      '수술 후 회복기',
    ],
    cautions: [
      '황기는 혈압을 올릴 수 있으므로 고혈압 환자 주의',
      '감기 급성기에는 사용을 피함',
      '인삼은 다른 약물과 상호작용 가능성이 있음',
    ],
  },
}

const roleColors: Record<string, string> = {
  '군': 'bg-red-100 text-red-700 border-red-200',
  '신': 'bg-amber-100 text-amber-700 border-amber-200',
  '좌': 'bg-blue-100 text-blue-700 border-blue-200',
  '사': 'bg-green-100 text-green-700 border-green-200',
}

export default function ConsultationPage() {
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [newSymptom, setNewSymptom] = useState('')
  const [constitution, setConstitution] = useState('')
  const [currentMedications, setCurrentMedications] = useState<string[]>([])
  const [newMedication, setNewMedication] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')

  // 상세 정보 모달
  const [selectedFormula, setSelectedFormula] = useState<Recommendation | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [copied, setCopied] = useState(false)

  // 처방 선택 확인 모달
  const [showSelectConfirm, setShowSelectConfirm] = useState(false)
  const [selectedForSelect, setSelectedForSelect] = useState<Recommendation | null>(null)

  // Tour guide
  const [showTour, setShowTour] = useState(true)

  const addSymptom = () => {
    if (newSymptom.trim()) {
      setSymptoms([...symptoms, { name: newSymptom.trim(), severity: 5 }])
      setNewSymptom('')
    }
  }

  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index))
  }

  const addMedication = () => {
    if (newMedication.trim()) {
      setCurrentMedications([...currentMedications, newMedication.trim()])
      setNewMedication('')
    }
  }

  const removeMedication = (index: number) => {
    setCurrentMedications(currentMedications.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!chiefComplaint.trim()) {
      setError('주소증을 입력해주세요.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await api.post('/prescriptions/recommend', {
        chiefComplaint,
        symptoms,
        constitution: constitution || undefined,
        currentMedications: currentMedications.length > 0 ? currentMedications : undefined,
      })

      setRecommendations(response.data.recommendations || [])
      setAnalysis(response.data.analysis || '')
    } catch (err: unknown) {
      logError(err, 'ConsultationPage')
      // 데모용 더미 데이터
      setRecommendations([
        {
          formula_name: '이중탕(理中湯)',
          confidence_score: 0.92,
          herbs: [
            { name: '인삼', amount: '6g', role: '군' },
            { name: '백출', amount: '9g', role: '신' },
            { name: '건강', amount: '6g', role: '좌' },
            { name: '감초', amount: '3g', role: '사' },
          ],
          rationale: '비위허한증으로 인한 소화불량과 복부냉증에 적합합니다. 온중거한, 보기건비의 효능이 있어 현재 증상에 가장 부합합니다.',
        },
        {
          formula_name: '보중익기탕(補中益氣湯)',
          confidence_score: 0.78,
          herbs: [
            { name: '황기', amount: '12g', role: '군' },
            { name: '인삼', amount: '6g', role: '신' },
            { name: '백출', amount: '6g', role: '좌' },
            { name: '감초', amount: '3g', role: '사' },
          ],
          rationale: '기허 증상이 있는 경우 고려할 수 있는 처방입니다. 보기승양의 효과가 있습니다.',
        },
      ])
      setAnalysis('환자는 비기허증(脾氣虛證)으로 판단됩니다. 소화기 기능이 약화되어 음식 소화가 원활하지 않고, 비위의 양기가 부족하여 복부 냉감이 나타나는 것으로 보입니다.\n\n치료 원칙: 온중건비(溫中健脾), 보기화중(補氣和中)\n\n주의사항: 환자가 양약을 복용 중인 경우 상호작용 검사를 권장합니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const openDetailModal = (rec: Recommendation) => {
    setSelectedFormula(rec)
    setShowDetailModal(true)
  }

  const handleSelectFormula = (rec: Recommendation) => {
    setSelectedForSelect(rec)
    setShowSelectConfirm(true)
  }

  const confirmSelectFormula = () => {
    // 처방 선택 완료 - 실제로는 환자 차트에 저장
    setShowSelectConfirm(false)
    alert(`${selectedForSelect?.formula_name} 처방이 선택되었습니다.\n환자 차트에 기록됩니다.`)
  }

  const copyToClipboard = () => {
    if (!selectedFormula) return

    const detail = formulaDetails[selectedFormula.formula_name]
    const herbsText = selectedFormula.herbs.map(h => `${h.name} ${h.amount}`).join(', ')

    const text = `【${selectedFormula.formula_name}】
출전: ${detail?.source || '미상'}
구성: ${herbsText}
적응증: ${detail?.indication || selectedFormula.rationale}
`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-teal-500" />
            AI 진료 어시스턴트
          </h1>
          <p className="mt-1 text-gray-500">
            환자 증상을 입력하면 6,000건의 치험례 기반으로 최적의 처방을 추천합니다
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chief Complaint */}
          <div data-tour="patient-info" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-teal-100 rounded-xl">
                <User className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">주소증</h2>
                <p className="text-xs text-gray-500">환자가 호소하는 주요 증상</p>
              </div>
            </div>
            <textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="예: 소화가 안되고 배가 차갑습니다. 밥을 먹으면 더부룩하고..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all resize-none"
              rows={4}
            />
          </div>

          {/* Symptoms */}
          <div data-tour="symptom-input" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">세부 증상</h2>
                <p className="text-xs text-gray-500">관련 증상을 태그로 추가</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)}
                placeholder="증상 입력 후 Enter"
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
              />
              <button
                onClick={addSymptom}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {symptoms.map((symptom, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-sm font-medium"
                >
                  {symptom.name}
                  <button
                    onClick={() => removeSymptom(index)}
                    className="hover:bg-teal-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {symptoms.length === 0 && (
                <span className="text-sm text-gray-400">증상을 추가해주세요</span>
              )}
            </div>
          </div>

          {/* Constitution & Medications */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Pill className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">추가 정보</h2>
                <p className="text-xs text-gray-500">체질 및 복용 약물</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">체질</label>
                <select
                  value={constitution}
                  onChange={(e) => setConstitution(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all appearance-none"
                >
                  <option value="">미상 / 선택 안함</option>
                  <option value="태양인">태양인</option>
                  <option value="태음인">태음인</option>
                  <option value="소양인">소양인</option>
                  <option value="소음인">소음인</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">복용 중인 양약</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="양약 추가"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && addMedication()}
                  />
                  <button
                    onClick={addMedication}
                    className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentMedications.map((med, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-sm font-medium"
                    >
                      {med}
                      <button
                        onClick={() => removeMedication(index)}
                        className="hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            data-tour="analyze-button"
            onClick={handleSubmit}
            disabled={isLoading || !chiefComplaint.trim()}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                AI가 분석 중입니다...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                AI 처방 추천 받기
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div data-tour="result-area" className="lg:col-span-3 space-y-4">
          {recommendations.length > 0 ? (
            <>
              {/* AI Analysis */}
              {analysis && (
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl shadow-lg shadow-teal-500/20">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2">AI 변증 분석</h3>
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{analysis}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    추천 처방
                  </h2>
                  <span className="text-xs text-gray-500">{recommendations.length}개의 처방 추천</span>
                </div>

                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`group p-5 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                        index === 0
                          ? 'border-teal-200 bg-teal-50/50 hover:shadow-teal-500/10'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {index === 0 && (
                              <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-md">
                                BEST
                              </span>
                            )}
                            <h3 className="font-bold text-lg text-gray-900">{rec.formula_name}</h3>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                          rec.confidence_score >= 0.9
                            ? 'bg-emerald-100 text-emerald-700'
                            : rec.confidence_score >= 0.7
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {(rec.confidence_score * 100).toFixed(0)}%
                        </div>
                      </div>

                      {/* Herbs with roles */}
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">구성 약재</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.herbs.map((herb, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium border ${
                                roleColors[herb.role] || 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              <span className="font-bold">{herb.name}</span>
                              <span className="text-xs opacity-70">{herb.amount}</span>
                              <span className="ml-1 text-[10px] px-1 py-0.5 bg-white/50 rounded">
                                {herb.role}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Rationale */}
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 leading-relaxed">{rec.rationale}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSelectFormula(rec)}
                          className="flex-1 py-2 px-4 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
                        >
                          이 처방 선택
                        </button>
                        <button
                          onClick={() => openDetailModal(rec)}
                          className="py-2 px-4 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <Info className="h-4 w-4" />
                          상세 정보
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Check Banner */}
              {currentMedications.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-center gap-4">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">상호작용 검사 권장</p>
                    <p className="text-sm text-amber-700">
                      환자가 복용 중인 양약과의 상호작용을 확인하세요
                    </p>
                  </div>
                  <Link
                    to="/interactions"
                    className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1"
                  >
                    검사하기
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  AI 처방 추천을 받아보세요
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  환자의 주소증과 증상을 입력하면<br />
                  6,000건의 치험례를 분석하여 최적의 처방을 추천합니다
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 처방 상세 정보 모달 */}
      {showDetailModal && selectedFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedFormula.formula_name}</h2>
                  <p className="text-teal-100 text-sm">
                    {formulaDetails[selectedFormula.formula_name]?.source || '출전 미상'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="복사"
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
              {/* 구성 약재 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-teal-500" />
                  구성 약재
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedFormula.herbs.map((herb, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border-2 ${roleColors[herb.role] || 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{herb.name}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-white/50 rounded">{herb.role}</span>
                      </div>
                      <span className="text-sm opacity-70">{herb.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {formulaDetails[selectedFormula.formula_name] && (
                <>
                  {/* 주치 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      주치 (적응증)
                    </h3>
                    <p className="text-gray-700 bg-blue-50 p-4 rounded-xl leading-relaxed">
                      {formulaDetails[selectedFormula.formula_name].indication}
                    </p>
                  </div>

                  {/* 병기 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      병기 설명
                    </h3>
                    <p className="text-gray-700 bg-purple-50 p-4 rounded-xl leading-relaxed">
                      {formulaDetails[selectedFormula.formula_name].pathogenesis}
                    </p>
                  </div>

                  {/* 가감법 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-amber-500" />
                      가감법
                    </h3>
                    <div className="space-y-2">
                      {formulaDetails[selectedFormula.formula_name].modifications.map((mod, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                          <span className="text-amber-600 font-medium whitespace-nowrap">{mod.condition}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-700">{mod.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 현대 임상 응용 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-emerald-500" />
                      현대 임상 응용
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {formulaDetails[selectedFormula.formula_name].modernUsage.map((usage, i) => (
                        <span key={i} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                          {usage}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 금기 및 주의사항 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      금기 및 주의사항
                    </h3>
                    <div className="bg-red-50 p-4 rounded-xl space-y-2">
                      {formulaDetails[selectedFormula.formula_name].contraindications.map((ci, i) => (
                        <div key={i} className="flex items-start gap-2 text-red-700">
                          <span className="text-red-500">•</span>
                          <span>{ci}</span>
                        </div>
                      ))}
                      <div className="border-t border-red-200 pt-2 mt-3">
                        {formulaDetails[selectedFormula.formula_name].cautions.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 text-amber-700">
                            <span className="text-amber-500">⚠</span>
                            <span className="text-sm">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* AI 추천 근거 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-500" />
                  AI 추천 근거
                </h3>
                <p className="text-gray-700 bg-teal-50 p-4 rounded-xl leading-relaxed">
                  {selectedFormula.rationale}
                </p>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  handleSelectFormula(selectedFormula)
                }}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
              >
                이 처방 선택
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 처방 선택 확인 모달 */}
      {showSelectConfirm && selectedForSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-teal-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">처방 선택 확인</h2>
              <p className="text-gray-500 mt-2">
                <span className="font-bold text-teal-600">{selectedForSelect.formula_name}</span>을(를)
                <br />선택하시겠습니까?
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">선택한 처방 정보:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedForSelect.herbs.map((herb, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-white rounded border">
                    {herb.name} {herb.amount}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSelectConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={confirmSelectFormula}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tour Guide */}
      {showTour && (
        <TourGuide
          tourId="consultation"
          steps={consultationTourSteps}
          onComplete={() => setShowTour(false)}
        />
      )}

      {/* Restart Tour Button */}
      <TourRestartButton tourId="consultation" onClick={() => setShowTour(true)} />
    </div>
  )
}
