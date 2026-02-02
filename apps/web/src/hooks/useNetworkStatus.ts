import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface NetworkStatus {
  isOnline: boolean
  isReconnecting: boolean
  lastOnline: Date | null
}

/**
 * 네트워크 상태 감지 훅
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isReconnecting: false,
    lastOnline: navigator.onLine ? new Date() : null,
  })

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      isOnline: true,
      isReconnecting: false,
      lastOnline: new Date(),
    }))
    toast.success('인터넷에 다시 연결되었습니다.', {
      id: 'network-status',
      duration: 3000,
    })
  }, [])

  const handleOffline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
      isReconnecting: false,
    }))
    toast.error('인터넷 연결이 끊겼습니다.', {
      id: 'network-status',
      duration: Infinity,
    })
  }, [])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return status
}

export default useNetworkStatus
