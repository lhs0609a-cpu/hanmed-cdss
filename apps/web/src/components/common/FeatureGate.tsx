import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { FeatureKey, FEATURE_LABELS } from '@/config/plan-features';
import { cn } from '@/lib/utils';

export interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  /**
   * 'inline'(default): 잠금 카드를 자식 자리에 표시
   * 'wrap': 자식을 흐리게 표시하고 위에 오버레이
   * 'hide': 잠겨있으면 아무것도 렌더링하지 않음 (헤더 메뉴 등에 사용)
   */
  mode?: 'inline' | 'wrap' | 'hide';
  /** 잠금 시 표시할 커스텀 메시지 */
  message?: string;
  /** 잠금 카드에서 보여줄 추가 헤드라인 */
  headline?: string;
}

/**
 * 기능 게이트.
 *
 * 사용 예:
 *   <FeatureGate feature={FeatureKey.PATIENT_MANAGEMENT}>
 *     <PatientManagementPage />
 *   </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  mode = 'inline',
  message,
  headline,
}: FeatureGateProps) {
  const { hasAccess, requiredTierLabel, isLoading } = useFeatureAccess(feature);

  if (isLoading) return null;
  if (hasAccess) return <>{children}</>;
  if (mode === 'hide') return null;

  const label = FEATURE_LABELS[feature];
  const tierBadge = requiredTierLabel ? `${requiredTierLabel} 이상` : '유료 플랜';

  if (mode === 'wrap') {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-40 blur-[2px]" aria-hidden>
          {children}
        </div>
        <LockedOverlay
          label={label}
          tierBadge={tierBadge}
          headline={headline}
          message={message}
        />
      </div>
    );
  }

  return (
    <LockedCard
      label={label}
      tierBadge={tierBadge}
      headline={headline}
      message={message}
    />
  );
}

interface LockedDisplayProps {
  label: string;
  tierBadge: string;
  headline?: string;
  message?: string;
}

function LockedCard({ label, tierBadge, headline, message }: LockedDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Lock className="h-7 w-7" />
      </div>
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
        <Sparkles className="h-3.5 w-3.5" />
        {tierBadge}
      </div>
      <h3 className="mt-1 text-lg font-bold text-gray-900">
        {headline ?? `${label}은(는) 유료 플랜 기능입니다`}
      </h3>
      <p className="mt-2 max-w-md text-sm text-gray-600">
        {message ??
          '한의사 임상에 필요한 핵심 기능은 모두 무료로 이용 가능합니다. 이 기능은 한의원 운영 효율을 위한 부가 도구로, 상위 플랜에서 사용할 수 있습니다.'}
      </p>
      <Link
        to="/subscription"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        플랜 비교 보기
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function LockedOverlay({ label, tierBadge, headline, message }: LockedDisplayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Sparkles className="h-3.5 w-3.5" />
          {tierBadge}
        </div>
        <h3 className="mt-1 text-base font-bold text-gray-900">
          {headline ?? `${label} 잠김`}
        </h3>
        <p className="mt-1.5 text-sm text-gray-600">
          {message ?? '이 영역을 사용하려면 플랜을 업그레이드하세요.'}
        </p>
        <Link
          to="/subscription"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          업그레이드
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * 액션(버튼) 게이트.
 *
 * 자식이 함수(렌더 props)면 (locked, openPrompt) 로 호출되어 직접 핸들링 가능.
 *
 * 사용 예:
 *   <FeatureGateAction feature={FeatureKey.EXPORT_NO_WATERMARK}>
 *     {({ locked, openPrompt }) => (
 *       <Button onClick={locked ? openPrompt : doExport}>내보내기</Button>
 *     )}
 *   </FeatureGateAction>
 */
export function FeatureGateAction({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: (args: { locked: boolean; openPrompt: () => void }) => ReactNode;
}) {
  const { hasAccess } = useFeatureAccess(feature);
  const [open, setOpen] = useState(false);

  return (
    <>
      {children({ locked: !hasAccess, openPrompt: () => setOpen(true) })}
      <UpgradePromptDialog
        open={open}
        onClose={() => setOpen(false)}
        feature={feature}
      />
    </>
  );
}

export function UpgradePromptDialog({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  feature: FeatureKey;
}) {
  const { requiredTierLabel } = useFeatureAccess(feature);
  if (!open) return null;

  const label = FEATURE_LABELS[feature];
  const tierBadge = requiredTierLabel ? `${requiredTierLabel} 이상` : '유료 플랜';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-7 shadow-2xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Sparkles className="h-3.5 w-3.5" />
          {tierBadge}
        </div>
        <h3 className="text-lg font-bold text-gray-900">{label}을(를) 이용하려면</h3>
        <p className="mt-2 text-sm text-gray-600">
          핵심 임상 기능(변증·처방·치험례·커뮤니티)은 모두 무료로 그대로 사용할 수 있습니다.
          이 기능만 상위 플랜에서 잠금이 풀립니다.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            나중에
          </button>
          <Link
            to="/subscription"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={onClose}
          >
            플랜 비교
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
