import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-white border shadow-lg rounded-lg',
          title: 'text-gray-900 font-medium',
          description: 'text-gray-500 text-sm',
          success: 'border-green-200 bg-green-50',
          error: 'border-red-200 bg-red-50',
          warning: 'border-amber-200 bg-amber-50',
        },
      }}
    />
  )
}
