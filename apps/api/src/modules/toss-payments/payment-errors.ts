/**
 * 토스페이먼츠 에러 코드 매핑
 * 사용자 친화적인 에러 메시지로 변환
 */

export interface PaymentErrorInfo {
  code: string;
  userMessage: string;
  actionRequired: string;
  retryable: boolean;
  notifyUser: boolean;
}

// 토스페이먼츠 공식 에러 코드 매핑
export const TOSS_ERROR_CODES: Record<string, PaymentErrorInfo> = {
  // 카드 관련 에러
  CARD_COMPANY_CHECK_FAILED: {
    code: 'CARD_COMPANY_CHECK_FAILED',
    userMessage: '카드사 점검 중입니다.',
    actionRequired: '잠시 후 다시 시도해 주세요.',
    retryable: true,
    notifyUser: false,
  },
  EXCEED_MAX_CARD_INSTALLMENT_PLAN: {
    code: 'EXCEED_MAX_CARD_INSTALLMENT_PLAN',
    userMessage: '할부 개월 수 한도를 초과했습니다.',
    actionRequired: '할부 개월 수를 줄이거나 다른 카드를 사용해 주세요.',
    retryable: false,
    notifyUser: false,
  },
  NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT: {
    code: 'NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT',
    userMessage: '할부가 지원되지 않는 카드입니다.',
    actionRequired: '다른 카드를 사용하거나 일시불로 결제해 주세요.',
    retryable: false,
    notifyUser: false,
  },
  INVALID_CARD_EXPIRATION: {
    code: 'INVALID_CARD_EXPIRATION',
    userMessage: '카드 유효기간이 만료되었습니다.',
    actionRequired: '유효한 카드 정보를 입력해 주세요.',
    retryable: false,
    notifyUser: true,
  },
  INVALID_STOPPED_CARD: {
    code: 'INVALID_STOPPED_CARD',
    userMessage: '정지된 카드입니다.',
    actionRequired: '카드사에 문의하시거나 다른 카드를 사용해 주세요.',
    retryable: false,
    notifyUser: true,
  },
  EXCEED_MAX_DAILY_PAYMENT_COUNT: {
    code: 'EXCEED_MAX_DAILY_PAYMENT_COUNT',
    userMessage: '일일 결제 횟수 한도를 초과했습니다.',
    actionRequired: '내일 다시 시도하시거나 다른 카드를 사용해 주세요.',
    retryable: false,
    notifyUser: false,
  },
  EXCEED_MAX_PAYMENT_AMOUNT: {
    code: 'EXCEED_MAX_PAYMENT_AMOUNT',
    userMessage: '결제 금액이 한도를 초과했습니다.',
    actionRequired: '카드 한도를 확인하시거나 다른 카드를 사용해 주세요.',
    retryable: false,
    notifyUser: true,
  },
  INVALID_CARD_LOST_OR_STOLEN: {
    code: 'INVALID_CARD_LOST_OR_STOLEN',
    userMessage: '분실 또는 도난 신고된 카드입니다.',
    actionRequired: '카드사에 문의해 주세요.',
    retryable: false,
    notifyUser: true,
  },
  RESTRICTED_CARD: {
    code: 'RESTRICTED_CARD',
    userMessage: '사용이 제한된 카드입니다.',
    actionRequired: '카드사에 문의하시거나 다른 카드를 사용해 주세요.',
    retryable: false,
    notifyUser: true,
  },
  INVALID_CARD_NUMBER: {
    code: 'INVALID_CARD_NUMBER',
    userMessage: '카드 번호가 올바르지 않습니다.',
    actionRequired: '카드 번호를 다시 확인해 주세요.',
    retryable: false,
    notifyUser: false,
  },
  INVALID_CARD_PASSWORD: {
    code: 'INVALID_CARD_PASSWORD',
    userMessage: '카드 비밀번호가 올바르지 않습니다.',
    actionRequired: '비밀번호를 다시 확인해 주세요.',
    retryable: false,
    notifyUser: false,
  },

  // 잔액/한도 관련
  NOT_ENOUGH_CARD_BALANCE: {
    code: 'NOT_ENOUGH_CARD_BALANCE',
    userMessage: '카드 잔액이 부족합니다.',
    actionRequired: '카드 잔액을 확인하시거나 다른 카드를 사용해 주세요.',
    retryable: false,
    notifyUser: true,
  },

  // 빌링키 관련
  INVALID_BILLING_KEY: {
    code: 'INVALID_BILLING_KEY',
    userMessage: '등록된 결제 수단이 유효하지 않습니다.',
    actionRequired: '결제 수단을 다시 등록해 주세요.',
    retryable: false,
    notifyUser: true,
  },
  BILLING_KEY_EXPIRED: {
    code: 'BILLING_KEY_EXPIRED',
    userMessage: '결제 수단이 만료되었습니다.',
    actionRequired: '새로운 결제 수단을 등록해 주세요.',
    retryable: false,
    notifyUser: true,
  },

  // 네트워크/시스템 에러
  PROVIDER_ERROR: {
    code: 'PROVIDER_ERROR',
    userMessage: '결제 처리 중 오류가 발생했습니다.',
    actionRequired: '잠시 후 다시 시도해 주세요.',
    retryable: true,
    notifyUser: false,
  },
  FAILED_INTERNAL_SYSTEM_PROCESSING: {
    code: 'FAILED_INTERNAL_SYSTEM_PROCESSING',
    userMessage: '시스템 오류가 발생했습니다.',
    actionRequired: '잠시 후 다시 시도해 주세요. 문제가 지속되면 고객센터에 문의해 주세요.',
    retryable: true,
    notifyUser: false,
  },

  // 취소/환불 관련
  ALREADY_CANCELED_PAYMENT: {
    code: 'ALREADY_CANCELED_PAYMENT',
    userMessage: '이미 취소된 결제입니다.',
    actionRequired: '결제 내역을 확인해 주세요.',
    retryable: false,
    notifyUser: false,
  },
  NOT_CANCELABLE_PAYMENT: {
    code: 'NOT_CANCELABLE_PAYMENT',
    userMessage: '취소할 수 없는 결제입니다.',
    actionRequired: '고객센터에 문의해 주세요.',
    retryable: false,
    notifyUser: true,
  },
  EXCEED_CANCEL_AMOUNT: {
    code: 'EXCEED_CANCEL_AMOUNT',
    userMessage: '환불 요청 금액이 결제 금액을 초과합니다.',
    actionRequired: '환불 금액을 확인해 주세요.',
    retryable: false,
    notifyUser: false,
  },

  // 기타
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    userMessage: '잘못된 요청입니다.',
    actionRequired: '입력 정보를 확인하고 다시 시도해 주세요.',
    retryable: false,
    notifyUser: false,
  },
  UNAUTHORIZED_KEY: {
    code: 'UNAUTHORIZED_KEY',
    userMessage: '결제 시스템 인증 오류입니다.',
    actionRequired: '고객센터에 문의해 주세요.',
    retryable: false,
    notifyUser: true,
  },
};

