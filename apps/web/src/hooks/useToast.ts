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

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant = 'default', duration, action } = options

    const toastOptions: Parameters<typeof sonnerToast>[1] = {
      description,
      duration: duration ?? (variant === 'destructive' ? 5000 : 3000),
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

export default useToast
