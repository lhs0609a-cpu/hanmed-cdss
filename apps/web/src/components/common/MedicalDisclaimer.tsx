import { useState, useEffect } from 'react'
import { AlertTriangle, X, Info, Shield, CheckCircle2, FileWarning, ChevronDown, ChevronUp } from 'lucide-react'
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
  variant?: 'banner' | 'compact' | 'modal' | 'mandatory' | 'collapsible'
  dismissible?: boolean
  onDismiss?: () => void
  onAccept?: () => void
  /** 기본 접힌 상태 (collapsible, banner 모드에서 사용) */
  defaultCollapsed?: boolean
}

// 최초 동의 여부 확인 키
const DISCLAIMER_ACCEPTED_KEY = 'medical_disclaimer_accepted_v1'
const DISCLAIMER_SEEN_TODAY_KEY = 'medical_disclaimer_seen'

export function MedicalDisclaimer({
  variant = 'banner',
  dismissible = true,
  onDismiss,
  onAccept,
  defaultCollapsed = true, // 기본 접힌 상태
}: MedicalDisclaimerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [hasSeenToday, setHasSeenToday] = useState(false)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const [checkboxChecked, setCheckboxChecked] = useState(false)

  useEffect(() => {
    // 최초 동의 여부 확인
    const accepted = localStorage.getItem(DISCLAIMER_ACCEPTED_KEY)
    setHasAcceptedTerms(!!accepted)

    // 오늘 이미 확인했는지 체크 (하루에 한 번만 표시)
    const lastSeen = localStorage.getItem(DISCLAIMER_SEEN_TODAY_KEY)
    const today = new Date().toDateString()

    if (lastSeen === today && variant === 'banner') {
      setHasSeenToday(true)
    }
  }, [variant])

  const handleDismiss = () => {
    setIsVisible(false)
    const today = new Date().toDateString()
    localStorage.setItem(DISCLAIMER_SEEN_TODAY_KEY, today)
    onDismiss?.()
  }

  const handleAccept = () => {
    if (!checkboxChecked) return
    localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, new Date().toISOString())
    setHasAcceptedTerms(true)
    setIsVisible(false)
    onAccept?.()
  }

  // mandatory 모드: 최초 동의 전까지 모달 표시
  // 이미 동의한 경우 아무것도 표시하지 않음
  if (variant === 'mandatory') {
    if (hasAcceptedTerms) {
      return null
    }
    // 동의 전이면 모달 표시
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FileWarning className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  의료 정보 이용 동의
                </h2>
                <p className="text-red-100 text-sm mt-0.5">
                  서비스 이용 전 반드시 확인해 주세요
                </p>
              </div>
            </div>
          </div>

          {/* 내용 */}
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                중요 고지사항
              </h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>본 서비스는 <strong>의료기기가 아니며</strong>, 의료법상 진단 또는 처방 행위로 간주되지 않습니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>AI가 제공하는 모든 정보(처방 추천, 변증 분석, 상호작용 검사 등)는 <strong>참고용 정보</strong>입니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>최종 진단 및 치료 결정은 반드시 <strong>한의사의 전문적인 진찰과 판단</strong>에 따라야 합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>AI 추천 결과를 <strong>맹신하지 마시고</strong>, 환자의 개별적 상황을 종합적으로 고려하십시오.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-slate-600" />
                법적 고지
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                의료법 제27조 및 의료기기법에 따라 본 서비스는 의료 행위 또는 의료기기에 해당하지 않습니다.
                본 서비스 이용으로 인한 의료 결정의 책임은 사용자 및 담당 의료인에게 있습니다.
                서비스 제공자는 AI 추천 정보의 정확성, 완전성, 적합성을 보장하지 않으며,
                이로 인한 어떠한 직접적, 간접적 손해에 대해서도 책임을 지지 않습니다.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-blue-600" />
                올바른 사용법
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>✓ AI 추천을 <strong>참고 자료</strong>로 활용하세요</li>
                <li>✓ 환자의 <strong>알레르기, 복용약물, 기저질환</strong>을 반드시 확인하세요</li>
                <li>✓ 처방 전 <strong>체열(寒熱)과 근실도(虛實)</strong>를 재확인하세요</li>
                <li>✓ 이상 반응 발생 시 <strong>즉시 사용을 중단</strong>하고 보고해 주세요</li>
              </ul>
            </div>

            {/* 동의 체크박스 */}
            <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">
                위 고지사항을 모두 읽고 이해하였으며, AI 추천 정보는 <strong>참고용</strong>이고
                최종 의료 결정은 <strong>한의사의 판단</strong>에 따름을 동의합니다.
              </span>
            </label>
          </div>

          {/* 버튼 */}
          <div className="p-6 pt-0">
            <button
              onClick={handleAccept}
              disabled={!checkboxChecked}
              className={cn(
                'w-full py-3 rounded-xl font-semibold text-white transition-all',
                checkboxChecked
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-lg hover:shadow-teal-500/30'
                  : 'bg-gray-300 cursor-not-allowed'
              )}
            >
              {checkboxChecked ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  동의하고 시작하기
                </span>
              ) : (
                '위 내용에 동의해 주세요'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // banner 모드: 이미 오늘 확인했거나 닫았으면 표시하지 않음
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

  // collapsible 또는 banner 모드에서 접힌 상태
  if (variant === 'collapsible' || (variant === 'banner' && defaultCollapsed)) {
    return (
      <div className={cn(
        'relative bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200',
      )}>
        <div className="max-w-7xl mx-auto px-4">
          {/* 접힌 상태: 간단한 바 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full py-2 flex items-center justify-between text-left hover:bg-amber-100/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                의료 참고 정보 안내
              </span>
              <span className="text-xs text-amber-600 hidden sm:inline">
                (AI 추천은 참고용 정보입니다)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <>
                  <span className="text-xs text-amber-500">자세히 보기</span>
                  <ChevronDown className="h-4 w-4 text-amber-500" />
                </>
              ) : (
                <>
                  <span className="text-xs text-amber-500">접기</span>
                  <ChevronUp className="h-4 w-4 text-amber-500" />
                </>
              )}
            </div>
          </button>

          {/* 펼친 상태: 전체 내용 */}
          {!isCollapsed && (
            <div className="pb-3 pt-1 border-t border-amber-200/50">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
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
                  <div className="mt-2 pt-2 border-t border-amber-200/50">
                    <p className="text-xs text-amber-600">
                      의료법 제27조 및 의료기기법에 따라 본 서비스는 의료 행위 또는 의료기기에 해당하지 않습니다.
                      본 서비스 이용으로 인한 의료 결정의 책임은 사용자 및 담당 의료인에게 있습니다.
                    </p>
                  </div>
                </div>

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
          )}
        </div>
      </div>
    )
  }

  // 기존 banner 모드 (defaultCollapsed=false일 때)
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