// 기본 에러 정보 (매핑되지 않은 에러 코드용)
export const DEFAULT_ERROR_INFO: PaymentErrorInfo = {
  code: 'UNKNOWN_ERROR',
  userMessage: '결제 처리 중 오류가 발생했습니다.',
  actionRequired: '잠시 후 다시 시도해 주세요. 문제가 지속되면 고객센터(support@ongojisin.kr)에 문의해 주세요.',
  retryable: true,
  notifyUser: true,
};

/**
 * 토스 에러 코드를 사용자 친화적 메시지로 변환
 */
export function getPaymentErrorInfo(errorCode: string): PaymentErrorInfo {
  return TOSS_ERROR_CODES[errorCode] || DEFAULT_ERROR_INFO;
}

/**
 * 결제 에러 응답 생성
 */
export function createPaymentErrorResponse(error: any): {
  success: false;
  error: PaymentErrorInfo;
  originalError?: string;
} {
  const errorCode = error?.response?.data?.code || error?.code || 'UNKNOWN_ERROR';
  const errorInfo = getPaymentErrorInfo(errorCode);

  return {
    success: false,
    error: errorInfo,
    originalError: process.env.NODE_ENV === 'development'
      ? error?.response?.data?.message || error?.message
      : undefined,
  };
}

/**
 * 결제 실패 사유 분류
 */
export enum PaymentFailureCategory {
  CARD_ISSUE = 'card_issue',          // 카드 문제 (한도, 만료, 분실 등)
  SYSTEM_ERROR = 'system_error',      // 시스템 오류
  USER_INPUT = 'user_input',          // 사용자 입력 오류
  POLICY_VIOLATION = 'policy_violation', // 정책 위반
  UNKNOWN = 'unknown',
}

/**
 * 결제 실패 카테고리 분류
 */
export function categorizePaymentFailure(errorCode: string): PaymentFailureCategory {
  const cardIssues = [
    'INVALID_CARD_EXPIRATION',
    'INVALID_STOPPED_CARD',
    'EXCEED_MAX_PAYMENT_AMOUNT',
    'INVALID_CARD_LOST_OR_STOLEN',
    'RESTRICTED_CARD',
    'NOT_ENOUGH_CARD_BALANCE',
    'INVALID_BILLING_KEY',
    'BILLING_KEY_EXPIRED',
  ];

  const systemErrors = [
    'CARD_COMPANY_CHECK_FAILED',
    'PROVIDER_ERROR',
    'FAILED_INTERNAL_SYSTEM_PROCESSING',
  ];

  const userInputErrors = [
    'INVALID_CARD_NUMBER',
    'INVALID_CARD_PASSWORD',
    'INVALID_REQUEST',
  ];

  const policyViolations = [
    'EXCEED_MAX_DAILY_PAYMENT_COUNT',
    'NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT',
  ];

  if (cardIssues.includes(errorCode)) return PaymentFailureCategory.CARD_ISSUE;
  if (systemErrors.includes(errorCode)) return PaymentFailureCategory.SYSTEM_ERROR;
  if (userInputErrors.includes(errorCode)) return PaymentFailureCategory.USER_INPUT;
  if (policyViolations.includes(errorCode)) return PaymentFailureCategory.POLICY_VIOLATION;

  return PaymentFailureCategory.UNKNOWN;
}
