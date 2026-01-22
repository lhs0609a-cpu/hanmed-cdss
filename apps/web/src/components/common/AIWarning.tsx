import { AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * AI 경고 유형
 */
type AIWarningType =
  | 'api_key_missing'
  | 'api_error'
  | 'parse_error'
  | 'timeout'
  | 'rate_limit'
  | 'fallback'
  | 'low_confidence'

interface AIWarningProps {
  type?: AIWarningType
  message?: string
  className?: string
  onRetry?: () => void
  isRetrying?: boolean
}

/**
 * AI 서비스 오류/경고 표시 컴포넌트
 *
 * AI 분석이 실패하거나 신뢰도가 낮을 때 사용자에게 명확하게 알립니다.
 */
export function AIWarning({
  type = 'fallback',
  message,
  className,
  onRetry,
  isRetrying
}: AIWarningProps) {
  const config = getWarningConfig(type)

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-xl border',
      config.bgColor,
      config.borderColor,
      className
    )}>
      <div className={cn('p-2 rounded-lg', config.iconBgColor)}>
        <config.Icon className={cn('h-5 w-5', config.iconColor)} />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className={cn('font-semibold text-sm', config.titleColor)}>
          {config.title}
        </h4>
        <p className={cn('text-sm mt-1', config.textColor)}>
          {message || config.defaultMessage}
        </p>

        {/* 재시도 버튼 (해당되는 경우) */}
        {onRetry && (type === 'timeout' || type === 'api_error' || type === 'rate_limit') && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className={cn(
              'mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              'bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
              config.textColor
            )}
          >
            <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
            {isRetrying ? '재시도 중...' : '다시 시도'}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * AI 결과 신뢰도 배지
 */
export function AIConfidenceBadge({
  confidence,
  isAiGenerated = true,
  className
}: {
  confidence: number
  isAiGenerated?: boolean
  className?: string
}) {
  if (!isAiGenerated) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
        'bg-red-100 text-red-700 border border-red-200',
        className
      )}>
        <AlertTriangle className="h-3 w-3" />
        AI 분석 아님
      </span>
    )
  }

  const level = getConfidenceLevel(confidence)

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
      level.bgColor,
      level.textColor,
      level.borderColor,
      'border',
      className
    )}>
      {level.showWarning && <AlertCircle className="h-3 w-3" />}
      신뢰도 {Math.round(confidence * 100)}%
    </span>
  )
}

/**
 * AI 분석 상태 표시 (인라인)
 */
export function AIStatusIndicator({
  isAiGenerated,
  hasWarning,
  className
}: {
  isAiGenerated?: boolean
  hasWarning?: boolean
  className?: string
}) {
  if (!isAiGenerated) {
    return (
      <div className={cn(
        'flex items-center gap-1.5 text-red-600 text-xs font-medium',
        className
      )}>
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>AI 분석 실패 - 기본 추천</span>
      </div>
    )
  }

  if (hasWarning) {
    return (
      <div className={cn(
        'flex items-center gap-1.5 text-amber-600 text-xs font-medium',
        className
      )}>
        <AlertCircle className="h-3.5 w-3.5" />
        <span>주의 필요</span>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-emerald-600 text-xs font-medium',
      className
    )}>
      <Info className="h-3.5 w-3.5" />
      <span>AI 분석 완료</span>
    </div>
  )
}

// 경고 설정 타입
interface WarningConfig {
  title: string
  defaultMessage: string
  Icon: typeof AlertTriangle
  bgColor: string
  borderColor: string
  iconBgColor: string
  iconColor: string
  titleColor: string
  textColor: string
}

function getWarningConfig(type: AIWarningType): WarningConfig {
  const configs: Record<AIWarningType, WarningConfig> = {
    api_key_missing: {
      title: 'AI 서비스 미설정',
      defaultMessage: 'AI 서비스가 설정되지 않았습니다. 아래 결과는 기본 데이터베이스 기반 추천으로, AI 분석이 아닙니다. 반드시 한의사의 전문적 판단에 따라 처방을 결정하십시오.',
      Icon: AlertTriangle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      textColor: 'text-red-700',
    },
    api_error: {
      title: 'AI 서비스 오류',
      defaultMessage: 'AI 서비스에 오류가 발생했습니다. 아래 결과는 응급 대체 추천으로, 정확도가 낮을 수 있습니다. 반드시 한의사의 전문적 판단이 필요합니다.',
      Icon: AlertTriangle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      textColor: 'text-red-700',
    },
    parse_error: {
      title: 'AI 응답 처리 오류',
      defaultMessage: 'AI 응답을 처리하는 중 오류가 발생했습니다. 아래는 기본 추천입니다.',
      Icon: AlertCircle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      textColor: 'text-amber-700',
    },
    timeout: {
      title: 'AI 응답 시간 초과',
      defaultMessage: 'AI 서비스 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
      Icon: AlertCircle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      textColor: 'text-amber-700',
    },
    rate_limit: {
      title: 'AI 사용 한도 도달',
      defaultMessage: 'AI 서비스 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.',
      Icon: AlertCircle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      textColor: 'text-amber-700',
    },
    fallback: {
      title: 'AI 분석 불가',
      defaultMessage: '현재 AI 분석을 수행할 수 없습니다. 아래는 기본 데이터베이스 기반 추천입니다.',
      Icon: AlertTriangle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      textColor: 'text-amber-700',
    },
    low_confidence: {
      title: '낮은 신뢰도',
      defaultMessage: 'AI 분석 결과의 신뢰도가 낮습니다. 추가적인 정보 입력이나 한의사의 검토가 권장됩니다.',
      Icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      textColor: 'text-blue-700',
    },
  }

  return configs[type]
}

function getConfidenceLevel(confidence: number) {
  if (confidence >= 0.8) {
    return {
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      showWarning: false,
    }
  }
  if (confidence >= 0.6) {
    return {
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      showWarning: false,
    }
  }
  return {
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    showWarning: true,
  }
}

export default AIWarning
