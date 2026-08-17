import { useState, useEffect } from 'react'
import { AlertTriangle, X, Info, Shield, CheckCircle2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toss3DIcon } from './Toss3DIcon'

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
    localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, new Date().toISOString())
    setHasAcceptedTerms(true)
    setIsVisible(false)
    onAccept?.()
  }

  // mandatory 모드: 최초 동의 전까지 "상단 고정 바"로 표시(화면을 덮지 않음).
  // 로그인 직후 첫 화면(아하 모먼트)이 팝업에 가려지지 않도록, 법적 고지는 유지하되
  // 콘텐츠 위 sticky 바 + [동의] 버튼 형태로 둔다. 전체 고지는 "자세히"로 펼쳐 확인.
  // 이미 동의한 경우 아무것도 표시하지 않음.
  if (variant === 'mandatory') {
    if (hasAcceptedTerms) {
      return null
    }
    return (
      <div className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="flex-1 min-w-0 text-[13px] leading-snug text-amber-900">
              <span className="font-semibold">참고용 임상 보조 도구입니다.</span>{' '}
              <span className="text-amber-800">
                AI 추천·변증 분석은 참고 정보이며, 최종 진단·처방은 한의사의 판단에 따릅니다.
              </span>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="ml-1.5 whitespace-nowrap font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? '자세히' : '접기'}
              </button>
            </p>
            <button
              onClick={handleAccept}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              동의
            </button>
          </div>

          {/* 자세히: 전체 고지(중요 고지·법적 고지·올바른 사용법) */}
          {!isCollapsed && (
            <div className="grid grid-cols-1 gap-3 border-t border-amber-200 pb-4 pt-3 md:grid-cols-3">
              <div className="rounded-xl border border-amber-200 bg-white/70 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  중요 고지사항
                </h3>
                <ul className="space-y-1.5 text-[12px] leading-relaxed text-amber-800">
                  <li>• 본 서비스는 <strong>의료기기가 아니며</strong>, 진단·처방 행위로 간주되지 않습니다.</li>
                  <li>• AI 정보(처방 추천·변증·상호작용)는 <strong>참고용</strong>입니다.</li>
                  <li>• 최종 결정은 <strong>한의사의 진찰과 판단</strong>에 따라야 합니다.</li>
                  <li>• AI 결과를 <strong>맹신하지 마시고</strong> 환자 상황을 종합 고려하십시오.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-900">
                  <Shield className="h-4 w-4 text-slate-600" />
                  법적 고지
                </h3>
                <p className="text-[12px] leading-relaxed text-slate-700">
                  의료법 제27조 및 의료기기법에 따라 본 서비스는 의료 행위 또는 의료기기에
                  해당하지 않습니다. 이용으로 인한 의료 결정의 책임은 사용자 및 담당 의료인에게
                  있으며, 서비스 제공자는 정보의 정확성·완전성을 보장하지 않습니다.
                </p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-white/70 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-blue-900">
                  <Info className="h-4 w-4 text-blue-600" />
                  올바른 사용법
                </h3>
                <ul className="space-y-1 text-[12px] leading-relaxed text-blue-800">
                  <li>✓ AI 추천을 <strong>참고 자료</strong>로 활용</li>
                  <li>✓ <strong>알레르기·복용약물·기저질환</strong> 확인</li>
                  <li>✓ <strong>체열(寒熱)·근실도(虛實)</strong> 재확인</li>
                  <li>✓ 이상 반응 시 <strong>즉시 중단</strong> 및 보고</li>
                </ul>
              </div>
            </div>
          )}
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
      <div className="flex items-start gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm">
        <Info className="h-4 w-4 text-neutral-500 flex-shrink-0 mt-0.5" />
        <p className="text-neutral-700">
          <span className="font-medium text-neutral-900">참고용 정보:</span> AI 추천 결과는 참고 자료이며,
          최종 진단 및 처방은 한의사의 전문적 판단에 따라야 합니다.
        </p>
      </div>
    )
  }

  // collapsible 또는 banner 모드 — Toss 톤: 얇은 단색 바, 펼치면 본문에 카드형 안내
  if (variant === 'collapsible' || (variant === 'banner' && defaultCollapsed)) {
    return (
      <div className="relative bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4">
          {/* 접힌 상태: 한 줄 알림 — 검정 글자, 채도 없는 회색 톤 */}
          <div className="flex items-center justify-between py-2 gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-2 text-left flex-1 min-w-0 hover:opacity-80 transition-opacity"
              aria-expanded={!isCollapsed}
            >
              <Info className="h-3.5 w-3.5 text-neutral-500 flex-shrink-0" />
              <span className="text-[12px] text-neutral-700 truncate">
                <span className="font-medium text-neutral-900">참고용 임상 보조 도구</span>
                <span className="text-neutral-500 hidden sm:inline">
                  {' '}· 최종 진단·처방은 한의사 판단
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3 w-3 text-neutral-400 flex-shrink-0 transition-transform',
                  !isCollapsed && 'rotate-180'
                )}
              />
            </button>
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded hover:bg-neutral-100 transition-colors"
                aria-label="오늘 그만 보기"
              >
                <X className="h-3.5 w-3.5 text-neutral-400" />
              </button>
            )}
          </div>

          {/* 펼친 상태: 본문 카드 */}
          {!isCollapsed && (
            <div className="pb-3 pt-1 border-t border-neutral-200">
              <div className="text-[13px] text-neutral-700 space-y-1.5 leading-relaxed">
                <p>
                  <span className="font-medium text-neutral-900">본 서비스는 의료기기가 아닙니다.</span>{' '}
                  AI 가 제공하는 처방 추천·변증 분석·임상 정보는 참고용이며,
                  의료법상 진단 또는 처방 행위로 간주되지 않습니다.
                </p>
                <p className="text-neutral-500 text-[12px]">
                  의료법 제27조·의료기기법 — 본 서비스 이용으로 인한 의료 결정의 책임은
                  사용자 및 담당 의료인에게 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 기존 banner 모드 (defaultCollapsed=false) — Toss 톤 평탄화
  return (
    <div className={cn(
      'relative bg-neutral-50 border-b border-neutral-200',
      variant === 'modal' && 'rounded-xl border shadow-soft p-6'
    )}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
            <Shield className="h-4 w-4 text-neutral-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 text-[14px] mb-1">
              의료 참고 정보 안내
            </h3>
            <div className="text-[13px] text-neutral-700 space-y-1 leading-relaxed">
              <p>
                <span className="font-medium text-neutral-900">본 서비스는 의료기기가 아닙니다.</span>{' '}
                AI 가 제공하는 처방 추천·변증 분석·임상 정보는 참고용이며,
                의료법상 진단 또는 처방 행위로 간주되지 않습니다.
              </p>
              <p className="text-neutral-500 text-[12px]">
                최종 진단 및 치료 결정은 한의사의 전문적인 진찰과 판단에 따라야 합니다.
              </p>
            </div>
          </div>

          {dismissible && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label="닫기"
            >
              <X className="h-4 w-4 text-neutral-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * AI 결과에 표시할 면책조항 (인라인) — Toss 톤 정합
 */
export function AIResultDisclaimer({ className }: { className?: string }) {
  return (
    <div className={cn(
      'flex items-start gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-[12px]',
      className
    )}>
      <Info className="h-3.5 w-3.5 text-neutral-500 flex-shrink-0 mt-0.5" />
      <p className="text-neutral-600 leading-relaxed">
        <span className="font-medium text-neutral-800">AI 분석 결과 안내</span> ·{' '}
        이 결과는 AI 가 학습 데이터를 기반으로 생성한 참고 정보입니다.
        실제 임상에서는 환자의 상태, 병력, 체질을 종합적으로 고려하여
        한의사의 전문적 판단에 따라 처방을 결정해 주십시오.
      </p>
    </div>
  )
}

/**
 * 처방 추천 시 표시할 강조 면책조항 — 위험 채도 유지하되 톤다운
 */
export function PrescriptionDisclaimer({ className }: { className?: string }) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 bg-white border border-neutral-200 rounded-xl',
      className
    )}>
      <Toss3DIcon icon={AlertTriangle} tone="amber" size="sm" className="mt-0.5" />
      <div className="space-y-1.5 flex-1">
        <p className="text-[14px] font-semibold text-neutral-900">
          처방 전 필수 확인 사항
        </p>
        <ul className="text-[13px] text-neutral-600 space-y-1 list-disc list-inside leading-relaxed">
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
