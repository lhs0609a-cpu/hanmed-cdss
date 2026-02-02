import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ChevronRight,
  Bell,
  Users,
} from 'lucide-react';
import { usePatientAlerts, type PatientAlert } from '@/hooks/usePatientInsights';

interface PatientAlertBannerProps {
  maxAlerts?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export function PatientAlertBanner({ maxAlerts = 5, severity }: PatientAlertBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const { data: alerts, isLoading } = usePatientAlerts({ unreadOnly: true, severity });

  const getAlertIcon = (type: PatientAlert['type']) => {
    switch (type) {
      case 'symptom_worsening':
      case 'health_score_drop':
        return <AlertTriangle className="w-4 h-4" />;
      case 'low_adherence':
      case 'missed_appointment':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getAlertStyle = (severity: PatientAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          text: 'text-red-800',
          badge: 'bg-red-500',
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          icon: 'text-orange-500',
          text: 'text-orange-800',
          badge: 'bg-orange-500',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-500',
          text: 'text-yellow-800',
          badge: 'bg-yellow-500',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          text: 'text-blue-800',
          badge: 'bg-blue-500',
        };
    }
  };

  const getTypeLabel = (type: PatientAlert['type']) => {
    switch (type) {
      case 'symptom_worsening':
        return '증상 악화';
      case 'low_adherence':
        return '복약 순응도 저하';
      case 'health_score_drop':
        return '건강점수 하락';
      case 'missed_appointment':
        return '예약 미방문';
      case 'no_journal':
        return '증상일지 미기록';
      default:
        return '알림';
    }
  };

  const handleDismiss = (alertId: string) => {
    setDismissedIds((prev) => [...prev, alertId]);
  };

  if (isLoading) {
    return null;
  }

  const visibleAlerts =
    alerts?.filter((alert) => !dismissedIds.includes(alert.id)).slice(0, maxAlerts) || [];

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-6">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">환자 알림</h3>
          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
            {alerts?.length || 0}건
          </span>
        </div>
        <Link
          to="/dashboard/patients"
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          전체 보기
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Alert Cards */}
      <div className="space-y-2">
        {visibleAlerts.map((alert) => {
          const style = getAlertStyle(alert.severity);

          return (
            <div
              key={alert.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
            >
              <div className={style.icon}>{getAlertIcon(alert.type)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/dashboard/patients/${alert.patientId}`}
                    className={`font-medium hover:underline ${style.text}`}
                  >
                    {alert.patient?.name || '환자'}
                  </Link>
                  <span className={`px-1.5 py-0.5 text-xs text-white rounded ${style.badge}`}>
                    {getTypeLabel(alert.type)}
                  </span>
                </div>
                <p className={`text-sm ${style.text} opacity-80 truncate`}>{alert.message}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {new Date(alert.createdAt).toLocaleDateString('ko-KR')}
                </span>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="p-1 hover:bg-white/50 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* More alerts indicator */}
      {(alerts?.length || 0) > maxAlerts && (
        <div className="text-center">
          <Link
            to="/dashboard/patients"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            +{(alerts?.length || 0) - maxAlerts}건 더 보기
          </Link>
        </div>
      )}
    </div>
  );
}

export default PatientAlertBanner;
