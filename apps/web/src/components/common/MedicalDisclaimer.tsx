import { useState, useEffect } from 'react'
import { AlertTriangle, X, Info, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 의료 면책조항 컴포넌트
 *
 * 의료법 및 의료기기법 준수를 위한 필수 면책조항을 표시합니다.
 * - 모든 AI 기반 추천은 참고용임을 명시
 * - 최종 진단/처방은 의료인의 판단에 따름을 명시
 * - 법적 면책 조항 포함
 */

interface MedicalDisclaimerProps {
  variant?: 'banner' | 'compact' | 'modal'
  dismissible?: boolean
  onDismiss?: () => void
}

export function MedicalDisclaimer({
  variant = 'banner',
  dismissible = true,
  onDismiss
}: MedicalDisclaimerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [hasSeenToday, setHasSeenToday] = useState(false)

  useEffect(() => {
    // 오늘 이미 확인했는지 체크 (하루에 한 번만 표시)
    const lastSeen = localStorage.getItem('medical_disclaimer_seen')
    const today = new Date().toDateString()

    if (lastSeen === today && variant === 'banner') {
      setHasSeenToday(true)
    }
  }, [variant])

  const handleDismiss = () => {
    setIsVisible(false)
    const today = new Date().toDateString()
    localStorage.setItem('medical_disclaimer_seen', today)
    onDismiss?.()
  }

  if (!isVisible || (hasSeenToday && variant === 'banner')) {
    return null
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-start gap-2 p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-sm">
        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-amber-800">
          <span className="font-medium">참고용 정보:</span> AI 추천 결과는 참고 자료이며,
          최종 진단 및 처방은 한의사의 전문적 판단에 따라야 합니다.
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'relative bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200',
      variant === 'modal' && 'rounded-xl border shadow-lg p-6'
    )}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start gap-4">
          {/* 아이콘 */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
          </div>

          {/* 내용 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold text-amber-900">
                의료 참고 정보 안내
              </h3>
            </div>

            <div className="text-sm text-amber-800 space-y-1">
              <p>
                <span className="font-medium">본 서비스는 의료기기가 아닙니다.</span>{' '}
                온고지신 AI가 제공하는 모든 처방 추천, 변증 분석, 임상 정보는
                <span className="font-medium text-amber-900"> 참고용 정보</span>이며,
                의료법상 진단 또는 처방 행위로 간주되지 않습니다.
              </p>
              <p className="text-amber-700">
                최종 진단 및 치료 결정은 반드시
                <span className="font-medium"> 한의사의 전문적인 진찰과 판단</span>에 따라 이루어져야 합니다.
                AI 추천 결과를 맹신하지 마시고, 환자의 개별적 상황을 종합적으로 고려하여 주십시오.
              </p>
            </div>

            {/* 법적 고지 */}
            <div className="mt-2 pt-2 border-t border-amber-200/50">
              <p className="text-xs text-amber-600">
                의료법 제27조 및 의료기기법에 따라 본 서비스는 의료 행위 또는 의료기기에 해당하지 않습니다.
                본 서비스 이용으로 인한 의료 결정의 책임은 사용자 및 담당 의료인에게 있습니다.
              </p>
            </div>
          </div>

          {/* 닫기 버튼 */}
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-amber-200/50 transition-colors"
              aria-label="닫기"
            >
              <X className="h-4 w-4 text-amber-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * AI 결과에 표시할 면책조항 (인라인)
 */
export function AIResultDisclaimer({ className }: { className?: string }) {
  return (
    <div className={cn(
      'flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs',
      className
    )}>
      <Info className="h-3.5 w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
      <p className="text-slate-600">
        <span className="font-medium text-slate-700">AI 분석 결과 안내:</span>{' '}
        이 결과는 AI가 학습 데이터를 기반으로 생성한 참고 정보입니다.
        실제 임상에서는 환자의 전반적인 상태, 병력, 체질 등을 종합적으로 고려하여
        한의사의 전문적 판단에 따라 처방을 결정해 주십시오.
      </p>
    </div>
  )
}

/**
 * 처방 추천 시 표시할 강조 면책조항
 */
export function PrescriptionDisclaimer({ className }: { className?: string }) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl',
      className
    )}>
      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="space-y-2">
        <p className="text-sm font-medium text-red-800">
          처방 전 필수 확인 사항
        </p>
        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
          <li>AI 추천은 참고용이며, 최종 처방 결정은 한의사의 판단에 따릅니다.</li>
          <li>환자의 알레르기, 복용 중인 약물, 기저질환을 반드시 확인하십시오.</li>
          <li>체열(寒熱)과 근실도(虛實) 평가가 정확한지 재확인하십시오.</li>
          <li>임산부, 수유부, 소아 환자는 특별한 주의가 필요합니다.</li>
        </ul>
      </div>
    </div>
  )
}

export default MedicalDisclaimer
