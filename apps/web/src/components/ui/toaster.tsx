import { Toaster as SonnerToaster } from 'sonner'
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      gap={12}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'bg-white/95 backdrop-blur-lg border shadow-xl rounded-xl px-4 py-3 min-w-[320px]',
          title: 'text-gray-900 font-semibold text-sm',
          description: 'text-gray-500 text-xs mt-1',
          success: 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50',
          error: 'border-red-200/80 bg-gradient-to-r from-red-50 to-rose-50',
          warning: 'border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50',
          info: 'border-sky-200/80 bg-gradient-to-r from-sky-50 to-cyan-50',
          loading: 'border-gray-200/80',
          actionButton: 'bg-primary text-white text-xs px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors',
          cancelButton: 'bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors',
        },
      }}
      icons={{
        success: <CheckCircle className="w-5 h-5 text-emerald-600" />,
        error: <XCircle className="w-5 h-5 text-red-600" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        info: <Info className="w-5 h-5 text-sky-600" />,
        loading: <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />,
      }}
      expand={false}
      richColors
      closeButton
    />
  )
}
