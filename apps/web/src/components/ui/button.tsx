import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * 앱 버튼.
 *  - 라운드 12px / 16px (xl)
 *  - 기본은 단색 브랜드 블루. 주요 CTA 만 그라디언트 + 글로우로 한 단계 올린다.
 *  - 누르면 미세한 축소(0.98)
 *
 * gradient / gradient-accent 는 과거 '평탄화' 정책으로 단색으로 동작하게 막아뒀으나,
 * 글래스 액센트 시스템 도입에 맞춰 실제 그라디언트로 복원했다.
 * (.accent-gradient 는 전역 평탄화 선택자 [class*='bg-gradient-to-'] 에 걸리지 않는다)
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-semibold transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] select-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-brand-600',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-white/12 dark:bg-transparent dark:text-white dark:hover:bg-white/10',
        secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
        ghost: 'text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-white/10',
        link: 'text-primary underline-offset-4 hover:underline',
        /** 주요 CTA — 그라디언트 + 액센트 글로우 */
        gradient: 'accent-gradient accent-glow hover:brightness-[1.06]',
        'gradient-accent': 'accent-gradient accent-glow hover:brightness-[1.06]',
        /** 유리 표면 버튼 — 이미지/컬러 위에 얹을 때 */
        glass:
          'glass-surface border text-neutral-900 dark:text-white hover:brightness-[0.98]',
      },
      size: {
        default: 'h-12 px-5 text-[15px]',
        sm: 'h-9 px-3.5 text-[13px] rounded-md',
        lg: 'h-14 px-6 text-[16px] rounded-md',
        xl: 'h-16 px-8 text-[17px] rounded-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild: _asChild = false, loading = false, children, disabled, ...props }, ref) => {
    void _asChild
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            진행 중
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
