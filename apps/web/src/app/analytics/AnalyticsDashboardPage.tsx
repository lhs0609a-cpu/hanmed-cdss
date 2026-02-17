import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Activity,
  Target,
  Award,
  Download,
  RefreshCw,
} from 'lucide-react';
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
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  useDashboardMetrics,
  useTrends,
  useBenchmark,
  usePrescriptionPatterns,
  useTopItems,
  useTodayActivity,
} from '@/hooks/useAnalytics';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AnalyticsDashboardPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: trends } = useTrends(dateRange.startDate, dateRange.endDate, 'day');
  const { data: benchmark } = useBenchmark();
  const { data: patterns } = usePrescriptionPatterns();
  const { data: topFormulas } = useTopItems('formulas', 10);
  const { data: todayActivity } = useTodayActivity();

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
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Download className="w-4 h-4" />
            리포트 다운로드
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className={`text-sm font-medium ${getChangeColor(metrics?.overview?.totalPatientsChange || 0)}`}>
              {formatChange(metrics?.overview?.totalPatientsChange || 0)}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{metrics?.overview?.totalPatients?.toLocaleString() ?? 0}</p>
            <p className="text-gray-500 text-sm">총 환자 수</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className={`text-sm font-medium ${getChangeColor((metrics?.returnRate?.current || 0) - (metrics?.returnRate?.previous || 0))}`}>
              {metrics?.returnRate?.trend === 'up' ? '↑' : metrics?.returnRate?.trend === 'down' ? '↓' : '→'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{metrics?.returnRate?.current?.toFixed(1) ?? 0}%</p>
            <p className="text-gray-500 text-sm">재방문율</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-green-600">
              {metrics?.aiUsage?.acceptanceRate?.toFixed(0) ?? 0}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{metrics?.aiUsage?.totalRecommendations?.toLocaleString() ?? 0}</p>
            <p className="text-gray-500 text-sm">AI 추천 활용</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Activity className="w-6 h-6 text-amber-600" />
            </div>
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
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
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

        {/* Patient Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">환자 분포</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends?.patients || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="new" stroke="#00C49F" name="신환" />
                <Line type="monotone" dataKey="returning" stroke="#0088FE" name="재진" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Formulas */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
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
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">오늘의 활동</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">오늘 진료</span>
              </div>
              <span className="text-xl font-bold text-blue-600">
                {todayActivity?.consultationsToday || 0}건
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">내원 환자</span>
              </div>
              <span className="text-xl font-bold text-green-600">
                {todayActivity?.patientsToday || 0}명
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <span className="text-gray-700">처방 건수</span>
              </div>
              <span className="text-xl font-bold text-purple-600">
                {todayActivity?.prescriptionsToday || 0}건
              </span>
            </div>
          </div>

          {/* Hourly Breakdown */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-600 mb-3">시간대별 진료</h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todayActivity?.hourlyBreakdown || []}>
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}시`} />
                  <Tooltip />
                  <Bar dataKey="consultations" fill="#8884D8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Benchmark Section */}
      {benchmark && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-amber-500" />
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
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
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

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
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
