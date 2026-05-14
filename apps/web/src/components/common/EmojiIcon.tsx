import { cn } from '@/lib/utils'

/**
 * Toss 스타일 3D 이모지 아이콘.
 *
 * 시스템 컬러 이모지 폰트(Apple Color Emoji / Segoe UI Emoji / Noto Color Emoji)를
 * 그대로 쓰되, 라운드 배경 + 미세한 안쪽 그림자로 입체감을 살린다.
 *
 * 단색 톤 라이브러리(lucide 등)를 잘라낸 자리에 그대로 끼워 넣을 수 있도록
 * size 기본값은 lucide `h-6 w-6` 보다 살짝 키운 28px.
 */

export type EmojiBgTone =
  | 'amber'
  | 'blue'
  | 'red'
  | 'teal'
  | 'neutral'
  | 'green'
  | 'purple'
  | 'pink'
  | 'orange'

const TONE_BG: Record<EmojiBgTone, string> = {
  amber: 'bg-amber-50',
  blue: 'bg-blue-50',
  red: 'bg-red-50',
  teal: 'bg-teal-50',
  neutral: 'bg-neutral-100',
  green: 'bg-green-50',
  purple: 'bg-purple-50',
  pink: 'bg-pink-50',
  orange: 'bg-orange-50',
}

interface EmojiIconProps {
  /** 표시할 유니코드 이모지 (예: '📚', '🩺', '💊') */
  emoji: string
  /** 배경 톤 (라운드 박스 색) */
  tone?: EmojiBgTone
  /** 크기 — 'sm' 36px / 'md' 44px / 'lg' 56px / 'xl' 72px */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 박스 없이 이모지만 렌더 */
  bare?: boolean
  className?: string
  /** 접근성 — 의미가 있다면 label 제공, 장식용이면 생략 (aria-hidden) */
  label?: string
}

const SIZE_BOX = {
  sm: 'w-9 h-9 text-[18px]',
  md: 'w-11 h-11 text-[22px]',
  lg: 'w-14 h-14 text-[30px]',
  xl: 'w-[72px] h-[72px] text-[40px]',
}

const SIZE_BARE = {
  sm: 'text-[24px]',
  md: 'text-[32px]',
  lg: 'text-[44px]',
  xl: 'text-[64px]',
}

export function EmojiIcon({
  emoji,
  tone = 'neutral',
  size = 'md',
  bare = false,
  className,
  label,
}: EmojiIconProps) {
  const ariaProps = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true }

  if (bare) {
    return (
      <span
        {...ariaProps}
        className={cn(
          'inline-flex items-center justify-center leading-none select-none emoji-3d',
          SIZE_BARE[size],
          className,
        )}
      >
        {emoji}
      </span>
    )
  }

  return (
    <span
      {...ariaProps}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl leading-none select-none emoji-3d',
        TONE_BG[tone],
        SIZE_BOX[size],
        className,
      )}
    >
      {emoji}
    </span>
  )
}

export default EmojiIcon
