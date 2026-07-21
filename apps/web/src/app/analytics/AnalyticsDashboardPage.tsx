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
} from '@/hooks/useAnalytics';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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
  const topFormulas = patterns?.prescriptionPatterns?.mostUsedFormulas ?? [];
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

      {/* Benchmark Section */}
      {benchmark && (
        <div className="surface-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Toss3DIcon icon={Award} tone="amber" size="sm" />
            <h3 className="text-lg font-semibold">전국 벤치마크 비교</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { label: '재방문율', key: 'returnRate', unit: '%' },
              { label: '호전율', key: 'avgImprovementRate', unit: '%' },
              { label: 'AI 채택율', key: 'aiAcceptanceRate', unit: '%' },
              { label: '월간 환자수', key: 'patientsPerMonth', unit: '명' },
              { label: '일 평균 진료', key: 'consultationsPerDay', unit: '건' },
            ].map((item) => (
              <div key={item.key} className="text-center">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#0088FE"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(benchmark.percentile[item.key as keyof typeof benchmark.percentile] / 100) * 251.2} 251.2`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {benchmark.percentile[item.key as keyof typeof benchmark.percentile]}%
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-500">
                  나: {benchmark.myMetrics[item.key as keyof typeof benchmark.myMetrics].toFixed(1)}{item.unit} /
                  평균: {benchmark.nationalAvg[item.key as keyof typeof benchmark.nationalAvg].toFixed(1)}{item.unit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prescription Patterns */}
      {patterns && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">진료 시간대 패턴</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patterns.consultationPatterns.busyHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}시`} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgPatients" fill="#00C49F" name="평균 환자수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">환자 연령 분포</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patterns.patientDemographics.ageDistribution}
                    dataKey="count"
                    nameKey="range"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ range, percentage }) => `${range}: ${percentage.toFixed(1)}%`}
                  >
                    {patterns.patientDemographics.ageDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
