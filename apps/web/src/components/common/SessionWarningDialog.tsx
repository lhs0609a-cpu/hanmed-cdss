/**
 * 세션 만료 경고 다이얼로그
 * 세션이 곧 만료될 때 사용자에게 알리고 연장 옵션 제공
 */

import { useEffect } from 'react'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionWarningDialogProps {
  isVisible: boolean
  secondsLeft: number
  isRefreshing: boolean
  onExtend: () => void
  onLogout: () => void
}

export function SessionWarningDialog({
  isVisible,
  secondsLeft,
  isRefreshing,
  onExtend,
  onLogout,
}: SessionWarningDialogProps) {
  // 경고음 재생 (마지막 30초)
  useEffect(() => {
    if (isVisible && secondsLeft === 30) {
      // 브라우저 알림 요청
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('세션 만료 경고', {
          body: '30초 후 자동 로그아웃됩니다. 작업을 저장해주세요.',
          icon: '/favicon.ico',
          tag: 'session-warning',
        })
      }
    }
  }, [isVisible, secondsLeft])

  if (!isVisible) return null

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timeDisplay = minutes > 0
    ? `${minutes}분 ${seconds}초`
    : `${seconds}초`

  const isUrgent = secondsLeft <= 30

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          'w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden',
          'transform transition-all duration-300 animate-in fade-in zoom-in-95',
          isUrgent && 'ring-4 ring-red-500/50'
        )}
      >
        {/* 헤더 */}
        <div
          className={cn(
            'px-6 py-4 text-white',
            isUrgent
              ? 'bg-gradient-to-r from-red-500 to-rose-600'
              : 'bg-gradient-to-r from-amber-500 to-orange-500'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isUrgent ? 'bg-red-600/30' : 'bg-amber-600/30'
              )}
            >
              <Clock className={cn('w-6 h-6', isUrgent && 'animate-pulse')} />
            </div>
            <div>
              <h2 className="text-lg font-bold">세션 만료 예정</h2>
              <p className="text-sm opacity-90">
                {isUrgent ? '지금 바로 연장하세요!' : '세션이 곧 만료됩니다'}
              </p>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-6">
          {/* 카운트다운 */}
          <div className="text-center mb-6">
            <div
              className={cn(
                'inline-flex items-center justify-center w-24 h-24 rounded-full mb-3',
                isUrgent
                  ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-600'
              )}
            >
              <span className="text-3xl font-bold font-mono">{timeDisplay}</span>
            </div>
            <p className="text-gray-600">
              후 자동으로 로그아웃됩니다
            </p>
          </div>

          {/* 안내 메시지 */}
          <div
            className={cn(
              'p-4 rounded-xl mb-6',
              isUrgent ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
            )}
          >
            <p className={cn('text-sm', isUrgent ? 'text-red-700' : 'text-amber-700')}>
              {isUrgent
                ? '작성 중인 내용이 있다면 지금 바로 저장해주세요!'
                : '보안을 위해 일정 시간 동안 활동이 없으면 자동 로그아웃됩니다.'}
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
            <button
              onClick={onExtend}
              disabled={isRefreshing}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium transition-all',
                isUrgent
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-teal-500 hover:bg-teal-600',
                isRefreshing && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  연장 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  세션 연장
                </>
              )}
            </button>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="h-1 bg-gray-200">
          <div
            className={cn(
              'h-full transition-all duration-1000',
              isUrgent ? 'bg-red-500' : 'bg-amber-500'
            )}
            style={{
              width: `${Math.min(100, (secondsLeft / 120) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default SessionWarningDialog
