import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Toss 스타일 배지.
 * - 채도 낮은 톤 사용 (예: bg-brand-50 + text-brand-700)
 * - 라운드 6px (small), padding 6/2px
 * - 테두리 없음 — 배경+텍스트 색만으로 위계
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold leading-tight',
  {
    variants: {
      variant: {
        default: 'bg-brand-50 text-brand-700',
        secondary: 'bg-neutral-100 text-neutral-700',
        destructive: 'bg-red-50 text-red-700',
        outline: 'border border-neutral-200 text-neutral-700',
        success: 'bg-emerald-50 text-emerald-700',
        warning: 'bg-amber-50 text-amber-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
