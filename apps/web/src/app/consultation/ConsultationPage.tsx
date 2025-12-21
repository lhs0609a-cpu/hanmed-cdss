import { useState } from 'react'
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
} from 'lucide-react'
import api from '@/services/api'

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
    } catch (err: any) {
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
        <div className="lg:col-span-3 space-y-4">
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
                        <button className="flex-1 py-2 px-4 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors">
                          이 처방 선택
                        </button>
                        <button className="py-2 px-4 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1">
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
                  <button className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1">
                    검사하기
                    <ChevronRight className="h-4 w-4" />
                  </button>
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
    </div>
  )
}
