import { Pill, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAdherenceReport } from '@/hooks/usePatientInsights';

interface AdherenceChartProps {
  patientId: string;
  prescriptionId?: string;
}

export function AdherenceChart({ patientId, prescriptionId }: AdherenceChartProps) {
  const { data: report, isLoading } = useAdherenceReport(patientId, prescriptionId);

  const getAdherenceColor = (rate: number) => {
    if (rate >= 80) return '#22C55E';
    if (rate >= 50) return '#EAB308';
    return '#EF4444';
  };

  const getAdherenceLabel = (rate: number) => {
    if (rate >= 80) return { label: '우수', color: 'text-green-600 bg-green-50' };
    if (rate >= 50) return { label: '보통', color: 'text-yellow-600 bg-yellow-50' };
    return { label: '주의', color: 'text-red-600 bg-red-50' };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
        복약 기록이 없습니다
      </div>
    );
  }

  const adherenceStatus = getAdherenceLabel(report.overall.adherenceRate);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">복약 순응도</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${adherenceStatus.color}`}>
          {adherenceStatus.label}
        </span>
      </div>

      {/* Overall Stats */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="relative w-24 h-24">
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
                  stroke={getAdherenceColor(report.overall.adherenceRate)}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(report.overall.adherenceRate / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {report.overall.adherenceRate.toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">전체 순응도</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{report.overall.takenDoses}</p>
              <p className="text-xs text-green-600">복용</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{report.overall.missedDoses}</p>
              <p className="text-xs text-red-600">누락</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{report.overall.lateDoses}</p>
              <p className="text-xs text-yellow-600">지연</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{report.overall.totalDoses}</p>
              <p className="text-xs text-gray-600">전체</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Chart */}
      {report.daily.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">일별 복약 현황</h4>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.daily.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString('ko-KR', { day: 'numeric' })
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString('ko-KR')}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'taken' ? '복용' : name === 'missed' ? '누락' : name,
                  ]}
                />
                <Bar dataKey="taken" stackId="a" fill="#22C55E" name="복용" />
                <Bar dataKey="missed" stackId="a" fill="#EF4444" name="누락" />
                <Bar dataKey="late" stackId="a" fill="#EAB308" name="지연" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Patterns & Insights */}
      {report.patterns && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">패턴 분석</h4>
          </div>

          {report.patterns.insights.length > 0 && (
            <div className="space-y-2 mb-4">
              {report.patterns.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{insight}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {report.patterns.bestDays.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-green-700 font-medium mb-1">복용 잘 하는 요일</p>
                <p className="text-green-600">{report.patterns.bestDays.join(', ')}</p>
              </div>
            )}
            {report.patterns.worstDays.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-red-700 font-medium mb-1">누락 많은 요일</p>
                <p className="text-red-600">{report.patterns.worstDays.join(', ')}</p>
              </div>
            )}
          </div>

          {report.patterns.commonMissedTimes.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
              <p className="text-yellow-700 font-medium text-sm mb-1">자주 누락되는 시간대</p>
              <p className="text-yellow-600 text-sm">
                {report.patterns.commonMissedTimes.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* By Medication */}
      {report.byMedication && report.byMedication.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">약물별 순응도</h4>
          <div className="space-y-3">
            {report.byMedication.map((med) => (
              <div key={med.medicationName} className="flex items-center gap-3">
                <span className="text-sm flex-1 truncate">{med.medicationName}</span>
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${med.adherenceRate}%`,
                      backgroundColor: getAdherenceColor(med.adherenceRate),
                    }}
                  />
                </div>
                <span
                  className="text-sm font-medium w-12 text-right"
                  style={{ color: getAdherenceColor(med.adherenceRate) }}
                >
                  {med.adherenceRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdherenceChart;
