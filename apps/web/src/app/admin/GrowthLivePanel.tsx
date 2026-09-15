import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { api } from '@/services/api'

type Evidence = {
  id: string; label: string; device: string; windowStart: string; windowEnd: string
  baselineStart: string; baselineEnd: string; numerator: number; denominator: number
  baselineNumerator: number; baselineDenominator: number; sufficient: boolean
  action: string; verify: string; hypothesis: string; recovered: number
}
type Insight = { id: string; evidence: Evidence; status: string; active: boolean; version: number }
type Live = {
  dataStatus: 'pending' | 'stale' | 'ready'; asOf: string | null; lastReceivedAt: string | null
  recentVisitors?: number; sampleSize?: number
  minutes?: { at: string; starts: number; signups: number }[]
  feed?: { source: string; device: string; page: string; at: string; stages: string[] }[]
}
const statuses: Record<string, string> = {
  new: '새 제안', reviewing: '확인 중', applied: '개선 적용', observing: '효과 관찰', closed: '종료', deferred: '보류',
}
const devices: Record<string, string> = { all: '전체 기기', mobile: '모바일', desktop: 'PC', tablet: '태블릿' }
const time = (value: string | null) => value ? new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '기록 없음'
const range = (a: string, b: string) => `${new Date(a).toLocaleString('ko-KR')} ~ ${new Date(b).toLocaleString('ko-KR')}`
const requestOptions = { _skipRetry: true, timeout: 10000 }

