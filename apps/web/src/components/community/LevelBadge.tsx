import { cn } from '@/lib/utils'
import { CommunityLevel, LEVEL_STYLES } from '@/types/level'
import {
  Stethoscope,
  UserCheck,
  Award,
  Star,
  Crown,
  Trophy,
} from 'lucide-react'

const icons = {
  Stethoscope,
  UserCheck,
  Award,
  Star,
  Crown,
  Trophy,
}

interface LevelBadgeProps {
  level: CommunityLevel
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showName?: boolean
  variant?: 'default' | 'outline' | 'gradient'
  className?: string
}

const sizeClasses = {
  xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
}

const iconSizes = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export function LevelBadge({
  level,
  size = 'md',
  showIcon = true,
  showName = true,
  variant = 'default',
  className,
}: LevelBadgeProps) {
  const style = LEVEL_STYLES[level]
  const Icon = icons[style.icon]

  const baseClasses = 'inline-flex items-center rounded-full font-medium transition-all'

  const variantClasses = {
    default: cn(style.bgColor, style.color, 'border', style.borderColor),
    outline: cn('bg-transparent border-2', style.borderColor, style.color),
    gradient: cn(
      'bg-gradient-to-r text-white border-0',
      style.gradientFrom,
      style.gradientTo
    ),
  }

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showName && <span>{style.name}</span>}
    </span>
  )
}

/**
 * 레벨 배지 + 포인트 표시 컴포넌트
 */
interface LevelBadgeWithPointsProps extends LevelBadgeProps {
  points: number
}

export function LevelBadgeWithPoints({
  level,
  points,
  size = 'sm',
  className,
  ...props
}: LevelBadgeWithPointsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LevelBadge level={level} size={size} {...props} />
      <span className="text-sm text-gray-500">
        {points.toLocaleString()}P
      </span>
    </div>
  )
}

/**
 * 레벨 아이콘만 표시하는 작은 인디케이터
 */
interface LevelIndicatorProps {
  level: CommunityLevel
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LevelIndicator({ level, size = 'sm', className }: LevelIndicatorProps) {
  const style = LEVEL_STYLES[level]
  const Icon = icons[style.icon]

  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full p-1',
        style.bgColor,
        className
      )}
      title={style.name}
    >
      <Icon className={cn(sizeMap[size], style.color)} />
    </div>
  )
}

export default LevelBadge
