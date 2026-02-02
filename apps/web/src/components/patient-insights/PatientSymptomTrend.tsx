import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { usePatientSymptomSummary } from '@/hooks/usePatientInsights';

interface PatientSymptomTrendProps {
  patientId: string;
  days?: number;
}

export function PatientSymptomTrend({ patientId, days = 30 }: PatientSymptomTrendProps) {
  const { data: summary, isLoading } = usePatientSymptomSummary(patientId, days);

  const getTrendIcon = (trend: 'improving' | 'stable' | 'worsening') => {
    switch (trend) {
      case 'improving':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      case 'worsening':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'worsening') => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50';
      case 'worsening':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendLabel = (trend: 'improving' | 'stable' | 'worsening') => {
    switch (trend) {
      case 'improving':
        return '호전';
      case 'worsening':
        return '악화';
      default:
        return '유지';
    }
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

  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
        증상 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">증상 추이</h3>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getTrendColor(
            summary.overallTrend
          )}`}
        >
          {getTrendIcon(summary.overallTrend)}
          전체 {getTrendLabel(summary.overallTrend)}
        </div>
      </div>

      {/* Health Score Chart */}
      {summary.healthScoreHistory.length > 0 && (
        <div className="p-4 border-b">
          <h4 className="text-sm font-medium text-gray-600 mb-3">건강 점수 변화</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.healthScoreHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString('ko-KR')}
                  formatter={(v: number) => [`${v}점`, '건강 점수']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Symptoms List */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-600 mb-3">주요 증상 현황</h4>
        <div className="space-y-3">
          {summary.symptoms.slice(0, 5).map((symptom) => (
            <div key={symptom.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {getTrendIcon(symptom.trend)}
                </div>
                <span className="font-medium">{symptom.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">
                    심각도 {symptom.avgSeverity.toFixed(1)}/10
                  </p>
                  <p className="text-xs text-gray-500">{symptom.occurrences}회 기록</p>
                </div>
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      symptom.avgSeverity >= 7
                        ? 'bg-red-400'
                        : symptom.avgSeverity >= 4
                        ? 'bg-yellow-400'
                        : 'bg-green-400'
                    }`}
                    style={{ width: `${symptom.avgSeverity * 10}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {summary.keyInsights.length > 0 && (
        <div className="p-4 bg-blue-50 border-t">
          <h4 className="text-sm font-medium text-blue-700 mb-2">AI 인사이트</h4>
          <ul className="space-y-1">
            {summary.keyInsights.map((insight, index) => (
              <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <div className="p-4 bg-green-50 border-t">
          <h4 className="text-sm font-medium text-green-700 mb-2">권장 사항</h4>
          <ul className="space-y-1">
            {summary.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-green-600 flex items-start gap-2">
                <span className="text-green-400">✓</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PatientSymptomTrend;
