import { LucideIcon, Search, FileText, Users, BookOpen, Inbox, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

// ========== SVG 일러스트레이션 컴포넌트 ==========

/** 검색 결과 없음 일러스트 */
function SearchIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 배경 원 */}
      <circle cx="100" cy="80" r="60" className="fill-gray-100" />
      <circle cx="100" cy="80" r="45" className="fill-gray-50" />

      {/* 돋보기 */}
      <circle cx="90" cy="75" r="25" className="stroke-teal-500" strokeWidth="4" fill="none" />
      <line x1="108" y1="93" x2="125" y2="110" className="stroke-teal-500" strokeWidth="4" strokeLinecap="round" />

      {/* 물음표 */}
      <path
        d="M85 70 Q85 60 95 60 Q105 60 105 70 Q105 75 95 78 L95 82"
        className="stroke-teal-400"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="95" cy="88" r="2" className="fill-teal-400" />

      {/* 장식 점들 - 애니메이션 */}
      <circle cx="140" cy="50" r="3" className="fill-teal-300 animate-pulse" />
      <circle cx="55" cy="55" r="2" className="fill-emerald-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
      <circle cx="150" cy="90" r="2" className="fill-teal-200 animate-pulse" style={{ animationDelay: '1s' }} />
    </svg>
  )
}

/** 데이터 없음 일러스트 */
function NoDataIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 배경 */}
      <circle cx="100" cy="80" r="60" className="fill-gray-100" />

      {/* 빈 문서 스택 */}
      <rect x="70" y="50" width="60" height="75" rx="4" className="fill-white stroke-gray-300" strokeWidth="2" />
      <rect x="75" y="45" width="60" height="75" rx="4" className="fill-white stroke-gray-300" strokeWidth="2" />
      <rect x="80" y="40" width="60" height="75" rx="4" className="fill-white stroke-gray-300" strokeWidth="2" />

      {/* 문서 내용 선 */}
      <line x1="90" y1="55" x2="130" y2="55" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="65" x2="125" y2="65" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="75" x2="120" y2="75" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="85" x2="115" y2="85" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />

      {/* + 아이콘 */}
      <circle cx="145" cy="95" r="15" className="fill-teal-500" />
      <line x1="145" y1="88" x2="145" y2="102" className="stroke-white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="138" y1="95" x2="152" y2="95" className="stroke-white" strokeWidth="2.5" strokeLinecap="round" />

      {/* 장식 */}
      <circle cx="55" cy="60" r="3" className="fill-teal-300 animate-pulse" />
      <circle cx="155" cy="45" r="2" className="fill-emerald-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
    </svg>
  )
}

/** 환자 없음 일러스트 */
function NoPatientsIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 배경 */}
      <circle cx="100" cy="80" r="60" className="fill-gray-100" />

      {/* 중앙 사람 */}
      <circle cx="100" cy="60" r="18" className="fill-teal-100 stroke-teal-400" strokeWidth="2" />
      <path d="M70 110 Q70 90 100 90 Q130 90 130 110" className="fill-teal-100 stroke-teal-400" strokeWidth="2" />

      {/* 왼쪽 점선 사람 */}
      <circle cx="55" cy="70" r="10" className="stroke-gray-300" strokeWidth="2" strokeDasharray="4 2" fill="none" />
      <path d="M40 100 Q40 88 55 88 Q70 88 70 100" className="stroke-gray-300" strokeWidth="2" strokeDasharray="4 2" fill="none" />

      {/* 오른쪽 점선 사람 */}
      <circle cx="145" cy="70" r="10" className="stroke-gray-300" strokeWidth="2" strokeDasharray="4 2" fill="none" />
      <path d="M130 100 Q130 88 145 88 Q160 88 160 100" className="stroke-gray-300" strokeWidth="2" strokeDasharray="4 2" fill="none" />

      {/* + 버튼 */}
      <circle cx="100" cy="135" r="12" className="fill-teal-500" />
      <line x1="100" y1="129" x2="100" y2="141" className="stroke-white" strokeWidth="2" strokeLinecap="round" />
      <line x1="94" y1="135" x2="106" y2="135" className="stroke-white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** 치험례 없음 일러스트 */
function NoCasesIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 배경 */}
      <circle cx="100" cy="80" r="60" className="fill-gray-100" />

      {/* 책 아이콘 */}
      <path d="M60 50 L100 60 L140 50 L140 110 L100 120 L60 110 Z" className="fill-white stroke-teal-400" strokeWidth="2" />
      <line x1="100" y1="60" x2="100" y2="120" className="stroke-teal-400" strokeWidth="2" />

      {/* 왼쪽 페이지 텍스트 */}
      <line x1="70" y1="70" x2="90" y2="73" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="80" x2="88" y2="82" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="90" x2="85" y2="92" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />

      {/* 오른쪽 페이지 텍스트 */}
      <line x1="110" y1="73" x2="130" y2="70" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />
      <line x1="112" y1="82" x2="130" y2="80" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />
      <line x1="115" y1="92" x2="130" y2="90" className="stroke-gray-200" strokeWidth="2" strokeLinecap="round" />

      {/* AI 스파클 */}
      <circle cx="145" cy="45" r="12" className="fill-amber-100" />
      <path d="M145 38 L147 43 L152 45 L147 47 L145 52 L143 47 L138 45 L143 43 Z" className="fill-amber-500" />

      {/* 장식 */}
      <circle cx="50" cy="70" r="3" className="fill-teal-300 animate-pulse" />
      <circle cx="155" cy="100" r="2" className="fill-emerald-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
    </svg>
  )
}

