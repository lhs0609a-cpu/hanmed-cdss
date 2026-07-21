import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * 앱 카드.
 *
 * 기본(default)은 여전히 불투명 흰 표면이다 — 진료 화면에서 차트·수치를 읽는 곳이라
 * 가독성이 최우선이고, 글래스를 본문 카드에 쓰면 뒤 콘텐츠가 비쳐 숫자 오독을 유발한다.
 *
 * 글래스는 '떠 있어야 하는 것'에만 액센트로 쓴다:
 *   - variant="glass"    : 콘텐츠 위에 겹치는 패널(시트, 팝오버, 고정 헤더 영역)
 *   - variant="tile"     : 대시보드 통계 타일처럼 시선을 먼저 받아야 하는 강조 카드
 *   - variant="elevated" : 글래스 없이 단계만 올리고 싶을 때
 *
 * variant 를 넘기지 않으면 기존과 동일하게 동작하므로 기존 호출부는 그대로 둬도 된다.
 */
const cardVariants = cva('rounded-xl text-neutral-900 dark:text-neutral-100', {
  variants: {
    variant: {
      default: 'surface-card',
      elevated: 'bg-white dark:bg-[hsl(var(--surface-1))] border border-neutral-200 dark:border-white/10 shadow-[var(--shadow-2)]',
      glass: 'glass-surface border rounded-xl',
      tile: 'glass-tile rounded-xl',
      /** 테두리만 — 중첩 카드용 */
      quiet: 'border border-neutral-200 dark:border-white/10 bg-transparent',
    },
    interactive: {
      true: 'transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    interactive: false,
  },
})

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, interactive }), className)} {...props} />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1 p-6 pb-4', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-bold tracking-tight text-neutral-900 dark:text-white', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-600 dark:text-neutral-400', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
}
