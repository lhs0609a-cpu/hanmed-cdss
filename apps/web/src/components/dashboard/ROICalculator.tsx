import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  ArrowRight,
  Info,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type PaidTier = 'basic' | 'professional' | 'clinic'

interface ROICalculatorProps {
  compact?: boolean
  /**
   * 플랜을 고르고 눌렀을 때 할 일.
   *
   * 이게 없던 시절에는 버튼이 /dashboard/subscription 으로 가는 Link 였다.
   * 그런데 이 계산기는 그 페이지 안에만 놓여 있어서, 지금 보고 있는 페이지로
   * 다시 가는 링크였다 — 눌러도 아무 일이 없었다. 결제 시작 버튼이 한 번도
   * 동작한 적이 없다는 뜻이다.
   *
   * 그래서 부모가 실제 구독 흐름을 넘겨주게 했다. 안 넘기면 예전처럼
   * 요금제 페이지로 보낸다(다른 화면에 놓을 때를 위해 남겨 둔다).
   */
  onSelectPlan?: (tier: PaidTier) => void
}

/* ─── 가정값 ───────────────────────────────────────────────────────────
 *
 * 전부 가정이다. 임상연구나 실측에서 나온 수치가 아니다. 그래서 화면
 * 하단에 그렇게 적어 둔다 — 근거 없는 숫자를 근거 있는 척 보여주면
 * 그건 계산기가 아니라 광고다.
 *
 * 예전 모델은 "절약한 시간 × 시간당 2명 × 진료비" 하나뿐이었다. 월 140회
 * 검색에 +460,000원, ROI 2,212% 가 나왔다. 시간이 남으면 그만큼 환자가
 * 저절로 찬다는 가정인데, 실제로는 예약이 있어야 환자가 온다. 지키지 못할
 * 숫자를 보여주면 결제 다음 달에 해지된다.
 */

/** 검색 1회로 아끼는 시간(분). 문헌 찾고 변증 정리하는 시간. */
const MINUTES_SAVED_PER_SEARCH = 5

/**
 * 아낀 시간 중 실제로 진료로 채워지는 비율.
 *
 * 가장 중요한 보수 계수다. 시간이 비어도 그 시간에 올 환자가 예약돼 있어야
 * 매출이 된다. 나머지는 차트 정리·응대·휴식으로 간다. 3할만 잡는다.
 */
const TIME_TO_VISIT_CONVERSION = 0.3

/** 1시간에 더 볼 수 있는 환자 수. */
const PATIENTS_PER_HOUR = 2

/**
 * 재방문율 개선 폭(%p).
 *
 * 변증 근거를 화면으로 함께 보여주면 환자가 납득하고 다시 온다는 가정이다.
 * 효과를 주장하는 것이 아니라 가정이고, 그래서 아주 낮게 잡았다. 재방문율
 * 2%p 는 환자 100명에 2명이다.
 */
const REVISIT_LIFT_POINTS = 0.02

/** 부가세. 화면의 19,900원은 별도 표기이고 실제로 빠져나가는 돈은 10% 더 붙는다. */
const VAT = 0.1

/** 실제 요금제와 일치 — 단일 진실 공급원은 백엔드 PLAN_PRICES. */
const plans: Array<{ name: string; tier: PaidTier; price: number; queries: number }> = [
  { name: 'Basic', tier: 'basic', price: 19900, queries: 200 },
  { name: 'Pro', tier: 'professional', price: 49000, queries: 1000 },
  { name: 'Clinic', tier: 'clinic', price: 149000, queries: 5000 },
]

const won = (n: number) => Math.round(n).toLocaleString()

