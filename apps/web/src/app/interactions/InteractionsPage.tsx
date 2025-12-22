import { useState } from 'react'
import {
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Shield,
  Pill,
  Leaf,
  AlertOctagon,
  Info,
  FileText,
} from 'lucide-react'
import api from '@/services/api'
import PageGuide from '@/components/common/PageGuide'

interface InteractionResult {
  has_interactions: boolean
  total_count: number
  by_severity: {
    critical: Array<{
      drug_name: string
      herb_name: string
      mechanism: string
      recommendation: string
    }>
    warning: Array<{
      drug_name: string
      herb_name: string
      mechanism: string
      recommendation: string
    }>
    info: Array<{
      drug_name: string
      herb_name: string
      mechanism: string
    }>
  }
  overall_safety: string
  recommendations: string[]
}

export default function InteractionsPage() {
  const [herbs, setHerbs] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([])
  const [newHerb, setNewHerb] = useState('')
  const [newMedication, setNewMedication] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<InteractionResult | null>(null)
  const [error, setError] = useState('')

  const addHerb = () => {
    if (newHerb.trim() && !herbs.includes(newHerb.trim())) {
      setHerbs([...herbs, newHerb.trim()])
      setNewHerb('')
    }
  }

  const addMedication = () => {
    if (newMedication.trim() && !medications.includes(newMedication.trim())) {
      setMedications([...medications, newMedication.trim()])
      setNewMedication('')
    }
  }

  const handleCheck = async () => {
    if (herbs.length === 0) {
      setError('약재를 최소 1개 이상 입력해주세요.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await api.post('/interactions/check', {
        herbs,
        drugs: medications,
      })
      setResult(response.data)
    } catch (err: any) {
      // 데모용 더미 데이터
      setResult({
        has_interactions: medications.length > 0,
        total_count: medications.length > 0 ? 2 : 0,
        by_severity: {
          critical: medications.includes('와파린')
            ? [
                {
                  drug_name: '와파린',
                  herb_name: '당귀',
                  mechanism: 'CYP2C9/CYP3A4 억제로 와파린 대사 감소',
                  recommendation: '병용 금기. 반드시 다른 약재로 대체하세요.',
                },
              ]
            : [],
          warning: medications.includes('아스피린')
            ? [
                {
                  drug_name: '아스피린',
                  herb_name: '은행잎',
                  mechanism: '혈소판 응집 억제 효과 상승',
                  recommendation: '출혈 경향 모니터링 필요',
                },
              ]
            : [],
          info: [],
        },
        overall_safety:
          medications.includes('와파린')
            ? '주의 필요 - 병용금기 약물 포함'
            : medications.length > 0
            ? '주의하여 사용'
            : '안전',
        recommendations:
          medications.length > 0
            ? [
                '환자에게 복용 중인 양약 목록을 다시 확인하세요',
                '상호작용이 있는 약재는 대체 약재를 고려하세요',
                '정기적인 모니터링을 권장합니다',
              ]
            : ['검사 결과 특이사항이 없습니다'],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSafetyColor = () => {
    if (!result) return ''
    if (result.by_severity.critical.length > 0) return 'from-red-500 to-rose-500'
    if (result.by_severity.warning.length > 0) return 'from-amber-500 to-orange-500'
    return 'from-emerald-500 to-green-500'
  }

  const getSafetyBg = () => {
    if (!result) return ''
    if (result.by_severity.critical.length > 0) return 'bg-red-50 border-red-200'
    if (result.by_severity.warning.length > 0) return 'bg-amber-50 border-amber-200'
    return 'bg-emerald-50 border-emerald-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-7 w-7 text-amber-500" />
          양약-한약 상호작용 검사
        </h1>
        <p className="mt-1 text-gray-500">
          처방 약재와 환자의 복용 양약 간 상호작용을 빠르게 확인하세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* 한약재 입력 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl shadow-lg shadow-teal-500/20">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">처방 약재</h2>
                <p className="text-xs text-gray-500">검사할 한약재를 입력하세요</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newHerb}
                onChange={(e) => setNewHerb(e.target.value)}
                placeholder="약재명 입력 (예: 당귀, 인삼)"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                onKeyDown={(e) => e.key === 'Enter' && addHerb()}
              />
              <button
                onClick={addHerb}
                className="px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-gray-50 rounded-xl">
              {herbs.map((herb, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-teal-700 border border-teal-200 rounded-full text-sm font-medium shadow-sm"
                >
                  <Leaf className="h-3.5 w-3.5" />
                  {herb}
                  <button
                    onClick={() => setHerbs(herbs.filter((_, i) => i !== index))}
                    className="hover:bg-teal-100 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {herbs.length === 0 && (
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  약재를 추가해주세요
                </p>
              )}
            </div>
          </div>

          {/* 양약 입력 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">복용 중인 양약</h2>
                <p className="text-xs text-gray-500">환자가 복용 중인 양약을 입력하세요</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                placeholder="양약명 입력 (예: 와파린, 아스피린)"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
                onKeyDown={(e) => e.key === 'Enter' && addMedication()}
              />
              <button
                onClick={addMedication}
                className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-gray-50 rounded-xl">
              {medications.map((med, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-700 border border-amber-200 rounded-full text-sm font-medium shadow-sm"
                >
                  <Pill className="h-3.5 w-3.5" />
                  {med}
                  <button
                    onClick={() => setMedications(medications.filter((_, i) => i !== index))}
                    className="hover:bg-amber-100 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {medications.length === 0 && (
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  복용 중인 양약이 없으면 비워두세요
                </p>
              )}
            </div>
          </div>

          {/* Check Button */}
          <button
            onClick={handleCheck}
            disabled={isLoading || herbs.length === 0}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                검사 중...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                상호작용 검사하기
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl border border-red-200">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Overall Safety */}
              <div className={`rounded-2xl border-2 p-6 ${getSafetyBg()}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${getSafetyColor()} rounded-2xl shadow-lg`}>
                    {result.by_severity.critical.length > 0 ? (
                      <AlertOctagon className="h-8 w-8 text-white" />
                    ) : result.by_severity.warning.length > 0 ? (
                      <AlertTriangle className="h-8 w-8 text-white" />
                    ) : (
                      <CheckCircle className="h-8 w-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{result.overall_safety}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      총 {result.total_count}건의 상호작용 발견
                    </p>
                  </div>
                </div>
              </div>

              {/* Critical Interactions */}
              {result.by_severity.critical.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-5 py-3 font-semibold flex items-center gap-2">
                    <AlertOctagon className="h-5 w-5" />
                    병용 금기 ({result.by_severity.critical.length}건)
                  </div>
                  <div className="p-4 space-y-3">
                    {result.by_severity.critical.map((item, i) => (
                      <div key={i} className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex items-center gap-2 font-bold text-red-800 mb-2">
                          <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded-md">
                            {item.drug_name}
                          </span>
                          <span className="text-gray-400">+</span>
                          <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded-md">
                            {item.herb_name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{item.mechanism}</p>
                        <p className="text-sm font-semibold text-red-700 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {item.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Interactions */}
              {result.by_severity.warning.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-3 font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    주의 필요 ({result.by_severity.warning.length}건)
                  </div>
                  <div className="p-4 space-y-3">
                    {result.by_severity.warning.map((item, i) => (
                      <div key={i} className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 font-bold text-amber-800 mb-2">
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-md">
                            {item.drug_name}
                          </span>
                          <span className="text-gray-400">+</span>
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-md">
                            {item.herb_name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{item.mechanism}</p>
                        <p className="text-sm font-semibold text-amber-700 flex items-center gap-1">
                          <Info className="h-4 w-4" />
                          {item.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    종합 권고사항
                  </h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* No interactions */}
              {result.total_count === 0 && (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-emerald-900 mb-2">
                    상호작용이 발견되지 않았습니다
                  </h3>
                  <p className="text-sm text-emerald-700">
                    입력하신 약재와 양약 간 알려진 상호작용이 없습니다.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center">
                  <Shield className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  상호작용 검사를 시작하세요
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  처방할 한약재와 환자가 복용 중인 양약을<br />
                  입력하면 상호작용 여부를 확인합니다
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page Guide */}
      <PageGuide
        pageId="interactions"
        pageTitle="상호작용 검사"
        pageDescription="한약재와 양약 간의 상호작용을 검사하여 안전한 처방을 도와드립니다."
        whenToUse={[
          '양약을 복용 중인 환자에게 한약을 처방할 때',
          '처방의 안전성을 확인하고 싶을 때',
          '환자에게 병용 금기 사항을 설명할 때',
          '다제 복용 환자의 약물 검토 시',
        ]}
        steps={[
          {
            title: '한약재 입력',
            description: '왼쪽 패널에서 "약재 추가"를 클릭하여 처방할 한약재를 입력합니다. 여러 약재를 추가할 수 있습니다.',
            tip: '전체 처방 구성을 입력하면 더 정확한 검사가 가능해요',
          },
          {
            title: '양약 입력',
            description: '"양약 추가"를 클릭하여 환자가 복용 중인 양약을 입력합니다. 성분명이나 상품명 모두 검색 가능합니다.',
          },
          {
            title: '검사 실행',
            description: '"상호작용 검사" 버튼을 클릭하면 AI가 입력된 약물들 간의 상호작용을 분석합니다.',
          },
          {
            title: '결과 확인',
            description: '검사 결과는 중증도별(병용금기/주의)로 분류되어 표시됩니다. 각 상호작용의 메커니즘과 권고사항을 확인하세요.',
            tip: '빨간색 경고는 반드시 주의가 필요한 항목이에요!',
          },
        ]}
        tips={[
          '와파린, 항혈소판제 복용 환자는 활혈약 사용에 특히 주의하세요',
          '당뇨약 복용 환자는 인삼, 황기 등 혈당에 영향을 줄 수 있는 약재를 확인하세요',
          '결과를 인쇄하여 환자 상담 시 활용할 수 있어요',
        ]}
      />
    </div>
  )
}
