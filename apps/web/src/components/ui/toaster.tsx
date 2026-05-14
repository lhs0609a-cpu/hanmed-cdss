import { Toaster as SonnerToaster } from 'sonner'
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'

/**
 * 토스트 — Toss 톤 단정한 흰 카드. 종류 구분은 아이콘 색만으로.
 *
 * 이전 버그:
 *  1) richColors prop 이 활성화되어 sonner 의 진한 기본 컬러가 우리 classNames 를
 *     덮어쓰면서 흰색 본문 텍스트가 진한 파란 배경에 거의 안 보이던 문제.
 *  2) from-amber-50 to-orange-50 그라데이션이 index.css 의 Toss 정합화 룰에
 *     걸려 강제로 검정 배경으로 변환되던 문제.
 * 해결: richColors 제거 + 단색 흰 카드 + 좌측 컬러 보더로만 종류 표시.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      gap={12}
      toastOptions={{
        duration: 6000,
        classNames: {
          toast:
            'bg-white border border-neutral-200 shadow-soft rounded-xl px-4 py-3 min-w-[320px]',
          title: 'text-neutral-900 font-semibold text-[14px]',
          description: 'text-neutral-600 text-[12px] mt-0.5 leading-relaxed',
          success: 'border-l-4 border-l-emerald-500',
          error: 'border-l-4 border-l-red-500',
          warning: 'border-l-4 border-l-amber-500',
          info: 'border-l-4 border-l-blue-500',
          loading: 'border-l-4 border-l-neutral-300',
          actionButton:
            'bg-neutral-900 text-white text-[12px] px-3 py-1.5 rounded-md hover:bg-neutral-800 transition-colors',
          cancelButton:
            'bg-neutral-100 text-neutral-600 text-[12px] px-3 py-1.5 rounded-md hover:bg-neutral-200 transition-colors',
          closeButton: 'text-neutral-400 hover:text-neutral-700',
        },
      }}
      icons={{
        success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        error: <XCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        loading: <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />,
      }}
      expand={false}
      closeButton
    />
  )
}