export function ROICalculator({ compact = false, onSelectPlan }: ROICalculatorProps) {
  const [monthlySearches, setMonthlySearches] = useState(150)
  const [monthlyPatients, setMonthlyPatients] = useState(200)
  const [consultationFee, setConsultationFee] = useState(20000)
  const [selectedPlan, setSelectedPlan] = useState<number>(1)

  const calc = useMemo(() => {
    const plan = plans[selectedPlan]
    // 실제로 계좌에서 빠져나가는 금액으로 센다. 표시가가 아니라.
    const monthlyCost = Math.round(plan.price * (1 + VAT))

    const hoursSaved = (monthlySearches * MINUTES_SAVED_PER_SEARCH) / 60
    const billableHours = hoursSaved * TIME_TO_VISIT_CONVERSION
    // 사람은 소수로 오지 않는다. 내림해야 부풀지 않는다.
    const additionalPatients = Math.floor(billableHours * PATIENTS_PER_HOUR)
    const visitRevenue = additionalPatients * consultationFee

    const revisitPatients = Math.floor(monthlyPatients * REVISIT_LIFT_POINTS)
    const revisitRevenue = revisitPatients * consultationFee

    const additionalRevenue = visitRevenue + revisitRevenue
    const netBenefit = additionalRevenue - monthlyCost
    const roi = monthlyCost > 0 ? (netBenefit / monthlyCost) * 100 : 0

    // 손익분기 — 검색 횟수로 환산한다.
    //
    // 재방문 수익은 검색 횟수와 무관하게 들어오므로 먼저 빼고, 남은 금액을
    // 검색 1회가 만드는 수익으로 나눈다. 예전 식은 여기에 /60 이 한 번 더
    // 들어가 60배가 어긋나 있었다 — 화면이 "이미 44만원 이득" 이라면서
    // 동시에 "월 359회를 넘겨야 손익분기" 라고 말하고 있었다.
    const revenuePerSearch =
      (MINUTES_SAVED_PER_SEARCH / 60) *
      TIME_TO_VISIT_CONVERSION *
      PATIENTS_PER_HOUR *
      consultationFee
    const remaining = Math.max(monthlyCost - revisitRevenue, 0)
    const breakEvenSearches =
      remaining === 0 ? 0 : Math.ceil(remaining / Math.max(revenuePerSearch, 1))

    return {
      plan,
      monthlyCost,
      hoursSaved,
      billableHours,
      additionalPatients,
      visitRevenue,
      revisitPatients,
      revisitRevenue,
      additionalRevenue,
      netBenefit,
      roi,
      breakEvenSearches,
    }
  }, [monthlySearches, monthlyPatients, consultationFee, selectedPlan])

  const startPlan = () => onSelectPlan?.(calc.plan.tier)

  /** 결제 시작 버튼. 부모가 흐름을 주면 그걸 부르고, 없으면 요금제 페이지로. */
  const Cta = ({ className, label }: { className: string; label: string }) =>
    onSelectPlan ? (
      <button type="button" onClick={startPlan} className={className}>
        <DollarSign className="h-5 w-5" />
        {label}
        <ArrowRight className="h-4 w-4" />
      </button>
    ) : (
      <Link to="/dashboard/subscription" className={className}>
        <DollarSign className="h-5 w-5" />
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    )

  const Disclaimer = ({ short = false }: { short?: boolean }) => (
    <p className="text-[11px] leading-relaxed text-neutral-400">
      {short ? (
        <>가정에 기반한 추정치입니다. 임상 효과나 수익을 보장하지 않습니다.</>
      ) : (
        <>
          이 계산은 위에 적은 가정을 그대로 곱한 <strong>추정치</strong>입니다. 임상연구나
          실제 사용자 데이터로 검증한 수치가 아니며, 치료 효과·재방문율·수익 증가를
          보장하지 않습니다. 실제 결과는 진료 과목, 환자 구성, 지역, 예약 상황에 따라
          크게 달라지고 효과가 없을 수도 있습니다. 결제 판단의 근거로 삼기 전에 각
          가정이 원장님 한의원에 맞는 값인지 직접 확인해 주세요.
        </>
      )}
    </p>
  )

  if (compact) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Calculator className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900">예상 효과 계산기</h3>
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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10회</span>
              <span className="font-semibold text-blue-600">{monthlySearches}회</span>
              <span>500회</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-500">월 절약 시간</div>
              <div className="text-lg font-bold text-gray-900">
                {calc.hoursSaved.toFixed(1)}시간
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <div className="text-xs text-gray-500">추가 수익(추정)</div>
              <div className="text-lg font-bold text-blue-600">
                +{won(calc.additionalRevenue)}원
              </div>
            </div>
          </div>

          <Cta
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            label="플랜 선택하기"
          />
          <Disclaimer short />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-md border border-neutral-200 overflow-hidden">
      <div className="px-8 py-6 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              예상 효과 계산기
            </h2>
            <p className="text-[13px] text-neutral-500 mt-0.5">
              가정을 바꿔 가며 도입 효과를 가늠해 봅니다.
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 입력 */}
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-neutral-700">
                월간 예상 AI 검색 횟수
              </label>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={monthlySearches}
                onChange={(e) => setMonthlySearches(parseInt(e.target.value))}
                className="w-full h-2 mt-3 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
              />
              <div className="flex justify-between text-xs text-neutral-400 mt-1">
                <span>10회</span>
                <span className="text-base font-bold text-neutral-900">
                  {monthlySearches}회/월
                </span>
                <span>500회</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700">월 환자 수</label>
              <input
                type="range"
                min={20}
                max={1000}
                step={10}
                value={monthlyPatients}
                onChange={(e) => setMonthlyPatients(parseInt(e.target.value))}
                className="w-full h-2 mt-3 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
              />
              <div className="flex justify-between text-xs text-neutral-400 mt-1">
                <span>20명</span>
                <span className="text-base font-bold text-neutral-900">
                  {monthlyPatients}명/월
                </span>
                <span>1,000명</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700">
                환자 1인당 평균 진료비
              </label>
              <input
                type="range"
                min={5000}
                max={100000}
                step={1000}
                value={consultationFee}
                onChange={(e) => setConsultationFee(parseInt(e.target.value))}
                className="w-full h-2 mt-3 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
              />
              <div className="flex justify-between text-xs text-neutral-400 mt-1">
                <span>5천원</span>
                <span className="text-base font-bold text-neutral-900">
                  {won(consultationFee)}원
                </span>
                <span>10만원</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-neutral-700 mb-3">요금제 선택</div>
              <div className="space-y-2">
                {plans.map((plan, idx) => (
                  <button
                    key={plan.tier}
                    type="button"
                    onClick={() => setSelectedPlan(idx)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-md border text-left transition-colors',
                      selectedPlan === idx
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-300',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border flex items-center justify-center',
                          selectedPlan === idx
                            ? 'border-neutral-900 bg-neutral-900'
                            : 'border-neutral-300',
                        )}
                      >
                        {selectedPlan === idx && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900">{plan.name}</div>
                        <div className="text-xs text-neutral-500">
                          월 {plan.queries.toLocaleString()}회 검색
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-neutral-900">
                        {won(plan.price)}원
                      </div>
                      <div className="text-xs text-neutral-500">/월 · 부가세 별도</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md bg-neutral-50 border border-neutral-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-semibold text-neutral-700">계산에 쓴 가정</span>
              </div>
              <ul className="space-y-1 text-[13px] text-neutral-600">
                <li>· AI 검색 1회당 {MINUTES_SAVED_PER_SEARCH}분 절약</li>
                <li>
                  · 절약한 시간 중 실제 진료로 이어지는 비율{' '}
                  {Math.round(TIME_TO_VISIT_CONVERSION * 100)}% — 시간이 비어도 예약이
                  있어야 매출이 됩니다
                </li>
                <li>· 1시간당 추가 진료 가능 {PATIENTS_PER_HOUR}명</li>
                <li>
                  · 재방문율 개선 +{(REVISIT_LIFT_POINTS * 100).toFixed(0)}%p — 환자 100명에
                  {' '}{(REVISIT_LIFT_POINTS * 100).toFixed(0)}명
                </li>
                <li>· 구독료는 부가세를 더한 실제 결제액으로 계산</li>
              </ul>
            </div>
          </div>

          {/* 결과 */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-neutral-700">예상 효과</div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-neutral-200 p-4">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                  <Clock className="h-3.5 w-3.5" />월 절약 시간
                </div>
                <div className="text-2xl font-bold text-neutral-900">
                  {calc.hoursSaved.toFixed(1)}
                  <span className="text-sm font-medium text-neutral-500 ml-1">시간</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  이 중 진료로 {calc.billableHours.toFixed(1)}시간
                </div>
              </div>
              <div className="rounded-md border border-neutral-200 p-4">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                  <Users className="h-3.5 w-3.5" />추가 진료 가능
                </div>
                <div className="text-2xl font-bold text-neutral-900">
                  {calc.additionalPatients}
                  <span className="text-sm font-medium text-neutral-500 ml-1">명</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  재방문 증가 {calc.revisitPatients}명
                </div>
              </div>
            </div>

            {/* 수익이 어디서 오는지 나눠 보여준다. 합계만 크게 띄우면
                무엇을 믿어야 할지 알 수 없다. */}
            <div className="rounded-md border border-neutral-200 divide-y divide-neutral-100">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-neutral-600">시간 절약 → 추가 진료</span>
                </div>
                <span className="text-sm font-semibold text-neutral-900">
                  +{won(calc.visitRevenue)}원
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-neutral-600">재방문율 개선</span>
                </div>
                <span className="text-sm font-semibold text-neutral-900">
                  +{won(calc.revisitRevenue)}원
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
                <span className="text-sm font-medium text-neutral-700">추가 수익 합계</span>
                <span className="text-sm font-bold text-neutral-900">
                  +{won(calc.additionalRevenue)}원
                </span>
              </div>
            </div>

            <div className="rounded-md bg-neutral-900 text-white p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-neutral-300">순효과(추정)</span>
                <span
                  className={cn(
                    'text-2xl font-bold',
                    calc.netBenefit >= 0 ? 'text-white' : 'text-red-300',
                  )}
                >
                  {calc.netBenefit >= 0 ? '+' : '−'}
                  {won(Math.abs(calc.netBenefit))}원
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-neutral-400">추가 수익</div>
                  <div className="font-semibold">+{won(calc.additionalRevenue)}원</div>
                </div>
                <div>
                  <div className="text-neutral-400">결제액(VAT 포함)</div>
                  <div className="font-semibold">−{won(calc.monthlyCost)}원</div>
                </div>
                <div>
                  <div className="text-neutral-400">투자 대비</div>
                  <div className="font-semibold">
                    {calc.roi >= 0 ? '+' : ''}
                    {calc.roi.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-neutral-500">
              {calc.breakEvenSearches === 0 ? (
                <>재방문 증가분만으로 구독료를 넘습니다</>
              ) : (
                <>
                  월{' '}
                  <span className="font-semibold text-neutral-700">
                    {calc.breakEvenSearches}회
                  </span>{' '}
                  이상 검색하면 구독료를 넘습니다
                </>
              )}
            </div>

            <Cta
              className="w-full py-4 bg-neutral-900 text-white font-semibold rounded-md hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              label={`${calc.plan.name} 플랜 시작하기`}
            />

            <Disclaimer />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ROICalculator
