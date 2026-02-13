import {
  LineChart,
  Line,
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
  Area,
  AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Activity, PieChart as PieChartIcon, BarChart3, Info } from 'lucide-react'

// 샘플 데이터 (실제 진료 기록이 쌓이면 API 데이터로 대체됩니다)
const monthlyConsultations = [
  { month: '1월', consultations: 45, aiUsage: 38 },
  { month: '2월', consultations: 52, aiUsage: 45 },
  { month: '3월', consultations: 48, aiUsage: 42 },
  { month: '4월', consultations: 61, aiUsage: 55 },
  { month: '5월', consultations: 55, aiUsage: 48 },
  { month: '6월', consultations: 67, aiUsage: 60 },
]

const prescriptionDistribution = [
  { name: '보중익기탕', value: 25, color: '#14b8a6' },
  { name: '소시호탕', value: 18, color: '#f59e0b' },
  { name: '육미지황환', value: 15, color: '#8b5cf6' },
  { name: '사물탕', value: 12, color: '#ec4899' },
  { name: '기타', value: 30, color: '#94a3b8' },
]

const weeklyActivity = [
  { day: '월', patients: 8, prescriptions: 6 },
  { day: '화', patients: 12, prescriptions: 10 },
  { day: '수', patients: 15, prescriptions: 13 },
  { day: '목', patients: 10, prescriptions: 8 },
  { day: '금', patients: 18, prescriptions: 15 },
  { day: '토', patients: 6, prescriptions: 5 },
]

const symptomTrends = [
  { month: '1월', 소화불량: 15, 두통: 12, 요통: 18, 불면: 8 },
  { month: '2월', 소화불량: 18, 두통: 14, 요통: 15, 불면: 10 },
  { month: '3월', 소화불량: 12, 두통: 18, 요통: 20, 불면: 12 },
  { month: '4월', 소화불량: 20, 두통: 10, 요통: 16, 불면: 15 },
  { month: '5월', 소화불량: 16, 두통: 15, 요통: 22, 불면: 11 },
  { month: '6월', 소화불량: 22, 두통: 13, 요통: 18, 불면: 14 },
]

/**
 * 월별 진료 현황 차트
 */
export function MonthlyConsultationChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-500" />
          월별 진료 현황
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyConsultations}>
              <defs>
                <linearGradient id="colorConsultations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="consultations"
                name="전체 진료"
                stroke="#14b8a6"
                fill="url(#colorConsultations)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="aiUsage"
                name="AI 활용"
                stroke="#f59e0b"
                fill="url(#colorAI)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 처방 분포 파이 차트
 */
export function PrescriptionDistributionChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-purple-500" />
          처방 분포
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={prescriptionDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {prescriptionDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {prescriptionDistribution.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 주간 활동 바 차트
 */
export function WeeklyActivityChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          주간 활동
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="patients" name="환자 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prescriptions" name="처방 건수" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 증상 트렌드 라인 차트
 */
export function SymptomTrendChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-rose-500" />
          증상별 트렌드
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={symptomTrends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-gray-500 dark:text-gray-400"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="소화불량" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="두통" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="요통" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="불면" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 대시보드 통계 차트 그리드
 */
export function DashboardCharts() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
        <Info className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <span>아래 차트는 샘플 데이터입니다. 실제 진료 기록이 쌓이면 자동으로 반영됩니다.</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyConsultationChart />
        <PrescriptionDistributionChart />
        <WeeklyActivityChart />
        <SymptomTrendChart />
      </div>
    </div>
  )
}
