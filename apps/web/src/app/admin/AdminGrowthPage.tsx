import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { RefreshCw, Download, MousePointer2 } from 'lucide-react'
import { api } from '@/services/api'
import GrowthLivePanel from './GrowthLivePanel'

type Session = {
  id: string
  visitor: string
  source: string
  campaign: string
  device: string
  entry: string
  exit: string
  views: number
  duration: number
  closed: boolean
  dropoff?: string | null
  signedUp: boolean
  startedAt: string
  journey: { type: string; page: string; at: string }[]
}
type Report = {
  summary: {
    visitors: number
    recentVisitors?: number
    sessions: number
    active: number
    pageViews: number
    signups: number
    activated: number
    signupRate: number | null
    bounceRate: number | null
    avgEngagement: number
  }
  dropoffs?: {
    closedSessions: number
    analyzedSessions: number
    patterns: { code: string; label: string; action: string; count: number; rate: number | null }[]
  }
  funnel: {
    type: string
    count: number
    conversion: number | null
    dropoff: number
  }[]
  channels: {
    label: string
    sessions: number
    signups: number
    conversion: number | null
    bounce: number | null
  }[]
  pages: {
    page: string
    views: number
    sessions: number
    exits: number
    exitRate: number | null
    scroll: { depth: number; count: number; rate: number | null }[]
  }[]
  heatmap: {
    page: string
    device: string
    x: number
    y: number
    count: number
  }[]
  targets: { label: string; count: number }[]
  errors: { label: string; count: number }[]
  daily: { date: string; sessions: number; signups: number }[]
  sources: string[]
  sessions: Session[]
  vitals: { metric: string; samples: number; p75: number | null }[]
  firstCollectedAt: string | null
  start: string
  end: string
  eventCount: number
}
const labels: Record<string, string> = {
  page_view: '방문',
  signup_start: '가입 입력 시작',
  signup_submit: '가입 요청',
  signup_success: '가입 완료',
  feature_used: '기능 사용',
  demo_completed: '샘플 체험 완료',
  signup_error: '가입 오류',
  login_success: '로그인 완료',
  login_error: '로그인 오류',
}
const rate = (v: number | null) => (v === null ? '—' : `${v}%`)
const card = 'min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm'
function Table({
  headers,
  rows,
}: {
  headers: string[]
  rows: React.ReactNode[][]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border-b px-3 py-3 text-slate-500 whitespace-nowrap font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td
                  key={j}
                  className="border-b border-slate-100 px-3 py-3 break-all"
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="py-8 text-center text-slate-500">
          선택한 조건의 기록이 없습니다.
        </p>
      )}
    </div>
  )
}
export default function AdminGrowthPage() {
  const [days, setDays] = useState('7')
  const [source, setSource] = useState('')
  const [device, setDevice] = useState('')
  const [page, setPage] = useState('/')
  const [heatDevice, setHeatDevice] = useState('mobile')
  const [selected, setSelected] = useState<Session | null>(null)
  const query = useQuery<Report>({
    queryKey: ['admin-growth', days, source, device],
    queryFn: async () =>
      (await api.get('/admin/growth', { params: { days, source, device } }))
        .data,
    refetchInterval: 60000,
    retry: 1,
  })
  const data = query.data
  const exportCsv = () => {
    if (!data) return
    const cell = (v: unknown) =>
      `"${String(v)
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""')}"`
    const rows = [
      ['유입/매체/캠페인', '방문', '가입', '전환율', '이탈률'],
      ...data.channels.map((c) => [
        c.label,
        c.sessions,
        c.signups,
        rate(c.conversion),
        rate(c.bounce),
      ]),
    ]
    const url = URL.createObjectURL(
      new Blob(
        ['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `growth-${days}days.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const points =
    data?.heatmap.filter((p) => p.page === page && p.device === heatDevice) ||
    []
  const max = Math.max(1, ...points.map((p) => p.count))
  const scroll = data?.pages.find((p) => p.page === page)?.scroll || []
  return (
    <div className="space-y-6 text-slate-900">
      <GrowthLivePanel />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">유입 · 전환 분석</h1>
          <p className="mt-2 text-sm text-slate-500">
            광고 방문부터 가입과 첫 사용까지, 어디서 멈추는지 확인하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg border bg-white p-2"
            aria-label="새로고침"
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={18} />
          </button>
          <button
            disabled={!data}
            className="flex gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
            onClick={exportCsv}
          >
            <Download size={16} />
            유입 CSV
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <label>
          기간{' '}
          <select
            aria-label="조회 기간"
            className="rounded-lg border p-2"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          >
            {[1, 7, 14, 30, 90].map((n) => (
              <option key={n} value={n}>
                최근 {n}일
              </option>
            ))}
          </select>
        </label>
        <label>
          유입{' '}
          <select
            aria-label="유입 경로"
            className="rounded-lg border p-2"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">전체</option>
            {[...new Set([source, ...(data?.sources || [])])]
              .filter(Boolean)
              .map((s) => (
                <option key={s}>{s}</option>
              ))}
          </select>
        </label>
        <label>
          기기{' '}
          <select
            aria-label="기기"
            className="rounded-lg border p-2"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
          >
            <option value="">전체</option>
            <option value="mobile">모바일</option>
            <option value="tablet">태블릿</option>
            <option value="desktop">데스크톱</option>
          </select>
        </label>
      </div>
      {query.isError && (
        <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">
          분석 데이터를 불러오지 못했습니다. 권한과 API 배포 상태를 확인하고,
          데이터가 많으면 조회 기간을 줄여주세요.
          <button
            className="ml-3 underline"
            onClick={() => void query.refetch()}
          >
            다시 시도
          </button>
        </div>
      )}
      {query.isLoading && <p role="status">방문 기록을 불러오는 중입니다…</p>}
      {data && (
        <>
          <div className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            {data.eventCount
              ? `조회 구간 첫 수집: ${new Date(data.firstCollectedAt!).toLocaleString('ko-KR')} · ${data.eventCount.toLocaleString()}개 이벤트`
              : '아직 수집된 방문 기록이 없습니다. 배포 후 새 방문부터 집계됩니다.'}
            <br />
            이전 방문의 히트맵은 복원할 수 없습니다. 방문자는 브라우저 식별자
            기준이며 차단·추적 거부 방문은 제외됩니다. 가입 완료는 성공 응답을
            받은 브라우저 기준으로, 실제 계정 수는 사용자 관리에서 확인하세요.
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['방문자', data.summary.visitors],
              ['방문 세션', data.summary.sessions],
              ['가입 완료', data.summary.signups],
              ['가입 전환율', rate(data.summary.signupRate)],
              ['이탈률', rate(data.summary.bounceRate)],
              ['평균 참여 시간', `${data.summary.avgEngagement}초`],
              ['최근 5분 방문자', data.summary.recentVisitors ?? '—'],
              ['기능 사용 세션', data.summary.activated],
            ].map(([name, value]) => (
              <div key={name} className={card}>
                <p className="text-sm text-slate-500">{name}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className={card}>
            <h2 className="font-semibold">어디서, 왜 멈췄을까?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              최근 5분 방문자는 해당 시간에 행동이 기록된 브라우저 수이며 현재 접속 인원과 다를 수 있습니다. 1분마다 갱신합니다.
              이탈 패턴은 30분 비활동으로 종료된 세션만 분석합니다. 로그인 완료 또는 기능 사용 세션은 제외하며 한 세션은 한 패턴에 집계합니다.
              오류와 중단 단계는 관측 사실이고 개선 제안은 원인 가설입니다.
            </p>
            {data.dropoffs ? (
              <>
                <p className="my-4 text-sm font-medium">
                  종료 {data.dropoffs.closedSessions}세션 중 점검 대상 {data.dropoffs.analyzedSessions}세션
                  {data.dropoffs.analyzedSessions < 30 && ' · 표본이 적어 비율 해석에 주의하세요.'}
                </p>
                <Table
                  headers={['관측된 이탈 패턴', '세션', '대상 중 비율', '다음 점검 · 원인 가설']}
                  rows={data.dropoffs.patterns.filter((p) => p.count > 0).map((p) => [
                    p.label, p.count, rate(p.rate),
                    <span className="inline-block min-w-48 max-w-sm whitespace-normal leading-6">{p.action}</span>,
                  ])}
                />
              </>
            ) : <p className="mt-4 text-sm text-slate-500">이탈 패턴 분석 API 적용 후 표시됩니다.</p>}
            <h3 className="mt-5 font-medium">전체 전환 흐름 점검 · 진행 중 세션 포함</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {data.summary.sessions === 0 && (
                <li>
                  방문 기록이 없습니다. 수집 API 배포 상태와 광고의 최종 도착
                  주소·UTM을 먼저 확인하세요.
                </li>
              )}
              {data.funnel[0].count > data.funnel[1].count && (
                <li>
                  방문 후 가입 입력으로 이어지지 않은 세션이{' '}
                  {data.funnel[0].count - data.funnel[1].count}개입니다. 광고
                  메시지와 첫 화면의 일치, 제품 체험 위치, 가입 버튼을 비교해
                  보세요.
                </li>
              )}
              {data.funnel[1].count > data.funnel[2].count && (
                <li>
                  입력 시작 후 가입 요청까지 가지 않은 세션이{' '}
                  {data.funnel[1].count - data.funnel[2].count}개입니다.
                  면허번호·필수 입력·동의 단계와 모바일 폼 길이를 점검하세요.
                </li>
              )}
              {data.errors.length > 0 && (
                <li>
                  오류가 기록됐습니다. 아래 오류 코드와 방문 경로를 먼저
                  확인하고 광고비 확대 전에 해결하세요.
                </li>
              )}
              {data.funnel[3].count > data.funnel[4].count && (
                <li>
                  가입 후 같은 세션에서 기능 사용이 기록되지 않은 세션이{' '}
                  {data.funnel[3].count - data.funnel[4].count}개입니다. 첫 진료
                  예시와 검색 안내를 점검하세요.
                </li>
              )}
              <li>
                위 항목은 관측된 행동에 따른 점검 제안입니다. 사용자의 실제 이탈
                이유는 인터뷰나 개선 전후 비교로 확인해야 합니다. 표본이 적을 때
                비율만으로 광고를 판단하지 마세요.
              </li>
            </ul>
          </div>
          <div className={card}>
            <h2 className="font-semibold">방문 · 가입 추이</h2>
            <div className="mt-4 h-56 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="sessions"
                    name="방문"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="signups"
                    name="가입"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500">
              일자: 한국 시간 · 선택 기간은 현재부터 최근 N일
            </p>
          </div>
          <div className={card}>
            <h2 className="font-semibold">가입 전환 단계</h2>
            <p className="my-2 text-sm text-slate-500">
              같은 세션에서 순서대로 진행한 방문만 집계합니다. 입력 전 이탈·가입
              실패·가입 후 미사용을 구분하세요.
            </p>
            <Table
              headers={['단계', '세션', '이전 단계 대비', '이전 단계에서 이탈']}
              rows={data.funnel.map((f) => [
                labels[f.type],
                f.count,
                rate(f.conversion),
                f.dropoff,
              ])}
            />
          </div>
          <div className={card}>
            <h2 className="mb-3 font-semibold">광고 · 유입 경로별 성과</h2>
            <Table
              headers={[
                '소스 / 매체 / 캠페인',
                '방문',
                '가입',
                '전환율',
                '이탈률',
              ]}
              rows={data.channels.map((c) => [
                c.label,
                c.sessions,
                c.signups,
                rate(c.conversion),
                rate(c.bounce),
              ])}
            />
            <p className="mt-3 text-xs text-slate-500">
              광고 URL에 utm_source, utm_medium, utm_campaign을 지정하세요.
              영문·숫자·하이픈·밑줄을 사용합니다. 광고비를 수집하지 않아
              CPA·ROAS는 계산하지 않습니다.
            </p>
          </div>
          <div className={card}>
            <h2 className="mb-3 font-semibold">페이지별 이탈</h2>
            <Table
              headers={[
                '페이지',
                '조회',
                '방문 세션',
                '마지막 페이지로 종료',
                '종료율',
              ]}
              rows={data.pages.map((p) => [
                p.page,
                p.views,
                p.sessions,
                p.exits,
                rate(p.exitRate),
              ])}
            />
          </div>
          <div className={card}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="mr-auto flex items-center gap-2 font-semibold">
                <MousePointer2 size={18} />
                클릭 히트맵 · 스크롤
              </h2>
              <select
                aria-label="히트맵 페이지"
                className="rounded border p-2"
                value={page}
                onChange={(e) => setPage(e.target.value)}
              >
                {[...new Set(['/', ...data.pages.map((p) => p.page)])]
                  .filter((p) => !p.startsWith('/dashboard'))
                  .map((p) => (
                    <option key={p}>{p}</option>
                  ))}
              </select>
              <select
                aria-label="히트맵 기기"
                className="rounded border p-2"
                value={heatDevice}
                onChange={(e) => setHeatDevice(e.target.value)}
              >
                <option value="mobile">모바일</option>
                <option value="tablet">태블릿</option>
                <option value="desktop">데스크톱</option>
              </select>
            </div>
            <p className="my-3 text-sm text-slate-500">
              문서 전체 가로·세로를 0–100%로 정규화한 클릭 밀도입니다. 각 칸에
              마우스를 올리면 클릭 수가 표시됩니다. 화면 배경을 재생하는 세션
              녹화는 아닙니다.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div
                className="relative h-[420px] overflow-hidden rounded-lg border bg-slate-50"
                style={{
                  backgroundImage:
                    'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg,#e2e8f0 1px,transparent 1px)',
                  backgroundSize: '5% 5%',
                }}
                role="img"
                aria-label={`${page} ${heatDevice} 클릭 분포 ${points.reduce((s, p) => s + p.count, 0)}회`}
              >
                <span className="absolute left-2 top-2 text-xs text-slate-400">
                  페이지 상단 · 0%
                </span>
                {points.map((p) => (
                  <div
                    key={`${p.x}:${p.y}`}
                    title={`가로 ${p.x}% · 세로 ${p.y}% · ${p.count}회`}
                    className="absolute h-[5%] w-[5%] rounded-full"
                    style={{
                      left: `${p.x - 2.5}%`,
                      top: `${p.y - 2.5}%`,
                      background: `radial-gradient(circle, rgba(239,68,68,${0.2 + (0.8 * p.count) / max}), rgba(251,191,36,.2))`,
                    }}
                  />
                ))}
                {!points.length && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                    이 조건의 클릭 기록이 없습니다.
                  </div>
                )}
                <span className="absolute bottom-2 left-2 text-xs text-slate-400">
                  페이지 하단 · 100%
                </span>
              </div>
              <div>
                <h3 className="font-medium">스크롤 도달률</h3>
                <p className="mt-1 text-xs text-slate-500">
                  페이지 방문 세션 기준 · 상단 기기 필터 적용
                </p>
                {scroll.map((s) => (
                  <div key={s.depth} className="mt-5">
                    <div className="flex justify-between text-sm">
                      <span>{s.depth}% 지점</span>
                      <span>
                        {s.count}세션 · {rate(s.rate)}
                      </span>
                    </div>
                    <div className="mt-2 h-3 rounded bg-slate-100">
                      <div
                        className="h-3 rounded bg-blue-500"
                        style={{ width: `${s.rate || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="mt-6 text-xs leading-5 text-slate-500">
                  입력 필드, 환자 화면, 관리자 화면의 클릭은 수집하지 않습니다.
                  서로 다른 화면 크기·레이아웃의 좌표는 정확히 겹치지 않을 수
                  있습니다.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={card}>
              <h2 className="mb-3 font-semibold">많이 누른 요소</h2>
              <Table
                headers={['페이지 · 요소 코드', '클릭']}
                rows={data.targets.map((t) => [t.label, t.count])}
              />
            </div>
            <div className={card}>
              <h2 className="mb-3 font-semibold">가입 · 사용 오류</h2>
              <Table
                headers={['페이지 · 오류 코드', '발생']}
                rows={data.errors.map((e) => [e.label, e.count])}
              />
              <p className="mt-3 text-xs text-slate-500">
                http_409: 중복 가입 · http_429: 요청 제한 · network: 연결 실패 ·
                browser_validation: 필수 입력/형식 확인
              </p>
            </div>
          </div>
          <div className={card}>
            <h2 className="mb-3 font-semibold">
              최근 방문 경로 (최대 100세션)
            </h2>
            <Table
              headers={[
                '시작 시각',
                '방문자',
                '유입',
                '기기',
                '진입 → 마지막',
                '참여',
                '상태',
                '이탈 패턴',
                '상세',
              ]}
              rows={data.sessions.map((s) => [
                new Date(s.startedAt).toLocaleString('ko-KR'),
                s.visitor.slice(0, 8),
                s.source,
                s.device,
                `${s.entry} → ${s.exit}`,
                `${s.duration}초`,
                s.signedUp ? '가입 완료' : s.closed ? '종료' : '진행 중',
                data.dropoffs?.patterns.find((p) => p.code === s.dropoff)?.label || '—',
                <button
                  className="text-blue-600 underline"
                  onClick={() => setSelected(s)}
                >
                  경로 보기
                </button>,
              ])}
            />
          </div>
          {selected && (
            <div className={card}>
              <div className="flex justify-between">
                <h2 className="font-semibold">
                  방문자 {selected.visitor.slice(0, 8)}의 경로
                </h2>
                <button onClick={() => setSelected(null)}>닫기</button>
              </div>
              <Table
                headers={['시각', '행동', '페이지']}
                rows={selected.journey.map((j) => [
                  new Date(j.at).toLocaleTimeString('ko-KR'),
                  labels[j.type] || j.type,
                  j.page,
                ])}
              />
            </div>
          )}
          <p className="text-xs leading-6 text-slate-500">
            세션은 30분 비활동 시 종료로 판정합니다. 이탈률은 종료 세션 중 한
            페이지만 보고 참여 10초 미만이며 가입·체험 완료·기능 사용이 없는
            비율입니다. 진행 중 세션은 분모에서 제외합니다. 페이지 종료율은 해당
            페이지를 본 종료 세션 중 그 페이지에서 끝난 비율입니다. 기간 경계에
            걸친 방문은 일부 단계가 누락될 수 있습니다. 새로고침:{' '}
            {new Date(data.end).toLocaleTimeString('ko-KR')}
          </p>
        </>
      )}
    </div>
  )
}
