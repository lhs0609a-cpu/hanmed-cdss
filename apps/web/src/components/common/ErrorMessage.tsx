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

// ========== 추가 표준화된 에러 메시지 ==========

/** 서버 에러 */
export function ServerErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      severity="error"
      message="서버 오류가 발생했습니다"
      description="일시적인 서버 문제입니다. 잠시 후 다시 시도해 주세요."
      suggestion="문제가 지속되면 고객지원에 문의해 주세요."
      onRetry={onRetry}
    />
  )
}

/** 데이터 로드 실패 */
export function DataLoadErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      severity="error"
      message="데이터를 불러올 수 없습니다"
      description="데이터 로드 중 문제가 발생했습니다."
      onRetry={onRetry}
    />
  )
}

/** AI 분석 실패 */
export function AIAnalysisErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      severity="warning"
      message="AI 분석에 실패했습니다"
      description="일시적인 AI 서비스 문제입니다. 잠시 후 다시 시도해 주세요."
      suggestion="입력 내용을 확인하고 다시 시도하세요."
      onRetry={onRetry}
    />
  )
}

/** 검색 결과 없음 */
export function NoResultsMessage({ searchTerm }: { searchTerm?: string }) {
  return (
    <ErrorMessage
      severity="info"
      message="검색 결과가 없습니다"
      description={searchTerm ? `"${searchTerm}"에 대한 검색 결과를 찾을 수 없습니다.` : '조건에 맞는 결과가 없습니다.'}
      suggestion="다른 검색어나 조건으로 다시 시도해 보세요."
    />
  )
}

/** 입력 오류 */
export function ValidationErrorMessage({ message, fields }: { message?: string; fields?: string[] }) {
  return (
    <ErrorMessage
      severity="warning"
      message={message || "입력 내용을 확인해 주세요"}
      description={fields ? `문제가 있는 항목: ${fields.join(', ')}` : undefined}
      suggestion="필수 항목을 모두 입력하고 형식을 확인하세요."
    />
  )
}

/** 세션 만료 */
export function SessionExpiredMessage({ onLogin }: { onLogin?: () => void }) {
  return (
    <ErrorMessage
      severity="warning"
      message="세션이 만료되었습니다"
      description="장시간 미사용으로 로그아웃되었습니다."
      action={onLogin ? { label: '다시 로그인', onClick: onLogin } : undefined}
    />
  )
}

/** 결제 실패 */
export function PaymentErrorMessage({ errorCode, onRetry }: { errorCode?: string; onRetry?: () => void }) {
  const errorMessages: Record<string, string> = {
    'INSUFFICIENT_FUNDS': '잔액이 부족합니다.',
    'CARD_DECLINED': '카드 결제가 거부되었습니다.',
    'CARD_EXPIRED': '카드가 만료되었습니다.',
    'INVALID_CARD': '유효하지 않은 카드입니다.',
    'DEFAULT': '결제 처리 중 문제가 발생했습니다.',
  }

  return (
    <ErrorMessage
      severity="error"
      message="결제에 실패했습니다"
      description={errorMessages[errorCode || 'DEFAULT']}
      suggestion="다른 결제 수단을 사용하거나 카드사에 문의하세요."
      onRetry={onRetry}
    />
  )
}

/** 유지보수 안내 */
export function MaintenanceMessage({ endTime }: { endTime?: string }) {
  return (
    <ErrorMessage
      severity="info"
      message="서비스 점검 중입니다"
      description={endTime ? `예상 완료 시간: ${endTime}` : '잠시 후 다시 이용해 주세요.'}
      suggestion="점검이 완료되면 정상적으로 서비스를 이용하실 수 있습니다."
    />
  )
}

// ========== 표준화된 에러 코드 매핑 ==========

export const ERROR_MESSAGES = {
  // 네트워크
  NETWORK_ERROR: '네트워크 연결을 확인해 주세요.',
  TIMEOUT: '요청 시간이 초과되었습니다. 다시 시도해 주세요.',

  // 인증
  UNAUTHORIZED: '로그인이 필요합니다.',
  SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  INVALID_CREDENTIALS: '아이디 또는 비밀번호가 올바르지 않습니다.',

  // 권한
  FORBIDDEN: '접근 권한이 없습니다.',
  PLAN_REQUIRED: '이 기능은 유료 플랜에서 사용할 수 있습니다.',
  LIMIT_EXCEEDED: '이용 한도를 초과했습니다.',

  // 서버
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  SERVICE_UNAVAILABLE: '서비스를 일시적으로 사용할 수 없습니다.',

  // 데이터
  NOT_FOUND: '요청한 데이터를 찾을 수 없습니다.',
  DATA_LOAD_FAILED: '데이터를 불러오는데 실패했습니다.',
  SAVE_FAILED: '저장에 실패했습니다. 다시 시도해 주세요.',

  // 입력
  VALIDATION_ERROR: '입력 내용을 확인해 주세요.',
  REQUIRED_FIELD: '필수 항목을 입력해 주세요.',
  INVALID_FORMAT: '올바른 형식으로 입력해 주세요.',

  // AI
  AI_ANALYSIS_FAILED: 'AI 분석에 실패했습니다. 다시 시도해 주세요.',
  AI_SERVICE_BUSY: 'AI 서비스가 바쁩니다. 잠시 후 다시 시도해 주세요.',

  // 결제
  PAYMENT_FAILED: '결제에 실패했습니다.',
  CARD_DECLINED: '카드 결제가 거부되었습니다.',

  // 기본
  UNKNOWN: '알 수 없는 오류가 발생했습니다.',
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES

/** 에러 코드로 메시지 가져오기 */
export function getErrorMessage(code: ErrorCode | string): string {
  return ERROR_MESSAGES[code as ErrorCode] || ERROR_MESSAGES.UNKNOWN
}

export default ErrorMessage