export default function GrowthLivePanel() {
  const client = useQueryClient()
  const [visible, setVisible] = useState(!document.hidden)
  const [device, setDevice] = useState('all')
  const [status, setStatus] = useState('')
  const [auditId, setAuditId] = useState('')
  const [clock, setClock] = useState(Date.now())
  useEffect(() => {
    const changed = () => {
      setVisible(!document.hidden)
      if (!document.hidden) void client.invalidateQueries({ queryKey: ['growth-live'] })
      else void client.cancelQueries({ queryKey: ['growth-live'] })
    }
    document.addEventListener('visibilitychange', changed)
    return () => document.removeEventListener('visibilitychange', changed)
  }, [client])
  useEffect(() => {
    if (!visible) return
    const timer = window.setInterval(() => setClock(Date.now()), 15000)
    return () => window.clearInterval(timer)
  }, [visible])
  const polling = {
    enabled: visible,
    retry: false as const,
    refetchIntervalInBackground: false,
    refetchInterval: (query: { state: { fetchFailureCount: number; errorUpdateCount: number } }) =>
      Math.min(120000, 15000 * 2 ** Math.min(query.state.fetchFailureCount ? query.state.errorUpdateCount : 0, 3)),
  }
  const live = useQuery<Live>({ queryKey: ['growth-live', 'snapshot'], queryFn: async ({ signal }) => (await api.get('/admin/growth/live', { ...requestOptions, signal })).data, ...polling })
  const insights = useQuery<Insight[]>({ queryKey: ['growth-live', 'insights', status], queryFn: async ({ signal }) => (await api.get('/admin/growth/insights', { ...requestOptions, signal, params: { status } })).data, ...polling })
  const audit = useQuery<{ fromStatus: string; toStatus: string; createdAt: string }[]>({
    queryKey: ['growth-live', 'audit', auditId], enabled: !!auditId && visible,
    queryFn: async ({ signal }) => (await api.get(`/admin/growth/insights/${encodeURIComponent(auditId)}/audit`, { ...requestOptions, signal })).data,
  })
  const change = useMutation({
    mutationFn: async ({ row, next }: { row: Insight; next: string }) => api.patch(`/admin/growth/insights/${encodeURIComponent(row.id)}`, { status: next, version: row.version }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['growth-live'] }),
    onError: () => { void client.invalidateQueries({ queryKey: ['growth-live', 'insights'] }) },
  })
  const data = live.data
  const stale = live.isError || data?.dataStatus === 'stale' || (!!data?.asOf && clock - Date.parse(data.asOf) > 125000)
  return <section className="space-y-5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-6" aria-label="실시간 행동 분석">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">실시간 행동 분석</h2>
      <button className="rounded border bg-white px-3 py-2 text-sm" onClick={() => void client.invalidateQueries({ queryKey: ['growth-live'] })}>실시간 새로고침</button>
    </div>
    <p className="text-sm text-slate-600">전체 유입 · QA 방문 제외 · 최근 24시간 안에 시작한 세션 기준. 아래 기간 분석의 필터와 별도로 조회합니다. 서버는 1분마다 집계하고 화면은 15초마다 확인합니다.</p>
    <p role="status" className={stale ? 'text-amber-800' : 'text-slate-600'}>
      {stale ? '연결 또는 집계 지연 · 마지막으로 받은 수치를 표시합니다.' : data?.dataStatus === 'ready' ? '집계 정상' : '첫 집계 대기 중'}
      {' · 집계 시각 '}{time(data?.asOf || null)}{' · 분석 대상 마지막 수신 '}{time(data?.lastReceivedAt || null)}
    </p>
    <p className="text-xs text-slate-500">수신 기록이 없다는 사실만으로 수집 장애를 판정하지 않습니다. 최근 활동 브라우저 수는 실제 동시 접속 인원과 다릅니다.</p>
    {data?.asOf && <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-4">최근 5분 활동 브라우저 <strong className="ml-2 text-2xl">{data.recentVisitors}</strong></div>
        <div className="rounded-lg bg-white p-4">최근 1시간 활동 세션 <strong className="ml-2 text-2xl">{data.sampleSize}</strong></div>
      </div>
      <div className="h-56 min-w-0 rounded-lg bg-white p-2" aria-label="최근 1시간 분별 신규 세션과 가입 완료">
        <ResponsiveContainer width="100%" height="100%"><LineChart data={data.minutes}>
          <XAxis dataKey="at" tickFormatter={v => time(v).slice(0, -3)} minTickGap={40} /><YAxis allowDecimals={false} width={30} />
          <Tooltip labelFormatter={v => time(String(v))} /><Line dataKey="starts" name="신규 세션" stroke="#047857" dot={false} /><Line dataKey="signups" name="가입 완료" stroke="#2563eb" dot={false} />
        </LineChart></ResponsiveContainer>
      </div>
      <details className="rounded-lg bg-white p-4"><summary className="cursor-pointer font-medium">최근 익명 행동 흐름</summary>
        <ul className="mt-3 space-y-2 text-sm">{data.feed?.map((s, i) => <li key={i} className="break-words">{time(s.at)} · {devices[s.device] || s.device} / {s.source} → {s.page}{s.stages.length ? ` · ${s.stages.join(' · ')}` : ''}</li>)}</ul>
        {!data.feed?.length && <p className="mt-2 text-sm">최근 5분의 관측 기록이 없습니다.</p>}
      </details>
    </>}
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="text-lg font-semibold">근거와 개선 제안</h3>
      <label className="text-sm">제안 기기 <select className="rounded border p-2" value={device} onChange={e => setDevice(e.target.value)}>{Object.entries(devices).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm">제안 상태 <select className="rounded border p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="">전체 상태</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    </div>
    <p className="text-xs text-slate-600">동일 길이의 직전 구간과 비교합니다. 최소 표본을 충족하고 2회 연속 악화가 관측되면 표시합니다. 가입 중단·체험·첫 사용은 30분 비활동으로 종료된 세션만 평가합니다.</p>
    {insights.isError && <p role="alert">제안을 갱신하지 못했습니다. 새로고침 후 다시 확인하세요.</p>}
    {change.isError && <p role="alert">상태를 저장하지 못했습니다. 다른 관리자의 변경 또는 연결 상태를 확인하고 다시 시도하세요.</p>}
    <div className="grid gap-3 lg:grid-cols-2">{insights.data?.filter(row => row.evidence.device === device).map(row => {
      const e = row.evidence
      return <article key={row.id} className="min-w-0 space-y-3 rounded-lg border bg-white p-4">
        <h4 className="font-semibold">{e.label}</h4>
        <p className={row.active ? 'font-medium text-amber-800' : 'text-sm text-slate-500'}>{!e.sufficient ? '표본 부족 · 악화 여부 판단 보류' : row.active ? '2회 연속 악화 관측 · 원인 확인 필요' : '지속 악화 조건 미충족'}</p>
        <p className="text-sm">현재 {e.numerator}/{e.denominator}세션 · 이전 {e.baselineNumerator}/{e.baselineDenominator}세션</p>
        <details className="text-xs text-slate-500"><summary className="cursor-pointer">비교 기간 확인</summary><p>현재 {range(e.windowStart, e.windowEnd)}</p><p>이전 {range(e.baselineStart, e.baselineEnd)}</p><p>종료 세션 규칙은 표시 구간보다 30분 앞선 마지막 활동 시각을 비교합니다.</p></details>
        {e.id.startsWith('signup_error') && <p className="text-sm">현재 오류 후 가입 완료: {e.recovered}세션</p>}
        <p className="text-sm text-slate-600">가설: {e.hypothesis}</p>
        <p className="text-sm">확인 작업: {e.action}</p><p className="text-sm">검증 방법: {e.verify}</p>
        <label className="block text-sm">처리 상태 <select aria-label={`${e.label} 처리 상태`} className="rounded border p-2" value={row.status} disabled={change.isPending || insights.isError || stale} onChange={event => change.mutate({ row, next: event.target.value })}>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <button className="text-sm underline" onClick={() => setAuditId(auditId === row.id ? '' : row.id)}>상태 변경 기록</button>
        {auditId === row.id && <div className="text-xs">{audit.isError ? '기록을 불러오지 못했습니다.' : audit.isPending ? '불러오는 중…' : audit.data?.length ? audit.data.map((a, i) => <p key={i}>{new Date(a.createdAt).toLocaleString('ko-KR')} · {statuses[a.fromStatus]} → {statuses[a.toStatus]}</p>) : '변경 기록이 없습니다.'}</div>}
      </article>
    })}</div>
    {insights.data && !insights.data.some(row => row.evidence.device === device) && <p className="text-sm">선택한 조건의 제안이 없습니다.</p>}
  </section>
}
