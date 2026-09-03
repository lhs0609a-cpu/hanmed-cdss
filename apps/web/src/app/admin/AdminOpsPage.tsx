import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import { formatKRW } from '@/lib/format'

/**
 * 운영 지표.
 *
 * 첫 화면에 열두 개를 넘기지 않는다. 그 이상이면 아무도 훑지 않고, 훑지
 * 않는 숫자는 없는 것과 같다. 자세히는 아래 표에서 본다.
 *
 * 숫자마다 무엇으로 센 값인지 밝힌다. 리텐션이 왜 낮은지 물었을 때
 * "무엇을 활동으로 봤나" 를 답할 수 없으면 그 지표는 못 쓴다.
 */

interface Overview {
  users: {
    total: number
    newToday: number
    newThisWeek: number
    newThisMonth: number
    active: number
    leaving: number
    licensePending: number
  }
  activity: { dau: number; wau: number; mau: number; stickiness: number }
  subscriptions: {
    byTier: Record<string, number>
    paidUsers: number
    active: number
    trialing: number
    pastDue: number
    canceled: number
    cancelScheduled: number
  }
  revenue: {
    mrr: number
    arr: number
    total: number
    thisMonth: number
    lastMonth: number
    refunded: number
    paidCount: number
    failedCount: number
    failedThisWeek: number
    arpu: number
  }
  trial: { started: number; converted: number; conversionRate: number }
  errors: { open: number; open5xx: number; last24h: number }
}

interface Cohort {
  week: string
  size: number
  retention: Array<{ offset: number; users: number; rate: number }>
}

interface ErrorRow {
  id: string
  statusCode: number
  method: string
  path: string
  message: string
  count: number
  firstSeenAt: string
  lastSeenAt: string
  resolvedAt: string | null
}

