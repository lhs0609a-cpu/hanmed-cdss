import { toast as sonnerToast } from 'sonner'

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning' | 'info' | 'loading'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * 글자수에 따라 자동 연장된 토스트 지속 시간을 계산.
 * - 기본 6초 (한의사 현장 — 환자 진료 중 알람을 놓치지 않도록 충분히 길게)
 * - 메시지가 길수록 100ms/글자 가산 (최대 15초)
 * - 에러는 더 오래 (8초 base)
 */
export function computeToastDuration(
  message: string,
  description?: string,
  variant?: ToastVariant,
): number {
  const base = variant === 'destructive' ? 8000 : 6000
  const total = (message?.length ?? 0) + (description?.length ?? 0)
  const extra = Math.min(total * 100, 9000)
  return base + extra
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant = 'default', duration, action } = options

    const toastOptions: Parameters<typeof sonnerToast>[1] = {
      description,
      // 사용자가 명시한 duration 이 있으면 사용. 없으면 글자수 기반 자동 계산.
      duration: duration ?? computeToastDuration(title, description, variant),
      // sonner 의 기본 close 버튼은 toaster 컴포넌트에서 closeButton 옵션으로 제어.
      // (Toaster 레벨에서 closeButton 활성화가 필요. 토스트 단위에서는 dismissible 으로 보장.)
      dismissible: true,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
    }

    switch (variant) {
      case 'destructive':
        return sonnerToast.error(title, toastOptions)
      case 'success':
        return sonnerToast.success(title, toastOptions)
      case 'warning':
        return sonnerToast.warning(title, toastOptions)
      case 'info':
        return sonnerToast.info(title, toastOptions)
      case 'loading':
        return sonnerToast.loading(title, toastOptions)
      default:
        return sonnerToast.success(title, toastOptions)
    }
  }

  // 편의 메서드들
  const success = (title: string, description?: string) =>
    toast({ title, description, variant: 'success' })

  const error = (title: string, description?: string) =>
    toast({ title, description, variant: 'destructive' })

  const warning = (title: string, description?: string) =>
    toast({ title, description, variant: 'warning' })

  const info = (title: string, description?: string) =>
    toast({ title, description, variant: 'info' })

  const loading = (title: string, description?: string) =>
    toast({ title, description, variant: 'loading', duration: Infinity })

  // Promise 기반 토스트 (비동기 작업에 유용)
  const promise = <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    })
  }

  // 토스트 닫기
  const dismiss = (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  }

  return {
    toast,
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
  }
}

/**
 * 임시 인라인 토스트 (페이지 내 고정 위치 X-띄움) 의 표준 지속 시간.
 * 사용자가 글자수에 맞춰 dismiss 까지 충분히 읽을 시간.
 *
 *   const t = setInlineToastTimeout(() => setShow(false), `${name} 등록 완료`)
 *   return () => clearTimeout(t)
 */
export function setInlineToastTimeout(
  hide: () => void,
  message?: string,
  description?: string,
): ReturnType<typeof setTimeout> {
  const ms = computeToastDuration(message ?? '', description, 'success')
  return setTimeout(hide, ms)
}

export default useToast
