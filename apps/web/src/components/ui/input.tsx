import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Toss 스타일 입력.
 * - h-14 (큰 터치 타깃)
 * - 라운드 12px, 보더 1px, 배경은 흰색
 * - 포커스: 브랜드 블루 보더 + 16% 알파 링
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-14 w-full rounded-md border border-neutral-200 bg-white px-4 text-[15px]',
          'placeholder:text-neutral-400',
          'transition-[border-color,box-shadow] duration-150',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-focus',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