/** 에러 상태 일러스트 */
function ErrorIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 배경 */}
      <circle cx="100" cy="80" r="60" className="fill-red-50" />

      {/* 경고 삼각형 */}
      <path d="M100 40 L140 110 L60 110 Z" className="fill-white stroke-red-400" strokeWidth="2" strokeLinejoin="round" />

      {/* 느낌표 */}
      <line x1="100" y1="60" x2="100" y2="85" className="stroke-red-500" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="98" r="3" className="fill-red-500" />

      {/* 톱니바퀴 (설정 문제 암시) */}
      <circle cx="145" cy="50" r="12" className="fill-gray-200" />
      <path
        d="M145 42 L147 45 L152 45 L148 48 L149 53 L145 50 L141 53 L142 48 L138 45 L143 45 Z"
        className="fill-gray-400"
      />
      <circle cx="145" cy="50" r="4" className="fill-gray-200" />

      {/* 번개 (연결 문제 암시) */}
      <path d="M55 55 L52 70 L58 68 L54 82 L62 65 L56 67 Z" className="fill-amber-400" />
    </svg>
  )
}

/** 일반 빈 상태 일러스트 */
function EmptyBoxIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 배경 */}
      <circle cx="100" cy="80" r="60" className="fill-gray-100" />

      {/* 상자 */}
      <path d="M60 70 L100 50 L140 70 L140 110 L100 130 L60 110 Z" className="fill-white stroke-teal-400" strokeWidth="2" />
      <path d="M60 70 L100 90 L140 70" className="stroke-teal-400" strokeWidth="2" fill="none" />
      <line x1="100" y1="90" x2="100" y2="130" className="stroke-teal-400" strokeWidth="2" />

      {/* 상자 열린 뚜껑 */}
      <path d="M60 70 L100 50 L100 35 L70 50 Z" className="fill-teal-100 stroke-teal-400" strokeWidth="2" />
      <path d="M140 70 L100 50 L100 35 L130 50 Z" className="fill-teal-50 stroke-teal-400" strokeWidth="2" />

      {/* 별 장식 */}
      <path d="M70 45 L72 49 L76 50 L73 53 L74 57 L70 55 L66 57 L67 53 L64 50 L68 49 Z" className="fill-amber-400 animate-pulse" />
      <path d="M130 55 L131 58 L134 58 L132 60 L133 63 L130 61 L127 63 L128 60 L126 58 L129 58 Z" className="fill-teal-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
      <path d="M100 25 L101 27 L103 27 L102 29 L102 31 L100 30 L98 31 L98 29 L97 27 L99 27 Z" className="fill-emerald-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
    </svg>
  )
}

// 일러스트 타입
type IllustrationType = 'search' | 'no-data' | 'no-patients' | 'no-cases' | 'error' | 'empty'

const illustrationMap: Record<IllustrationType, React.FC<{ className?: string }>> = {
  'search': SearchIllustration,
  'no-data': NoDataIllustration,
  'no-patients': NoPatientsIllustration,
  'no-cases': NoCasesIllustration,
  'error': ErrorIllustration,
  'empty': EmptyBoxIllustration,
}

interface EmptyStateProps {
  /** 아이콘 (레거시 지원) */
  icon?: LucideIcon
  /** 일러스트레이션 타입 (권장) */
  illustration?: IllustrationType
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
  illustration,
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

  const IllustrationComponent = illustration ? illustrationMap[illustration] : null

  const actionButtonClass = cn(
    'px-4 py-2 rounded-xl font-medium transition-all',
    action?.variant === 'secondary'
      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30'
  )

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        isCompact ? 'py-8 px-4' : 'py-16 px-6',
        isCentered && 'min-h-[400px] justify-center',
        className
      )}
    >
      {IllustrationComponent ? (
        <IllustrationComponent className={cn(isCompact ? 'w-32 h-24 mb-4' : 'w-48 h-36 mb-6')} />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-inner',
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
      )}

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
            'text-gray-500 mt-2 max-w-md',
            isCompact ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </p>
      )}

      {hint && (
        <p className="text-xs text-gray-400 mt-3 max-w-sm bg-gray-50 px-3 py-1.5 rounded-full">{hint}</p>
      )}

      {(action || secondaryAction) && (
        <div className={cn('flex items-center gap-3', isCompact ? 'mt-4' : 'mt-6')}>
          {action && (
            action.href ? (
              <Link to={action.href} className={actionButtonClass}>
                {action.label}
              </Link>
            ) : (
              <button onClick={action.onClick} className={actionButtonClass}>
                {action.label}
              </button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                to={secondaryAction.href}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors underline-offset-2 hover:underline"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                onClick={secondaryAction.onClick}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors underline-offset-2 hover:underline"
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
      illustration="search"
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
      illustration="no-data"
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
      illustration="no-patients"
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
      illustration="no-cases"
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
      illustration="error"
      title={title}
      description={description || '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
      action={onRetry ? { label: '다시 시도', onClick: onRetry } : undefined}
      secondaryAction={{ label: '문의하기', href: 'mailto:support@ongojisin.ai' }}
    />
  )
}

/** 빈 상자 상태 - 커스텀 메시지용 */
export function GeneralEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: { label: string; onClick?: () => void; href?: string }
}) {
  return (
    <EmptyState
      illustration="empty"
      title={title}
      description={description}
      action={action}
    />
  )
}

// 일러스트레이션 컴포넌트 내보내기 (고급 사용자용)
export {
  SearchIllustration,
  NoDataIllustration,
  NoPatientsIllustration,
  NoCasesIllustration,
  ErrorIllustration,
  EmptyBoxIllustration,
}

export default EmptyState
