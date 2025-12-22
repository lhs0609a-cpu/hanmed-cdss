import { useState, useMemo } from 'react'
import {
  Calculator,
  Baby,
  User,
  AlertTriangle,
  Info,
  Scale,
  Calendar,
  Heart,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PatientType = 'adult' | 'child' | 'infant' | 'pregnant' | 'elderly'

interface DosageResult {
  adjustedDose: number
  adjustmentRatio: number
  warnings: string[]
  recommendations: string[]
}

interface HerbDosage {
  name: string
  standardDose: number
  unit: string
  maxDose: number
  pregnancyCategory: 'safe' | 'caution' | 'contraindicated'
  pediatricAllowed: boolean
  elderlyAdjustment: number
  notes?: string
}

const commonHerbs: HerbDosage[] = [
  { name: '인삼', standardDose: 6, unit: 'g', maxDose: 15, pregnancyCategory: 'caution', pediatricAllowed: true, elderlyAdjustment: 0.8 },
  { name: '황기', standardDose: 15, unit: 'g', maxDose: 30, pregnancyCategory: 'safe', pediatricAllowed: true, elderlyAdjustment: 1.0 },
  { name: '당귀', standardDose: 10, unit: 'g', maxDose: 15, pregnancyCategory: 'caution', pediatricAllowed: true, elderlyAdjustment: 0.9 },
  { name: '감초', standardDose: 6, unit: 'g', maxDose: 10, pregnancyCategory: 'safe', pediatricAllowed: true, elderlyAdjustment: 0.8 },
  { name: '백출', standardDose: 10, unit: 'g', maxDose: 15, pregnancyCategory: 'safe', pediatricAllowed: true, elderlyAdjustment: 1.0 },
  { name: '복령', standardDose: 15, unit: 'g', maxDose: 30, pregnancyCategory: 'safe', pediatricAllowed: true, elderlyAdjustment: 1.0 },
  { name: '마황', standardDose: 6, unit: 'g', maxDose: 10, pregnancyCategory: 'contraindicated', pediatricAllowed: false, elderlyAdjustment: 0.5, notes: '심혈관 질환 주의' },
  { name: '부자', standardDose: 3, unit: 'g', maxDose: 9, pregnancyCategory: 'contraindicated', pediatricAllowed: false, elderlyAdjustment: 0.5, notes: '독성 주의, 포제 필수' },
  { name: '대황', standardDose: 6, unit: 'g', maxDose: 15, pregnancyCategory: 'contraindicated', pediatricAllowed: false, elderlyAdjustment: 0.6, notes: '설사 유발' },
  { name: '반하', standardDose: 9, unit: 'g', maxDose: 15, pregnancyCategory: 'contraindicated', pediatricAllowed: true, elderlyAdjustment: 0.8 },
  { name: '시호', standardDose: 10, unit: 'g', maxDose: 20, pregnancyCategory: 'caution', pediatricAllowed: true, elderlyAdjustment: 0.9 },
  { name: '작약', standardDose: 10, unit: 'g', maxDose: 30, pregnancyCategory: 'safe', pediatricAllowed: true, elderlyAdjustment: 1.0 },
]

export default function DosageCalculatorPage() {
  const [patientType, setPatientType] = useState<PatientType>('adult')
  const [age, setAge] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [pregnancyWeek, setPregnancyWeek] = useState<string>('')
  const [selectedHerb, setSelectedHerb] = useState<HerbDosage | null>(null)
  const [customDose, setCustomDose] = useState<string>('')

  const patientTypeInfo = {
    adult: { label: '성인', icon: User, color: 'blue' },
    child: { label: '소아 (3-12세)', icon: Baby, color: 'green' },
    infant: { label: '영아 (0-3세)', icon: Baby, color: 'purple' },
    pregnant: { label: '임산부', icon: Heart, color: 'pink' },
    elderly: { label: '노인 (65세+)', icon: User, color: 'amber' },
  }

  const calculateDosage = useMemo((): DosageResult | null => {
    if (!selectedHerb) return null

    const baseDose = customDose ? parseFloat(customDose) : selectedHerb.standardDose
    if (isNaN(baseDose)) return null

    let adjustedDose = baseDose
    let adjustmentRatio = 1.0
    const warnings: string[] = []
    const recommendations: string[] = []

    switch (patientType) {
      case 'infant':
        if (!selectedHerb.pediatricAllowed) {
          warnings.push('영아에게 권장되지 않는 약재입니다')
          adjustedDose = 0
        } else {
          const ageNum = parseFloat(age) || 1
          // 영아: 연령 기반 계산 (1세 = 성인의 1/8)
          adjustmentRatio = Math.min(0.25, (ageNum + 1) / 12)
          adjustedDose = baseDose * adjustmentRatio
          recommendations.push('소량씩 나누어 투여')
          recommendations.push('복용 후 상태 관찰 필수')
        }
        break

      case 'child':
        if (!selectedHerb.pediatricAllowed) {
          warnings.push('소아에게 권장되지 않는 약재입니다')
          adjustedDose = 0
        } else {
          const ageNum = parseFloat(age) || 6
          const weightNum = parseFloat(weight) || (ageNum * 2 + 8)
          // Young's formula 변형: (나이 / (나이 + 12)) * 성인용량
          const ageRatio = ageNum / (ageNum + 12)
          // 체중 기반: 체중(kg) / 60
          const weightRatio = weightNum / 60
          adjustmentRatio = Math.min(ageRatio, weightRatio)
          adjustedDose = baseDose * adjustmentRatio
          recommendations.push('체중에 따른 조절 필요')
        }
        break

      case 'pregnant':
        if (selectedHerb.pregnancyCategory === 'contraindicated') {
          warnings.push('임신 중 금기 약재입니다')
          adjustedDose = 0
        } else if (selectedHerb.pregnancyCategory === 'caution') {
          warnings.push('임신 중 주의가 필요한 약재입니다')
          adjustmentRatio = 0.7
          adjustedDose = baseDose * adjustmentRatio
          recommendations.push('의사 상담 후 복용')

          const weekNum = parseFloat(pregnancyWeek) || 20
          if (weekNum < 12) {
            warnings.push('임신 초기에는 특히 주의가 필요합니다')
            adjustmentRatio = 0.5
            adjustedDose = baseDose * adjustmentRatio
          }
        } else {
          adjustmentRatio = 0.8
          adjustedDose = baseDose * adjustmentRatio
          recommendations.push('안전한 약재이나 최소 용량 권장')
        }
        break

      case 'elderly':
        adjustmentRatio = selectedHerb.elderlyAdjustment
        adjustedDose = baseDose * adjustmentRatio
        if (adjustmentRatio < 1) {
          recommendations.push('간/신 기능 저하 가능성 고려')
        }
        if (selectedHerb.notes) {
          warnings.push(selectedHerb.notes)
        }
        break

      default:
        adjustedDose = baseDose
        adjustmentRatio = 1.0
    }

    // 최대 용량 체크
    if (adjustedDose > selectedHerb.maxDose) {
      warnings.push(`최대 권장 용량(${selectedHerb.maxDose}${selectedHerb.unit})을 초과합니다`)
    }

    return {
      adjustedDose: Math.round(adjustedDose * 10) / 10,
      adjustmentRatio: Math.round(adjustmentRatio * 100) / 100,
      warnings,
      recommendations,
    }
  }, [selectedHerb, patientType, age, weight, pregnancyWeek, customDose])

  const handleReset = () => {
    setSelectedHerb(null)
    setCustomDose('')
    setAge('')
    setWeight('')
    setPregnancyWeek('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-7 w-7 text-blue-500" />
          용량 계산기
        </h1>
        <p className="mt-1 text-gray-500">
          환자 특성에 따른 한약재 용량을 계산합니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Type */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">환자 유형</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(patientTypeInfo).map(([type, info]) => {
                const Icon = info.icon
                return (
                  <button
                    key={type}
                    onClick={() => setPatientType(type as PatientType)}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-center',
                      patientType === type
                        ? `border-${info.color}-500 bg-${info.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Icon className={cn(
                      'h-6 w-6 mx-auto mb-2',
                      patientType === type ? `text-${info.color}-500` : 'text-gray-400'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      patientType === type ? `text-${info.color}-700` : 'text-gray-600'
                    )}>
                      {info.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Patient Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">환자 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(patientType === 'child' || patientType === 'infant') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      나이 (세)
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder={patientType === 'infant' ? '0-3' : '3-12'}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Scale className="inline h-4 w-4 mr-1" />
                      체중 (kg)
                    </label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="체중 입력"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
              {patientType === 'pregnant' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Heart className="inline h-4 w-4 mr-1" />
                    임신 주수
                  </label>
                  <input
                    type="number"
                    value={pregnancyWeek}
                    onChange={(e) => setPregnancyWeek(e.target.value)}
                    placeholder="1-40"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                  />
                </div>
              )}
              {patientType === 'elderly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    나이 (세)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="65+"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Herb Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">약재 선택</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
              {commonHerbs.map((herb) => (
                <button
                  key={herb.name}
                  onClick={() => {
                    setSelectedHerb(herb)
                    setCustomDose('')
                  }}
                  className={cn(
                    'p-3 rounded-xl text-sm font-medium transition-all',
                    selectedHerb?.name === herb.name
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600',
                    herb.pregnancyCategory === 'contraindicated' && patientType === 'pregnant' && 'opacity-50'
                  )}
                >
                  {herb.name}
                  {herb.pregnancyCategory === 'contraindicated' && (
                    <AlertTriangle className="inline h-3 w-3 ml-1 text-red-400" />
                  )}
                </button>
              ))}
            </div>

            {selectedHerb && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">{selectedHerb.name}</span>
                  <span className="text-sm text-gray-500">
                    표준 용량: {selectedHerb.standardDose}{selectedHerb.unit}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    기준 용량 ({selectedHerb.unit})
                  </label>
                  <input
                    type="number"
                    value={customDose || selectedHerb.standardDose}
                    onChange={(e) => setCustomDose(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            초기화
          </button>
        </div>

        {/* Right Column - Result */}
        <div className="space-y-4">
          {/* Calculation Result */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-500" />
              계산 결과
            </h3>

            {calculateDosage && selectedHerb ? (
              <div className="space-y-4">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <p className="text-sm text-blue-600 mb-1">권장 용량</p>
                  <p className="text-4xl font-bold text-blue-700">
                    {calculateDosage.adjustedDose}
                    <span className="text-lg ml-1">{selectedHerb.unit}</span>
                  </p>
                  <p className="text-sm text-blue-500 mt-2">
                    (성인 용량의 {Math.round(calculateDosage.adjustmentRatio * 100)}%)
                  </p>
                </div>

                {calculateDosage.warnings.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <p className="font-medium text-red-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      주의사항
                    </p>
                    <ul className="space-y-1">
                      {calculateDosage.warnings.map((warning, i) => (
                        <li key={i} className="text-sm text-red-700">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {calculateDosage.recommendations.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      권장사항
                    </p>
                    <ul className="space-y-1">
                      {calculateDosage.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-blue-700">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                약재를 선택하면 용량이 계산됩니다
              </p>
            )}
          </div>

          {/* Herb Info */}
          {selectedHerb && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">{selectedHerb.name} 정보</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">표준 용량</span>
                  <span className="font-medium">{selectedHerb.standardDose}{selectedHerb.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">최대 용량</span>
                  <span className="font-medium">{selectedHerb.maxDose}{selectedHerb.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">임신 안전성</span>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded',
                    selectedHerb.pregnancyCategory === 'safe' && 'bg-green-100 text-green-700',
                    selectedHerb.pregnancyCategory === 'caution' && 'bg-yellow-100 text-yellow-700',
                    selectedHerb.pregnancyCategory === 'contraindicated' && 'bg-red-100 text-red-700'
                  )}>
                    {selectedHerb.pregnancyCategory === 'safe' && '안전'}
                    {selectedHerb.pregnancyCategory === 'caution' && '주의'}
                    {selectedHerb.pregnancyCategory === 'contraindicated' && '금기'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">소아 사용</span>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded',
                    selectedHerb.pediatricAllowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {selectedHerb.pediatricAllowed ? '가능' : '금기'}
                  </span>
                </div>
                {selectedHerb.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-amber-700">
                      <AlertTriangle className="inline h-4 w-4 mr-1" />
                      {selectedHerb.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 leading-relaxed">
              <Info className="inline h-4 w-4 mr-1" />
              이 계산기는 참고용이며, 실제 처방은 반드시 전문 한의사의 진단과 판단에 따라야 합니다.
              개인의 상태에 따라 용량 조절이 필요할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
