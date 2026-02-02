import { WifiOff } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

/**
 * 오프라인 상태 배너
 * 인터넷 연결이 끊겼을 때 화면 상단에 표시
 */
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm">
        <WifiOff className="h-4 w-4" />
        <span>인터넷 연결이 끊겼습니다. 연결 상태를 확인해주세요.</span>
      </div>
    </div>
  )
}

export default OfflineBanner
