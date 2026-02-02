import {
  Calendar,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Pill,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { usePreVisitAnalysis } from '@/hooks/usePatientInsights';

interface PreVisitSummaryProps {
  patientId: string;
  reservationId?: string;
}

export function PreVisitSummary({ patientId, reservationId }: PreVisitSummaryProps) {
  const { data: analysis, isLoading } = usePreVisitAnalysis(patientId, reservationId);

  const getTrendIcon = (trend: 'better' | 'same' | 'worse') => {
    switch (trend) {
      case 'better':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      case 'worse':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: 'warning' | 'info' | 'critical') => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getAlertBg = (type: 'warning' | 'info' | 'critical') => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
        환자 데이터가 부족합니다
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <h3 className="font-semibold">진료 전 AI 분석</h3>
        </div>
        <p className="text-sm text-blue-100 mt-1">
          마지막 방문: {new Date(analysis.summary.lastVisitDate).toLocaleDateString('ko-KR')} (
          {analysis.summary.daysSinceLastVisit}일 전)
        </p>
      </div>

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <div className="p-4 space-y-2 border-b">
          {analysis.alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertBg(alert.type)}`}
            >
              {getAlertIcon(alert.type)}
              <span className="text-sm">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Health Score */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">현재 건강 점수</p>
            <p className="text-3xl font-bold text-gray-900">
              {analysis.summary.currentHealthScore}
              <span className="text-lg text-gray-400">/100</span>
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full flex items-center gap-1 ${
              analysis.summary.scoreChange > 0
                ? 'bg-green-100 text-green-700'
                : analysis.summary.scoreChange < 0
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {analysis.summary.scoreChange > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : analysis.summary.scoreChange < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            {analysis.summary.scoreChange > 0 ? '+' : ''}
            {analysis.summary.scoreChange}점
          </div>
        </div>
      </div>

      {/* Symptom Changes */}
      <div className="p-4 border-b">
        <h4 className="text-sm font-medium text-gray-700 mb-3">증상 변화</h4>
        <div className="space-y-2">
          {analysis.symptomChanges.slice(0, 4).map((change) => (
            <div key={change.symptom} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTrendIcon(change.trend)}
                <span className="text-sm">{change.symptom}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">{change.previousSeverity}</span>
                <span className="text-gray-300">→</span>
                <span
                  className={
                    change.trend === 'better'
                      ? 'text-green-600 font-medium'
                      : change.trend === 'worse'
                      ? 'text-red-600 font-medium'
                      : 'text-gray-600'
                  }
                >
                  {change.currentSeverity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medication Adherence */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Pill className="w-4 h-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">복약 순응도</h4>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  analysis.medicationAdherence.overallRate >= 80
                    ? 'bg-green-400'
                    : analysis.medicationAdherence.overallRate >= 50
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                }`}
                style={{ width: `${analysis.medicationAdherence.overallRate}%` }}
              />
            </div>
          </div>
          <span
            className={`font-medium ${
              analysis.medicationAdherence.overallRate >= 80
                ? 'text-green-600'
                : analysis.medicationAdherence.overallRate >= 50
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {analysis.medicationAdherence.overallRate}%
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {analysis.medicationAdherence.takenDoses}/{analysis.medicationAdherence.totalDoses}회 복용
          {analysis.medicationAdherence.missedDoses > 0 &&
            ` · ${analysis.medicationAdherence.missedDoses}회 누락`}
        </p>
        {analysis.medicationAdherence.pattern && (
          <p className="text-xs text-gray-500 mt-1">
            패턴: {analysis.medicationAdherence.pattern}
          </p>
        )}
      </div>

      {/* Suggested Questions */}
      {analysis.suggestedQuestions.length > 0 && (
        <div className="p-4 bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">추천 질문</h4>
          </div>
          <ul className="space-y-2">
            {analysis.suggestedQuestions.map((question, index) => (
              <li
                key={index}
                className="text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-100"
              >
                "{question}"
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Previous Treatment Summary */}
      {analysis.previousTreatmentSummary && (
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">이전 치료 요약</h4>
          </div>
          <p className="text-sm text-gray-600">{analysis.previousTreatmentSummary}</p>
        </div>
      )}
    </div>
  );
}

export default PreVisitSummary;
