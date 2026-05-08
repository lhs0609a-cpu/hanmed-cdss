import { ReactNode } from 'react'
import { AlertCircle, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Link } from 'react-router-dom'

/**
 * 처방·차트 저장 등 한의사 면허가 필요한 기능 게이트.
 *
 * 정책:
 *   - practitionerType === 'practitioner' && isLicenseVerified === true → 통과
 *   - practitionerType !== 'practitioner' → 학습 모드 (저장/처방 발행 불가)
 *   - 면허 미인증 → 검수 대기 안내
 */

interface PractitionerGuardProps {
  /** 무조건 막을지(block), 비활성 표시만 하고 children 렌더할지(soft) */
  mode?: 'block' | 'soft'
  /** 어떤 행위인지 안내문에 노출 (예: '처방 저장', '청구 점검') */
  action?: string
  children: ReactNode
}

export function usePractitionerStatus() {
  const user = useAuthStore((s) => s.user) as
    | (Record<string, unknown> & {
        practitionerType?: 'practitioner' | 'public_health_doctor' | 'student'
        isLicenseVerified?: boolean
        licenseVerificationStatus?: 'unsubmitted' | 'pending' | 'verified' | 'rejected'
      })
    | null

  const practitionerType = user?.practitionerType ?? 'practitioner'
  const isLicensed = !!user?.isLicenseVerified
  const status = user?.licenseVerificationStatus ?? 'unsubmitted'
  const isPractitioner = practitionerType === 'practitioner'

  return {
    canPrescribe: isPractitioner && isLicensed,
    isPractitioner,
    isLicensed,
    status,
    practitionerType,
  }
}

export function PractitionerGuard({ mode = 'soft', action = '이 기능', children }: PractitionerGuardProps) {
  const { canPrescribe, isPractitioner, status } = usePractitionerStatus()

  if (canPrescribe) return <>{children}</>

  const reason = !isPractitioner
    ? '학생/공보의 계정에서는 사용할 수 없습니다.'
    : status === 'pending'
      ? '한의사 면허 검수가 진행 중입니다 (영업일 1~2일 소요).'
      : status === 'rejected'
        ? '한의사 면허 검수가 반려되었습니다. 프로필에서 면허번호를 다시 제출해주세요.'
        : '한의사 면허 검수를 완료해야 사용할 수 있습니다.'

  if (mode === 'block') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">{action}은 한의사 면허 인증 후 사용 가능합니다.</p>
            <p className="text-sm text-amber-800">{reason}</p>
            <Link to="/profile" className="inline-block text-sm font-medium underline mt-1">
              프로필에서 면허 정보 확인 →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none opacity-50 select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-xl">
        <div className="bg-white shadow-lg rounded-xl border border-amber-200 px-4 py-3 text-sm text-amber-900 flex items-center gap-2 max-w-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <span>{reason}</span>
        </div>
      </div>
    </div>
  )
}

/** 인증 배지 (헤더/프로필 표시용) */
export function LicenseBadge({ compact = false }: { compact?: boolean }) {
  const { canPrescribe, isPractitioner, status } = usePractitionerStatus()

  if (!isPractitioner) {
    return (
      <span
        data-status="info"
        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200"
      >
        학습 모드
      </span>
    )
  }
  if (canPrescribe) {
    return (
      <span
        data-status="success"
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200"
      >
        면허 인증 완료
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span
        data-status="warning"
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200"
      >
        면허 검수 중{compact ? '' : ' (1~2일)'}
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span
        data-status="danger"
        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 border border-red-200"
      >
        면허 재제출 필요
      </span>
    )
  }
  return (
    <span
      data-status="warning"
      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 border border-gray-200"
    >
      면허 미인증
    </span>
  )
}
