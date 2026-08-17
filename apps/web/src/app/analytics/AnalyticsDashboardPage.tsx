import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Activity,
  Target,
  Award,
  RefreshCw,
} from 'lucide-react';
import { Toss3DIcon } from '@/components/common/Toss3DIcon';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  useDashboardMetrics,
  useBenchmark,
  usePrescriptionPatterns,
  type BenchmarkMetrics,
} from '@/hooks/useAnalytics';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// 벤치마크에 표시할 지표 — 백엔드 BenchmarkMetrics 키와 정확히 일치해야 한다.
const BENCHMARK_METRICS: Array<{
  key: keyof BenchmarkMetrics;
  label: string;
  unit: string;
}> = [
  { key: 'returnRate', label: '재방문율', unit: '%' },
  { key: 'avgImprovementRate', label: '호전율', unit: '%' },
  { key: 'aiAcceptanceRate', label: 'AI 채택율', unit: '%' },
  { key: 'avgConsultationsPerDay', label: '일 평균 진료', unit: '건' },
];

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="h-64 flex items-center justify-center text-center px-4">
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    refetch: refetchMetrics,
  } = useDashboardMetrics();
  const { data: benchmark } = useBenchmark();
  const { data: patterns } = usePrescriptionPatterns();

  // 전용 엔드포인트가 없는 위젯은 실제 데이터(/analytics/dashboard·/patterns)에서 파생한다.
  const trends = {
    consultations: (metrics?.recentActivity ?? []).map((d) => ({
      date: d.date,
      count: d.consultations,
    })),
    prescriptions: (metrics?.recentActivity ?? []).map((d) => ({
      date: d.date,
      count: d.prescriptions,
    })),
  };
  const topFormulas = patterns?.topFormulas ?? [];
  const todayActivity = {
    consultationsToday: metrics?.today?.consultations ?? 0,
    patientsToday: metrics?.today?.newPatients ?? 0,
    prescriptionsToday: metrics?.today?.prescriptions ?? 0,
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  if (metricsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm">진료 통계를 불러오는 중...</p>
      </div>
    );
  }

  if (metricsError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <Activity className="w-12 h-12 text-gray-300" />
        <div>
          <p className="text-gray-900 font-medium">통계를 불러올 수 없습니다</p>
          <p className="text-gray-500 text-sm mt-1">
            네트워크 또는 서버 연결을 확인한 뒤 다시 시도해 주세요.
          </p>
        </div>
        <button
          onClick={() => refetchMetrics()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Data Warning */}
      {(metrics as any)?._isDemo && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">데모 데이터</span>
          <span className="text-amber-500 text-xs">API 연결 전까지 시연용 샘플 데이터가 표시됩니다. 실제 진료 데이터와 다릅니다.</span>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">진료 성과 분석</h1>
          <p className="text-gray-500 mt-1">진료 통계 대시보드</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-tile rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <Toss3DIcon icon={Users} tone="blue" size="lg" />
            <span className={`text-sm font-medium ${getChangeColor(metrics?.overview?.totalPatientsChange || 0)}`}>
              {formatChange(metrics?.overview?.totalPatientsChange || 0)}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{metrics?.overview?.totalPatients?.toLocaleString() ?? 0}</p>
            <p className="text-gray-500 text-sm">총 환자 수</p>
          </div>
        </div>

        <div className="glass-tile rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <Toss3DIcon icon={TrendingUp} tone="green" size="lg" />
            <span className={`text-sm font-medium ${getChangeColor((metrics?.returnRate?.current || 0) - (metrics?.returnRate?.previous || 0))}`}>
              {metrics?.returnRate?.trend === 'up' ? '↑' : metrics?.returnRate?.trend === 'down' ? '↓' : '→'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{metrics?.returnRate?.current?.toFixed(1) ?? 0}%</p>
            <p className="text-gray-500 text-sm">재방문율</p>
          </div>
        </div>

        <div className="glass-tile rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <Toss3DIcon icon={Target} tone="purple" size="lg" />
            <span className="text-sm font-medium text-green-600">
              {metrics?.aiUsage?.acceptanceRate?.toFixed(0) ?? 0}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{metrics?.aiUsage?.totalRecommendations?.toLocaleString() ?? 0}</p>
            <p className="text-gray-500 text-sm">AI 추천 활용</p>
          </div>
        </div>

        <div className="glass-tile rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <Toss3DIcon icon={Activity} tone="amber" size="lg" />
            <span className={`text-sm font-medium ${getChangeColor(metrics?.overview?.totalConsultationsChange || 0)}`}>
              {formatChange(metrics?.overview?.totalConsultationsChange || 0)}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{metrics?.overview?.totalConsultations?.toLocaleString() ?? 0}</p>
            <p className="text-gray-500 text-sm">총 진료 건수</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consultation Trend */}
        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">진료 추이</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends?.consultations || []}>
                <defs>
                  <linearGradient id="colorConsultations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0088FE"
                  fillOpacity={1}
                  fill="url(#colorConsultations)"
                  name="진료 건수"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prescription Trend */}
        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">처방 추이</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.prescriptions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#00C49F" name="처방 건수" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Formulas */}
        <div className="surface-card rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">자주 사용하는 처방 TOP 10</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFormulas || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884D8" name="사용 횟수" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">오늘의 활동</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Toss3DIcon icon={Calendar} tone="blue" size="sm" />
                <span className="text-gray-700">오늘 진료</span>
              </div>
              <span className="text-xl font-bold text-blue-600">
                {todayActivity?.consultationsToday || 0}건
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Toss3DIcon icon={Users} tone="green" size="sm" />
                <span className="text-gray-700">내원 환자</span>
              </div>
              <span className="text-xl font-bold text-green-600">
                {todayActivity?.patientsToday || 0}명
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Toss3DIcon icon={BarChart3} tone="purple" size="sm" />
                <span className="text-gray-700">처방 건수</span>
              </div>
              <span className="text-xl font-bold text-purple-600">
                {todayActivity?.prescriptionsToday || 0}건
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Benchmark Section — 백엔드 계약: myMetrics / nationalAverage / percentile(스칼라) */}
      {benchmark?.myMetrics && benchmark?.nationalAverage && (
        <div className="surface-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Toss3DIcon icon={Award} tone="amber" size="sm" />
              <h3 className="text-lg font-semibold">전국 벤치마크 비교</h3>
            </div>
            <span className="text-sm text-gray-500">
              전국 상위{' '}
              <strong className="text-blue-600">
                {(100 - (benchmark.percentile ?? 0)).toFixed(0)}%
              </strong>
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {BENCHMARK_METRICS.map((item) => {
              const mine = benchmark.myMetrics[item.key] ?? 0
              const avg = benchmark.nationalAverage[item.key] ?? 0
              // 전국 평균 대비 비율(0~150%)을 게이지로 — 평균이 0이면 게이지 없음
              const ratio = avg > 0 ? Math.min((mine / avg) * 100, 150) : 0
              return (
                <div key={item.key} className="text-center">
                  <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke={mine >= avg ? '#00C49F' : '#0088FE'}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(Math.min(ratio, 100) / 100) * 251.2} 251.2`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">
                        {mine.toFixed(1)}
                        <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-700">{item.label}</p>
                  <p className="text-xs text-gray-500">
                    전국 평균 {avg.toFixed(1)}
                    {item.unit}
                  </p>
                </div>
              )
            })}
          </div>

          {(benchmark.strengths?.length > 0 || benchmark.areasForImprovement?.length > 0) && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {benchmark.strengths?.length > 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-sm font-semibold text-emerald-900 mb-1">강점</p>
                  <ul className="text-[13px] text-emerald-800 list-disc list-inside space-y-0.5">
                    {benchmark.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {benchmark.areasForImprovement?.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm font-semibold text-amber-900 mb-1">개선 포인트</p>
                  <ul className="text-[13px] text-amber-800 list-disc list-inside space-y-0.5">
                    {benchmark.areasForImprovement.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prescription Patterns — 백엔드 계약: topFormulas / constitutionDistribution / monthlyTrend */}
      {patterns && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">자주 보는 증상</h3>
            {patterns.topSymptoms?.length ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patterns.topSymptoms}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(v: number, _n, p) => [
                        `${v}건`,
                        `주 처방: ${p?.payload?.topFormula ?? '-'}`,
                      ]}
                    />
                    <Bar dataKey="count" fill="#00C49F" name="진료 건수" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyPanel message="아직 진료 기록이 없습니다. 진료를 저장하면 여기에 집계됩니다." />
            )}
          </div>

          <div className="surface-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">환자 체질 분포</h3>
            {patterns.constitutionDistribution?.length ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={patterns.constitutionDistribution}
                      dataKey="count"
                      nameKey="constitution"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ constitution, percentage }) =>
                        `${constitution}: ${(percentage ?? 0).toFixed(1)}%`
                      }
                    >
                      {patterns.constitutionDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyPanel message="체질을 입력한 진료가 쌓이면 분포가 표시됩니다." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