function Tile({
  label,
  value,
  sub,
  tone = 'default',
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
  icon?: React.ComponentType<{ className?: string }>
}) {
  const toneClass =
    tone === 'bad'
      ? 'text-red-600'
      : tone === 'warn'
        ? 'text-amber-600'
        : tone === 'good'
          ? 'text-emerald-600'
          : 'text-gray-900'
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-gray-300" />}
      </div>
      <p className={`mt-1 text-[22px] font-bold tabular-nums ${toneClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-gray-400">{sub}</p>}
    </div>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[17px] font-bold text-gray-900">{title}</h2>
        {hint && <p className="text-[12px] text-gray-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export default function AdminOpsPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [funnel, setFunnel] = useState<Record<string, number> | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<
    Array<{ month: string; amount: string; payments: number; payers: number }>
  >([])
  const [errors, setErrors] = useState<ErrorRow[]>([])
  const [usage, setUsage] = useState<{
    since: string | null
    rows: Array<{ type: string; events: number; users: number }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [o, r, f, rt, e, u] = await Promise.all([
        api.get('/admin/ops/overview'),
        api.get('/admin/ops/retention', { params: { weeks: 8 } }),
        api.get('/admin/ops/funnel'),
        api.get('/admin/ops/revenue-trend', { params: { months: 12 } }).catch(() => ({ data: [] })),
        api.get('/admin/ops/errors', { params: { status: 'open', limit: 30 } }),
        api.get('/admin/ops/feature-usage', { params: { days: 30 } }),
      ])
      const unwrap = (res: any) => res.data?.data ?? res.data
      setOverview(unwrap(o))
      setCohorts(unwrap(r)?.cohorts ?? [])
      setFunnel(unwrap(f))
      setRevenueTrend(unwrap(rt) ?? [])
      setErrors(unwrap(e) ?? [])
      setUsage(unwrap(u))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const resolveError = async (id: string) => {
    try {
      await api.patch(`/admin/ops/errors/${id}/resolve`)
      setErrors((prev) => prev.filter((x) => x.id !== id))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        운영 지표를 불러오는 중…
      </div>
    )
  }

  const maxOffset = Math.min(
    8,
    Math.max(0, ...cohorts.flatMap((c) => c.retention.map((r) => r.offset))),
  )

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">운영 지표</h1>
          <p className="text-sm text-gray-500 mt-1">
            사용자·활동·매출·오류. 내부 계정(운영팀·관리자)은 사용자 수에서 뺐습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {overview && (
        <>
          <Section
            title="한눈에"
            hint="활동은 이벤트·게시글·댓글·AI 사용·진료기록을 합쳐 센 값입니다."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile
                label="전체 사용자"
                value={overview.users.total.toLocaleString()}
                sub={`오늘 +${overview.users.newToday} · 이번 주 +${overview.users.newThisWeek}`}
                icon={Users}
              />
              <Tile
                label="유료 구독"
                value={overview.subscriptions.paidUsers.toLocaleString()}
                sub={`체험 ${overview.subscriptions.trialing} · 취소 예정 ${overview.subscriptions.cancelScheduled}`}
                icon={CreditCard}
              />
              <Tile
                label="MRR (정가 기준)"
                value={formatKRW(overview.revenue.mrr)}
                sub={`ARR ${formatKRW(overview.revenue.arr)} · ARPU ${formatKRW(overview.revenue.arpu)}`}
                icon={TrendingUp}
              />
              <Tile
                label="총 결제액"
                value={formatKRW(overview.revenue.total)}
                sub={`이번 달 ${formatKRW(overview.revenue.thisMonth)} · 환불 ${formatKRW(overview.revenue.refunded)}`}
              />
              <Tile
                label="DAU / WAU / MAU"
                value={`${overview.activity.dau} / ${overview.activity.wau} / ${overview.activity.mau}`}
                sub={`끈끈함(DAU/MAU) ${overview.activity.stickiness}%`}
                icon={Activity}
              />
              <Tile
                label="체험 → 유료 전환"
                value={`${overview.trial.conversionRate}%`}
                sub={`${overview.trial.converted} / ${overview.trial.started}명`}
              />
              <Tile
                label="결제 실패"
                value={overview.revenue.failedCount.toLocaleString()}
                sub={`최근 7일 ${overview.revenue.failedThisWeek}건`}
                tone={overview.revenue.failedThisWeek > 0 ? 'warn' : 'default'}
              />
              <Tile
                label="미해결 오류"
                value={overview.errors.open.toLocaleString()}
                sub={`5xx ${overview.errors.open5xx} · 24시간 ${overview.errors.last24h}건`}
                tone={overview.errors.open5xx > 0 ? 'bad' : overview.errors.open > 0 ? 'warn' : 'good'}
                icon={AlertTriangle}
              />
            </div>
          </Section>

          <Section title="구독 상태" hint="티어별 인원과 구독 행 상태입니다.">
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Free</th>
                    <th className="px-4 py-2 text-left font-medium">Basic</th>
                    <th className="px-4 py-2 text-left font-medium">Pro</th>
                    <th className="px-4 py-2 text-left font-medium">Clinic</th>
                    <th className="px-4 py-2 text-left font-medium">활성 구독</th>
                    <th className="px-4 py-2 text-left font-medium">연체</th>
                    <th className="px-4 py-2 text-left font-medium">해지</th>
                    <th className="px-4 py-2 text-left font-medium">면허 검수 대기</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="tabular-nums">
                    <td className="px-4 py-2">{overview.subscriptions.byTier.free ?? 0}</td>
                    <td className="px-4 py-2">{overview.subscriptions.byTier.basic ?? 0}</td>
                    <td className="px-4 py-2">{overview.subscriptions.byTier.professional ?? 0}</td>
                    <td className="px-4 py-2">{overview.subscriptions.byTier.clinic ?? 0}</td>
                    <td className="px-4 py-2">{overview.subscriptions.active}</td>
                    <td className={`px-4 py-2 ${overview.subscriptions.pastDue > 0 ? 'text-amber-600 font-semibold' : ''}`}>
                      {overview.subscriptions.pastDue}
                    </td>
                    <td className="px-4 py-2">{overview.subscriptions.canceled}</td>
                    <td className={`px-4 py-2 ${overview.users.licensePending > 0 ? 'text-blue-600 font-semibold' : ''}`}>
                      {overview.users.licensePending}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {funnel && (
        <Section title="가입에서 결제까지" hint="어디서 새는지 봅니다.">
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              ['가입', funnel.signed_up],
              ['면허 제출', funnel.license_submitted],
              ['구독 시작', funnel.subscribed_any],
              ['결제 완료', funnel.paid],
              ['현재 유료', funnel.paying_now],
            ].map(([label, value], i, arr) => {
              const first = Number(arr[0][1]) || 0
              const rate = first > 0 ? Math.round((Number(value) / first) * 1000) / 10 : 0
              return (
                <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[13px] text-gray-500">{label}</p>
                  <p className="mt-1 text-[22px] font-bold tabular-nums text-gray-900">
                    {Number(value).toLocaleString()}
                  </p>
                  {i > 0 && <p className="text-[12px] text-gray-400">가입 대비 {rate}%</p>}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      <Section
        title="주간 코호트 리텐션"
        hint="가입한 주를 기준으로 이후 몇 주에 다시 왔는지. 신규가 늘어도 2주차가 비면 새는 양동이입니다."
      >
        {cohorts.length === 0 ? (
          <p className="text-sm text-gray-500">아직 코호트를 만들 만한 가입 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">가입 주</th>
                  <th className="px-3 py-2 text-left font-medium">인원</th>
                  {Array.from({ length: maxOffset + 1 }, (_, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                      {i}주
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.week} className="border-b border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">{c.week}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{c.size}</td>
                    {Array.from({ length: maxOffset + 1 }, (_, i) => {
                      const hit = c.retention.find((r) => r.offset === i)
                      if (!hit) return <td key={i} className="px-3 py-2 text-gray-300">–</td>
                      const bg =
                        hit.rate >= 60
                          ? 'bg-emerald-100 text-emerald-800'
                          : hit.rate >= 30
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-50 text-gray-600'
                      return (
                        <td key={i} className="px-3 py-2">
                          <span className={`inline-block rounded px-1.5 py-0.5 tabular-nums ${bg}`}>
                            {hit.rate}%
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {revenueTrend.length > 0 && (
        <Section title="월별 결제액" hint="실제로 들어온 돈입니다(결제 완료 기준).">
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">월</th>
                  <th className="px-4 py-2 text-left font-medium">결제액</th>
                  <th className="px-4 py-2 text-left font-medium">건수</th>
                  <th className="px-4 py-2 text-left font-medium">결제자</th>
                </tr>
              </thead>
              <tbody>
                {revenueTrend.map((r) => (
                  <tr key={r.month} className="border-b border-gray-100 tabular-nums">
                    <td className="px-4 py-2">{r.month}</td>
                    <td className="px-4 py-2 font-medium">{formatKRW(Number(r.amount))}</td>
                    <td className="px-4 py-2">{r.payments}</td>
                    <td className="px-4 py-2">{r.payers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section
        title="서버 오류"
        hint="같은 오류는 하나로 묶여 있습니다. 처리 완료로 닫아도 다시 나면 자동으로 열립니다."
      >
        {errors.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            미해결 오류가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {errors.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-gray-200 bg-white p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                        e.statusCode >= 500
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {e.statusCode}
                    </span>
                    <span className="text-[12px] font-mono text-gray-500">
                      {e.method} {e.path}
                    </span>
                    <span className="text-[12px] text-gray-400">{e.count}회</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-800 break-words">{e.message}</p>
                  <p className="mt-1 text-[12px] text-gray-400">
                    처음 {new Date(e.firstSeenAt).toLocaleString('ko-KR')} · 마지막{' '}
                    {new Date(e.lastSeenAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void resolveError(e.id)}
                  className="flex-shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] text-gray-600 hover:bg-gray-50"
                >
                  처리 완료
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {usage && (
        <Section
          title="기능별 사용량 (30일)"
          hint={
            usage.since
              ? `이벤트 수집 시작: ${new Date(usage.since).toLocaleDateString('ko-KR')}`
              : '아직 수집된 이벤트가 없습니다. 화면 사용이 쌓이면 여기에 나옵니다.'
          }
        >
          {usage.rows.length === 0 ? (
            <p className="text-sm text-gray-500">
              수집된 이벤트가 없습니다. 사용자가 화면을 열면 그 순간부터 쌓입니다.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">이벤트</th>
                    <th className="px-4 py-2 text-left font-medium">횟수</th>
                    <th className="px-4 py-2 text-left font-medium">사용자</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.rows.map((r) => (
                    <tr key={r.type} className="border-b border-gray-100 tabular-nums">
                      <td className="px-4 py-2 font-mono text-[13px]">{r.type}</td>
                      <td className="px-4 py-2">{r.events.toLocaleString()}</td>
                      <td className="px-4 py-2">{r.users.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
