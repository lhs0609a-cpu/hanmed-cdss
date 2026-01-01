import { toast as sonnerToast } from 'sonner'

// 성공 토스트
export function toastSuccess(message: string, description?: string) {
  sonnerToast.success(message, {
    description,
    duration: 3000,
    style: {
      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      color: 'white',
      border: 'none',
    },
  })
}

// 에러 토스트
export function toastError(message: string, description?: string) {
  sonnerToast.error(message, {
    description,
    duration: 5000,
    style: {
      background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      color: 'white',
      border: 'none',
    },
  })
}

// 경고 토스트
export function toastWarning(message: string, description?: string) {
  sonnerToast.warning(message, {
    description,
    duration: 4000,
    style: {
      background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      color: 'white',
      border: 'none',
    },
  })
}

// 정보 토스트
export function toastInfo(message: string, description?: string) {
  sonnerToast.info(message, {
    description,
    duration: 3000,
    style: {
      background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
      color: 'white',
      border: 'none',
    },
  })
}

// 로딩 토스트 (프로미스 기반)
export function toastLoading<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
) {
  return sonnerToast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  })
}

// 액션 토스트 (버튼 포함)
export function toastAction(
  message: string,
  action: {
    label: string
    onClick: () => void
  },
  options?: {
    description?: string
    duration?: number
  }
) {
  sonnerToast(message, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: {
      label: action.label,
      onClick: action.onClick,
    },
  })
}

// 커스텀 토스트 (더 세밀한 제어)
export function toastCustom(
  message: string,
  options?: {
    description?: string
    duration?: number
    icon?: React.ReactNode
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  }
) {
  sonnerToast(message, options)
}

// 토스트 해제
export function dismissToast(toastId?: string | number) {
  if (toastId) {
    sonnerToast.dismiss(toastId)
  } else {
    sonnerToast.dismiss()
  }
}

// 기본 내보내기
export const toast = {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  loading: toastLoading,
  action: toastAction,
  custom: toastCustom,
  dismiss: dismissToast,
}
