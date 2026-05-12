/**
 * 온고지신 환불 정책 상수
 *
 * UI 팀은 본 모듈을 직접 import 해서 안내 문구·버튼 활성 조건 등에 사용.
 * 백엔드 환불 처리 로직(toss-payments.service.ts)에서도 동일 상수 참조.
 *
 * 변경 시 영향:
 *  - 웹 결제/계정 페이지 (UI 표시)
 *  - 환불 자동 승인 기준
 *  - 부분 환불 처리 로직
 */

/** 환불 정책 상수 묶음 */
export const REFUND_POLICY = {
  /** 무조건 환불 보장 기간 (일) — 결제일 기준 */
  GRACE_PERIOD_DAYS: 7,

  /** 자동 환불 승인 조건: 사용량이 이 비율 미만이어야 자동 승인 */
  AUTO_APPROVAL_USAGE_THRESHOLD: 0.5, // 50%

  /** 부분 환불 최소 금액 (원) — 토스 정책에 맞춤 */
  MIN_PARTIAL_REFUND_AMOUNT: 100,

  /** 부분 환불 가능 여부 */
  PARTIAL_REFUND_ENABLED: true,

  /** 연간 결제의 미사용 월 환불 가능 여부 (Pro-rate refund) */
  ANNUAL_PRORATE_REFUND: true,

  /** 환불 요청 후 처리 영업일 (안내용) */
  PROCESSING_BUSINESS_DAYS: 3,

  /** 고객센터 연락처 (안내용) */
  SUPPORT_EMAIL: 'support@ongojisin.kr',
} as const;

/** UI 표시용 한국어 안내문 */
export const REFUND_POLICY_TEXT = {
  guaranteeBanner: `결제 후 ${REFUND_POLICY.GRACE_PERIOD_DAYS}일 이내, 사용량 ${Math.round(
    REFUND_POLICY.AUTO_APPROVAL_USAGE_THRESHOLD * 100,
  )}% 미만이면 즉시 자동 환불됩니다.`,

  partialRefundNote:
    '연간 결제 시 잔여 월 단위 부분 환불이 가능합니다. (사용 월 차감 후 환불)',

  outOfGracePeriod: `결제일로부터 ${REFUND_POLICY.GRACE_PERIOD_DAYS}일이 경과하여 자동 환불이 어렵습니다. 고객센터에 문의해 주세요.`,

  highUsage: `이미 ${Math.round(
    REFUND_POLICY.AUTO_APPROVAL_USAGE_THRESHOLD * 100,
  )}% 이상 사용하셨습니다. 자동 환불 대상이 아니며, 고객센터 검토 후 안내드립니다.`,

  processingTime: `환불 신청 후 영업일 기준 약 ${REFUND_POLICY.PROCESSING_BUSINESS_DAYS}일 이내 카드사로 처리됩니다.`,
} as const;

/** 환불 가능 여부 판정 결과 */
export interface RefundEligibility {
  eligible: boolean;
  autoApprove: boolean;
  reason: string;
  refundableAmount: number;
  daysSincePayment: number;
}

/**
 * 자동 환불 가능 여부 계산 (서비스 내부 + UI 미리보기 양쪽에서 사용 가능).
 *
 * @param paidAt 결제 완료 시각
 * @param amount 총 결제 금액
 * @param refundedAmount 기 환불액
 * @param usageRatio 사용량 비율 (0~1). 모르면 0.
 */
export function evaluateRefundEligibility(
  paidAt: Date | null | undefined,
  amount: number,
  refundedAmount: number,
  usageRatio: number = 0,
): RefundEligibility {
  const refundableAmount = Math.max(0, amount - refundedAmount);
  const paymentTime = paidAt ? new Date(paidAt).getTime() : Date.now();
  const daysSincePayment = Math.floor(
    (Date.now() - paymentTime) / (1000 * 60 * 60 * 24),
  );

  if (refundableAmount <= 0) {
    return {
      eligible: false,
      autoApprove: false,
      reason: '환불 가능한 잔여 금액이 없습니다.',
      refundableAmount: 0,
      daysSincePayment,
    };
  }

  if (daysSincePayment > REFUND_POLICY.GRACE_PERIOD_DAYS) {
    return {
      eligible: false,
      autoApprove: false,
      reason: REFUND_POLICY_TEXT.outOfGracePeriod,
      refundableAmount,
      daysSincePayment,
    };
  }

  if (usageRatio >= REFUND_POLICY.AUTO_APPROVAL_USAGE_THRESHOLD) {
    return {
      eligible: true, // 수동 검토는 가능
      autoApprove: false,
      reason: REFUND_POLICY_TEXT.highUsage,
      refundableAmount,
      daysSincePayment,
    };
  }

  return {
    eligible: true,
    autoApprove: true,
    reason: REFUND_POLICY_TEXT.guaranteeBanner,
    refundableAmount,
    daysSincePayment,
  };
}
