import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  RefreshCw,
  ArrowRight,
  LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

type ErrorSeverity = 'error' | 'warning' | 'info' | 'success'

interface ErrorMessageProps {
  /** 에러 메시지 */
  message: string
  /** 상세 설명 */
  description?: string
  /** 심각도 */
  severity?: ErrorSeverity
  /** 해결 방법 제안 */
  suggestion?: string
  /** 재시도 버튼 */
  onRetry?: () => void
  /** 닫기 버튼 */
  onDismiss?: () => void
  /** 액션 버튼 */
  action?: {
    label: string
    onClick: () => void
  }
  /** 컴팩트 모드 */
  compact?: boolean
  /** 추가 클래스 */
  className?: string
}

const severityConfig: Record<
  ErrorSeverity,
  {
    icon: LucideIcon
    bgColor: string
    borderColor: string
    iconColor: string
    textColor: string
    buttonColor: string
  }
> = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    iconColor: 'text-red-500',
    textColor: 'text-red-800',
    buttonColor: 'bg-red-100 hover:bg-red-200 text-red-700',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    iconColor: 'text-amber-500',
    textColor: 'text-amber-800',
    buttonColor: 'bg-amber-100 hover:bg-amber-200 text-amber-700',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800',
    buttonColor: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    iconColor: 'text-emerald-500',
    textColor: 'text-emerald-800',
    buttonColor: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700',
  },
}

export function ErrorMessage({
  message,
  description,
  severity = 'error',
  suggestion,
  onRetry,
  onDismiss,
  action,
  compact = false,
  className,
}: ErrorMessageProps) {
  const [dismissed, setDismissed] = useState(false)
  const config = severityConfig[severity]
  const Icon = config.icon

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
          config.bgColor,
          config.borderColor,
          'border',
          className
        )}
      >
        <Icon className={cn('w-4 h-4 flex-shrink-0', config.iconColor)} />
        <span className={config.textColor}>{message}</span>
        {onDismiss && (
          <button onClick={handleDismiss} className="ml-auto p-1 hover:bg-black/5 rounded">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            severity === 'error' ? 'bg-red-100' :
            severity === 'warning' ? 'bg-amber-100' :
            severity === 'info' ? 'bg-blue-100' :
            'bg-emerald-100'
          )}
        >
          <Icon className={cn('w-5 h-5', config.iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold', config.textColor)}>{message}</p>

          {description && (
            <p className={cn('text-sm mt-1 opacity-80', config.textColor)}>
              {description}
            </p>
          )}

          {suggestion && (
            <p className="text-sm mt-2 text-gray-600">
              <span className="font-medium">해결 방법:</span> {suggestion}
            </p>
          )}

          {(onRetry || action) && (
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    config.buttonColor
                  )}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  다시 시도
                </button>
              )}

              {action && (
                <button
                  onClick={action.onClick}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    config.buttonColor
                  )}
                >
                  {action.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors self-start"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  )
}

// ========== 프리셋 에러 메시지 ==========

/** 네트워크 에러 */
export function NetworkErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      severity="error"
      message="네트워크 연결 오류"
      description="서버와 연결할 수 없습니다."
      suggestion="인터넷 연결을 확인하고 다시 시도해 주세요."
      onRetry={onRetry}
    />
  )
}

/** 권한 에러 */
export function PermissionErrorMessage({ onLogin }: { onLogin?: () => void }) {
  return (
    <ErrorMessage
      severity="warning"
      message="접근 권한이 없습니다"
      description="이 기능을 사용하려면 로그인이 필요합니다."
      action={onLogin ? { label: '로그인하기', onClick: onLogin } : undefined}
    />
  )
}

/** 플랜 업그레이드 필요 */
export function UpgradeRequiredMessage({ onUpgrade }: { onUpgrade?: () => void }) {
  return (
    <ErrorMessage
      severity="info"
      message="Pro 플랜이 필요합니다"
      description="이 기능은 Pro 플랜 이상에서 사용할 수 있습니다."
      action={onUpgrade ? { label: '플랜 업그레이드', onClick: onUpgrade } : undefined}
    />
  )
}

/** 사용량 초과 */
export function UsageLimitMessage({ onUpgrade }: { onUpgrade?: () => void }) {
  return (
    <ErrorMessage
      severity="warning"
      message="이번 달 사용량을 초과했습니다"
      description="무료 플랜의 AI 쿼리 한도에 도달했습니다."
      suggestion="Pro 플랜으로 업그레이드하여 무제한으로 사용하세요."
      action={onUpgrade ? { label: '업그레이드', onClick: onUpgrade } : undefined}
    />
  )
}

/** 성공 메시지 */
export function SuccessMessage({
  message,
  description,
  onDismiss,
}: {
  message: string
  description?: string
  onDismiss?: () => void
}) {
  return (
    <ErrorMessage
      severity="success"
      message={message}
      description={description}
      onDismiss={onDismiss}
    />
  )
}

export default ErrorMessage
