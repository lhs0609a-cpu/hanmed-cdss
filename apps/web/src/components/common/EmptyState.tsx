import { LucideIcon, Search, FileText, Users, BookOpen, Inbox, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  /** 아이콘 */
  icon?: LucideIcon
  /** 제목 */
  title: string
  /** 설명 */
  description?: string
  /** 추가 설명 또는 힌트 */
  hint?: string
  /** 액션 버튼 */
  action?: {
    label: string
    onClick?: () => void
    href?: string
    variant?: 'primary' | 'secondary'
  }
  /** 보조 액션 */
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  /** 스타일 변형 */
  variant?: 'default' | 'compact' | 'centered'
  /** 추가 클래스 */
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  hint,
  action,
  secondaryAction,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const isCompact = variant === 'compact'
  const isCentered = variant === 'centered'

  const ActionButton = action?.href ? Link : 'button'

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        isCompact ? 'py-8 px-4' : 'py-16 px-6',
        isCentered && 'min-h-[400px] justify-center',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-gray-100 flex items-center justify-center',
          isCompact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'
        )}
      >
        <Icon
          className={cn(
            'text-gray-400',
            isCompact ? 'w-6 h-6' : 'w-8 h-8'
          )}
        />
      </div>

      <h3
        className={cn(
          'font-semibold text-gray-900',
          isCompact ? 'text-base' : 'text-lg'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'text-gray-500 mt-1 max-w-md',
            isCompact ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </p>
      )}

      {hint && (
        <p className="text-xs text-gray-400 mt-2 max-w-sm">{hint}</p>
      )}

      {(action || secondaryAction) && (
        <div className={cn('flex items-center gap-3', isCompact ? 'mt-4' : 'mt-6')}>
          {action && (
            <ActionButton
              {...(action.href ? { to: action.href } : { onClick: action.onClick })}
              className={cn(
                'px-4 py-2 rounded-xl font-medium transition-colors',
                action.variant === 'secondary'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              )}
            >
              {action.label}
            </ActionButton>
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                to={secondaryAction.href}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                onClick={secondaryAction.onClick}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ========== 프리셋 Empty States ==========

/** 검색 결과 없음 */
export function SearchEmptyState({
  query,
  onClear,
  suggestions,
}: {
  query?: string
  onClear?: () => void
  suggestions?: string[]
}) {
  return (
    <EmptyState
      icon={Search}
      title="검색 결과가 없습니다"
      description={query ? `"${query}"에 대한 검색 결과를 찾을 수 없습니다.` : '검색어를 입력해 주세요.'}
      hint={suggestions?.length ? `추천 검색어: ${suggestions.join(', ')}` : '다른 검색어로 시도해 보세요.'}
      action={onClear ? { label: '검색어 지우기', onClick: onClear, variant: 'secondary' } : undefined}
    />
  )
}

/** 데이터 없음 */
export function NoDataEmptyState({
  title = '데이터가 없습니다',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: { label: string; onClick?: () => void; href?: string }
}) {
  return (
    <EmptyState
      icon={FileText}
      title={title}
      description={description || '아직 등록된 데이터가 없습니다.'}
      action={action}
    />
  )
}

/** 환자 없음 */
export function NoPatientsEmptyState({
  onAddPatient,
}: {
  onAddPatient?: () => void
}) {
  return (
    <EmptyState
      icon={Users}
      title="등록된 환자가 없습니다"
      description="첫 번째 환자를 등록하고 진료를 시작하세요."
      action={onAddPatient ? { label: '환자 등록', onClick: onAddPatient } : undefined}
    />
  )
}

/** 치험례 없음 */
export function NoCasesEmptyState() {
  return (
    <EmptyState
      icon={BookOpen}
      title="조건에 맞는 치험례가 없습니다"
      description="검색 조건을 변경하거나 다른 증상으로 검색해 보세요."
      hint="한글 또는 한자로 검색할 수 있습니다."
      action={{ label: 'AI 치험례 검색', href: '/dashboard/case-search' }}
    />
  )
}

/** 에러 상태 */
export function ErrorEmptyState({
  title = '문제가 발생했습니다',
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description || '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
      action={onRetry ? { label: '다시 시도', onClick: onRetry } : undefined}
      secondaryAction={{ label: '문의하기', href: 'mailto:support@ongojisin.ai' }}
    />
  )
}

export default EmptyState
