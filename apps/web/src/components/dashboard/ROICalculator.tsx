import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ROICalculatorProps {
  compact?: boolean
}

// Calculation constants
const TIME_SAVED_PER_SEARCH = 5 // minutes per AI search (분석 시간 + 문헌 검색 시간)
const AVERAGE_CONSULTATION_VALUE = 20000 // KRW (원) - 한의원 평균 진료비
const ADDITIONAL_PATIENTS_PER_HOUR = 2 // patients that can be seen with saved time

// 실제 요금제와 일치
const plans = [
  { name: 'Basic', price: 19900, queries: 50 },
  { name: 'Professional', price: 99000, queries: 300 },
  { name: 'Clinic', price: 199000, queries: -1 }, // -1 = unlimited
]

export function ROICalculator({ compact = false }: ROICalculatorProps) {
  // 기본값: Professional 플랜 기준 월 150회 (하루 약 5회)
  const [monthlySearches, setMonthlySearches] = useState(150)
  const [selectedPlan, setSelectedPlan] = useState<number>(1) // Professional default

  const calculations = useMemo(() => {
    const plan = plans[selectedPlan]
    const totalTimeSaved = monthlySearches * TIME_SAVED_PER_SEARCH // minutes
    const hoursSaved = totalTimeSaved / 60
    const additionalPatients = Math.floor(hoursSaved * ADDITIONAL_PATIENTS_PER_HOUR)
    const additionalRevenue = additionalPatients * AVERAGE_CONSULTATION_VALUE
    const roi = ((additionalRevenue - plan.price) / plan.price * 100)
    const breakEvenSearches = Math.ceil(plan.price / (TIME_SAVED_PER_SEARCH / 60 * ADDITIONAL_PATIENTS_PER_HOUR * AVERAGE_CONSULTATION_VALUE / 60))

    return {
      totalTimeSaved,
      hoursSaved,
      additionalPatients,
      additionalRevenue,
      roi,
      breakEvenSearches,
      monthlyCost: plan.price,
      netBenefit: additionalRevenue - plan.price,
    }
  }, [monthlySearches, selectedPlan])

  if (compact) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Calculator className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="font-bold text-gray-900">ROI 계산기</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500">월간 예상 AI 검색 횟수</label>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={monthlySearches}
              onChange={(e) => setMonthlySearches(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10회</span>
              <span className="font-semibold text-emerald-600">{monthlySearches}회</span>
              <span>500회</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-500">월 절약 시간</div>
              <div className="text-lg font-bold text-gray-900">
                {calculations.hoursSaved.toFixed(1)}시간
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <div className="text-xs text-gray-500">추가 수익 효과</div>
              <div className="text-lg font-bold text-emerald-600">
                +{calculations.additionalRevenue.toLocaleString()}원
              </div>
            </div>
          </div>

          <Link
            to="/dashboard/subscription"
            className="block w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors text-center"
          >
            플랜 선택하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-6 text-white">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-2xl">
            <Calculator className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">ROI 계산기</h2>
            <p className="text-emerald-100 mt-1">온고지신 AI 도입 시 예상 효과를 확인하세요</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                월간 예상 AI 검색 횟수
              </label>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={monthlySearches}
                onChange={(e) => setMonthlySearches(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>10회</span>
                <span className="text-lg font-bold text-emerald-600">{monthlySearches}회/월</span>
                <span>500회</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                요금제 선택
              </label>
              <div className="space-y-2">
                {plans.map((plan, idx) => (
                  <button
                    key={plan.name}
                    onClick={() => setSelectedPlan(idx)}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                      selectedPlan === idx
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        selectedPlan === idx
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300'
                      )}>
                        {selectedPlan === idx && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">{plan.name}</div>
                        <div className="text-xs text-gray-500">
                          {plan.queries === -1 ? '무제한 검색' : `월 ${plan.queries}회 검색`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {plan.price.toLocaleString()}원
                      </div>
                      <div className="text-xs text-gray-500">/월</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl text-sm">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-blue-700">
                <p className="font-medium">계산 기준</p>
                <ul className="mt-1 text-xs space-y-1 text-blue-600">
                  <li>• AI 검색 1회당 평균 {TIME_SAVED_PER_SEARCH}분 절약</li>
                  <li>• 1시간당 추가 진료 가능 환자: {ADDITIONAL_PATIENTS_PER_HOUR}명</li>
                  <li>• 환자 1인당 평균 진료비: {AVERAGE_CONSULTATION_VALUE.toLocaleString()}원</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 mb-4">예상 효과</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">월 절약 시간</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {calculations.hoursSaved.toFixed(1)}
                  <span className="text-lg font-normal text-gray-500">시간</span>
                </div>
              </div>

              <div className="p-5 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">추가 진료 가능</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {calculations.additionalPatients}
                  <span className="text-lg font-normal text-gray-500">명</span>
                </div>
              </div>

              <div className="p-5 bg-emerald-50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600">추가 수익 효과</span>
                </div>
                <div className="text-3xl font-bold text-emerald-600">
                  +{calculations.additionalRevenue.toLocaleString()}
                  <span className="text-lg font-normal text-emerald-500">원</span>
                </div>
              </div>

              <div className="p-5 bg-purple-50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-purple-600">ROI</span>
                </div>
                <div className={cn(
                  'text-3xl font-bold',
                  calculations.roi >= 0 ? 'text-purple-600' : 'text-red-500'
                )}>
                  {calculations.roi >= 0 ? '+' : ''}{calculations.roi.toFixed(0)}
                  <span className="text-lg font-normal">%</span>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-emerald-100">순수익 효과</span>
                <span className="text-3xl font-bold">
                  {calculations.netBenefit >= 0 ? '+' : ''}{calculations.netBenefit.toLocaleString()}원
                </span>
              </div>
              <div className="h-px bg-white/20 mb-4" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-emerald-100">추가 수익</span>
                  <span className="block font-semibold">+{calculations.additionalRevenue.toLocaleString()}원</span>
                </div>
                <div>
                  <span className="text-emerald-100">구독 비용</span>
                  <span className="block font-semibold">-{calculations.monthlyCost.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {/* Break-even info */}
            <div className="text-center text-sm text-gray-500">
              월 <span className="font-semibold text-gray-700">{calculations.breakEvenSearches}회</span> 이상 사용 시 손익분기점 도달
            </div>

            {/* CTA */}
            <Link
              to="/dashboard/subscription"
              className="block w-full py-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors text-center flex items-center justify-center gap-2"
            >
              <DollarSign className="h-5 w-5" />
              {plans[selectedPlan].name} 플랜 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ROICalculator
