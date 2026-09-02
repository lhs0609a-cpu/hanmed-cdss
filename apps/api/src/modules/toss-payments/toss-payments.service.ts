import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThan, IsNull, In, QueryRunner } from 'typeorm';
import axios from 'axios';
import {
  User,
  SubscriptionTier,
  PLAN_LIMITS,
} from '../../database/entities/user.entity';
import {
  FeatureKey,
  PLAN_FEATURES,
  FEATURE_LABELS,
  PRACTITIONER_SEAT_LIMITS,
  CASE_SAVE_LIMITS,
  CASE_BROWSE_FREE_PAGES,
  CASE_VIEW_DAILY_LIMITS,
} from '../../database/entities/plan-features';
import {
  Subscription,
  SubscriptionStatus,
  BillingInterval,
  TRIAL_CONFIG,
} from '../../database/entities/subscription.entity';
import {
  UsageTracking,
  UsageType,
} from '../../database/entities/usage-tracking.entity';
import { Payment, PaymentStatus } from '../../database/entities/payment.entity';
import { Refund, RefundStatus } from '../../database/entities/refund.entity';
import {
  getPaymentErrorInfo,
  createPaymentErrorResponse,
  categorizePaymentFailure,
  PaymentFailureCategory,
  PaymentErrorInfo,
} from './payment-errors';
import { EmailService } from '../email/email.service';
import {
  REFUND_POLICY,
  REFUND_POLICY_TEXT,
  evaluateRefundEligibility,
} from './refund-policy';

// 플랜별 가격 정보 (PLG 수익모델 — 2026-06)
// 핵심 원칙:
//  1. 한의사가 매일 임상에서 쓰는 핵심 기능(변증·처방·치험례·커뮤니티)은 무료 — PLG 후킹
//  2. "돈 버는 기능"(보험청구·삭감방지)은 별도 add-on 또는 Clinic 티어
//  3. 연간 결제 시 17% 할인 (2개월 무료) — 기존 정책 유지
//  4. Free의 AI 챗봇만 월 50회 제한, 변증/검색/처방 추천은 무제한 (코어 임상은 무료)
export const PLAN_PRICES = {
  [SubscriptionTier.FREE]: {
    monthly: 0,
    yearly: 0,
    name: 'Free',
    includedQueries: PLAN_LIMITS[SubscriptionTier.FREE], // AI 챗봇 월 50회 (코어 임상은 무제한)
    overagePrice: 0,
    canExceed: false,
  },
  [SubscriptionTier.BASIC]: {
    monthly: 19900,
    yearly: 199000, // 17% 할인 (2개월 무료)
    name: 'Basic',
    includedQueries: PLAN_LIMITS[SubscriptionTier.BASIC], // AI 챗봇 월 200회
    overagePrice: 200, // 초과 시 건당 200원
    canExceed: true,
  },
  [SubscriptionTier.PROFESSIONAL]: {
    monthly: 49000, // 한의사 1인 메인 티어 (Pro)
    yearly: 490000, // 17% 할인
    name: 'Pro',
    includedQueries: PLAN_LIMITS[SubscriptionTier.PROFESSIONAL], // AI 챗봇 월 1,000회
    overagePrice: 100,
    canExceed: true,
  },
  [SubscriptionTier.CLINIC]: {
    monthly: 149000, // 한의원 단위 (원장 + 한의사 2인까지 포함)
    yearly: 1490000, // 17% 할인
    name: 'Clinic',
    includedQueries: PLAN_LIMITS[SubscriptionTier.CLINIC], // Fair Use Policy: 한의원 단위 5,000회
    overagePrice: 80,
    canExceed: true,
  },
};

/**
 * 청구 부가서비스 (Add-on) — Clinic 티어 위에 얹는 별도 상품.
 *
 * 한국 의료 SW 시장에서 가장 큰 단일 매출원은 "청구·삭감방지"라는 시장 검증을 따른다.
 * 초기엔 정액제로 단순화하고, 트랙션 확보 후 성과연동(절감액의 10~15%) 옵션을 추가 검토.
 */
export const BILLING_ADDON = {
  /** 청구 add-on 월 정액 (Clinic 티어 add-on) */
  INSURANCE_CLAIM_MONTHLY: 99000,
  /** 청구 add-on 연간 (17% 할인) */
  INSURANCE_CLAIM_YEARLY: 990000,
  name: '보험청구·삭감방지',
  description: '자동 청구 + 사전 삭감 점검 + 청구 누락 알람 + 심사 대응 가이드',
} as const;

interface TossBillingKeyResponse {
  mId: string;
  customerKey: string;
  authenticatedAt: string;
  method: string;
  billingKey: string;
  card: {
    issuerCode: string;
    acquirerCode: string;
    number: string;
    cardType: string;
    ownerType: string;
  };
}

interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  approvedAt: string;
  totalAmount: number;
  method: string;
}

@Injectable()
export class TossPaymentsService {
  private readonly logger = new Logger(TossPaymentsService.name);
  private readonly apiUrl = 'https://api.tosspayments.com/v1';
  private readonly secretKey: string;
  private readonly clientKey: string;

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private emailService: EmailService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(UsageTracking)
    private usageRepository: Repository<UsageTracking>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
  ) {
    this.secretKey = this.configService.get('TOSS_SECRET_KEY') || '';
    this.clientKey = this.configService.get('TOSS_CLIENT_KEY') || '';
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`;
  }

  // 빌링키 발급 (카드 정보로 직접 발급)
  async issueBillingKey(
    userId: string,
    cardNumber: string,
    expirationYear: string,
    expirationMonth: string,
    cardPassword: string,
    customerIdentityNumber: string, // 생년월일 6자리 또는 사업자번호 10자리
  ): Promise<{ billingKey: string; cardNumber: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const customerKey = `customer_${userId}`;

    try {
      const response = await axios.post<TossBillingKeyResponse>(
        `${this.apiUrl}/billing/authorizations/card`,
        {
          customerKey,
          cardNumber,
          cardExpirationYear: expirationYear,
          cardExpirationMonth: expirationMonth,
          cardPassword,
          customerIdentityNumber,
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      const { billingKey, card } = response.data;

      // 빌링키를 사용자 정보에 저장
      await this.userRepository.update(userId, {
        tossBillingKey: billingKey,
      });

      return {
        billingKey,
        cardNumber: card.number, // 마스킹된 카드번호
      };
    } catch (error) {
      const errorCode = error?.response?.data?.code || 'UNKNOWN_ERROR';
      const errorInfo = getPaymentErrorInfo(errorCode);

      this.logger.error(`빌링키 발급 실패: userId=${userId}, code=${errorCode}`, {
        errorCode,
        errorMessage: error?.response?.data?.message,
      });

      // 전역 예외 필터가 statusCode·error·message 만 남기고 나머지 키를
      // 버린다. code 를 여기 넣어 봐야 프론트까지 닿지 않는다 — 실제로
      // 화면에 "에러 코드: Error" 만 떴고, 그래서 자동결제 계약이 없다는
      // 사실을 알아채는 데 시간이 걸렸다. 결제 실패는 원인이 보여야 한다.
      throw new BadRequestException({
        error: errorInfo.code,
        message: errorInfo.actionRequired
          ? `${errorInfo.userMessage} ${errorInfo.actionRequired}`
          : errorInfo.userMessage,
      });
    }
  }

  /**
   * 결제창에서 받은 authKey 로 빌링키를 발급한다.
   *
   * 카드번호를 직접 받아 발급하는 방식(issueBillingKey)이 계속
   * INVALID_BILL_KEY_REQUEST 로 거절됐다. 처음에는 자동결제 계약이 없어서라고
   * 봤는데 아니었다 — 잘못된 카드번호를 보내면 INVALID_CARD_NUMBER 가 정확히
   * 돌아온다. 엔드포인트도 열려 있고 카드 검증도 돈다.
   *
   * 오류 문구가 "빌링키 인증이 완료되지 않았거나" 인 것이 답이었다. 토스
   * 문서가 못박는다 — "API로 자동결제를 연동하면 본인인증은 직접 구현해야
   * 합니다." 우리는 그 본인인증을 구현하지 않았다.
   *
   * 그래서 결제창 방식으로 옮긴다. 토스가 휴대폰 본인인증까지 처리하고
   * authKey 를 돌려주면, 그것으로 빌링키를 받는다.
   *
   * 부수적으로 얻는 것이 더 크다. 카드번호가 우리 서버를 지나가지 않는다.
   * 카드정보를 직접 받으면 그 순간부터 그 데이터를 지킬 책임이 생기는데,
   * 지키지 않아도 되는 책임은 애초에 지지 않는 편이 낫다.
   */
  async issueBillingKeyFromAuth(
    userId: string,
    customerKey: string,
    authKey: string,
  ): Promise<{ billingKey: string; cardNumber: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // customerKey 는 우리가 만들어 결제창에 넘긴 값이다. 돌아온 것이 그
    // 값과 다르면 남의 인증 결과를 가져다 쓰는 것이므로 받지 않는다.
    const expected = `customer_${userId}`;
    if (customerKey !== expected) {
      this.logger.warn(
        `빌링 인증 customerKey 불일치: userId=${userId}, got=${customerKey}`,
      );
      throw new BadRequestException({
        error: 'INVALID_CUSTOMER_KEY',
        message: '결제 인증 정보가 올바르지 않습니다. 다시 시도해 주세요.',
      });
    }

    try {
      const response = await axios.post<TossBillingKeyResponse>(
        `${this.apiUrl}/billing/authorizations/issue`,
        { customerKey, authKey },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      const { billingKey, card } = response.data;
      await this.userRepository.update(userId, { tossBillingKey: billingKey });

      this.logger.log(`빌링키 발급 완료(결제창): userId=${userId}`);
      return { billingKey, cardNumber: card?.number ?? '' };
    } catch (error) {
      const errorCode = error?.response?.data?.code || 'UNKNOWN_ERROR';
      const errorInfo = getPaymentErrorInfo(errorCode);
      this.logger.error(
        `빌링키 발급 실패(결제창): userId=${userId}, code=${errorCode}`,
        { errorMessage: error?.response?.data?.message },
      );
      throw new BadRequestException({
        error: errorInfo.code,
        message: errorInfo.actionRequired
          ? `${errorInfo.userMessage} ${errorInfo.actionRequired}`
          : errorInfo.userMessage,
      });
    }
  }

  // 빌링키로 결제 요청 (트랜잭션 적용)
  async payWithBillingKey(
    userId: string,
    tier: SubscriptionTier,
    interval: BillingInterval,
  ): Promise<{ success: boolean; paymentKey: string; error?: PaymentErrorInfo }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (!user.tossBillingKey) {
      throw new BadRequestException('등록된 결제 수단이 없습니다. 먼저 카드를 등록해주세요.');
    }

    const billingKey = user.tossBillingKey;
    const customerKey = `customer_${userId}`;
    const price = PLAN_PRICES[tier];
    const amount = interval === BillingInterval.YEARLY ? price.yearly : price.monthly;
    const orderId = `order_${userId}_${Date.now()}`;
    // 멱등키.
    //
    // 시각을 넣으면 재시도마다 값이 달라져 아무것도 막지 못한다. 그렇다고
    // 청구월(YYYY-MM)로 잡았더니 반대로 너무 넓었다 — 9월 1일에 구독하고
    // 9월 30일에 자동갱신되면 같은 키라, 정당한 갱신이 멱등에 막혀 돈은
    // 안 나갔는데 성공으로 처리되고 구독만 공짜로 연장된다.
    //
    // 날짜(YYYY-MM-DD)로 잡는다. 초 단위 재시도 폭주는 막고, 한 달 뒤
    // 갱신은 통과한다. 같은 날 같은 플랜을 두 번 청구하는 것은 어차피
    // 막아야 하는 일이다.
    const billingDay = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `sub_${userId}_${tier}_${interval}_${billingDay}`;
    const orderName = `온고지신 AI ${price.name} 플랜 (${interval === BillingInterval.YEARLY ? '연간' : '월간'})`;

    // 중복 결제 방지는 DB 부분 unique index (idx_payment_user_pending) 가 강제한다.
    // 낙관적 락 패턴: 사전 SELECT 없이 곧바로 INSERT 시도 → 충돌(23505) 이면 거부.
    // (마이그레이션: 1748000000000-BetaLaunchBillingAndInsurance)

    // QueryRunner를 사용하여 트랜잭션 시작
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let pendingPayment: Payment | null = null;

    try {
      // 1단계: 결제 전에 PENDING 상태의 Payment 레코드 먼저 생성
      pendingPayment = queryRunner.manager.create(Payment, {
        userId,
        orderId,
        orderName,
        amount,
        baseAmount: amount,
        overageAmount: 0,
        overageCount: 0,
        status: PaymentStatus.PENDING,
      });
      try {
        await queryRunner.manager.save(Payment, pendingPayment);
      } catch (insertError: any) {
        // Postgres unique_violation = 23505. 부분 unique index 위반 = 동시 결제 시도.
        const pgCode = insertError?.driverError?.code || insertError?.code;
        if (pgCode === '23505') {
          await queryRunner.rollbackTransaction();
          this.logger.warn(
            `중복 결제 시도 차단 (DB unique violation): userId=${userId}`,
          );
          throw new BadRequestException(
            '이미 처리 중인 결제가 있습니다. 결제 화면을 새로고침 후 잠시 뒤 다시 시도해 주세요.',
          );
        }
        throw insertError;
      }

      this.logger.log(`결제 시작: userId=${userId}, orderId=${orderId}, amount=${amount}`);

      // 2단계: 토스 API 호출 (결제 진행)
      const response = await axios.post<TossPaymentResponse>(
        `${this.apiUrl}/billing/${billingKey}`,
        {
          customerKey,
          amount,
          orderId,
          orderName,
          customerEmail: user.email,
          customerName: user.name,
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
            // 같은 사람이 같은 플랜을 같은 청구주기에 두 번 결제하지 못하게
            // 막는다. 환불에는 이미 이 헤더가 있었는데 정작 돈이 나가는
            // 결제에는 없었다.
            //
            // orderId 로는 못 막는다. 요청마다 Date.now() 로 새로 만들기
            // 때문에 재시도가 곧 새 주문이 된다. 실제로 프론트의 axios
            // 인터셉터가 네트워크 오류에 세 번까지 다시 보내고 있었고,
            // 그러면 카드가 네 번 긁힌다. 그쪽도 막았지만 돈 문제는
            // 한 겹으로 막지 않는다 — 다른 클라이언트나 스케줄러가
            // 같은 실수를 해도 여기서 걸린다.
            'Idempotency-Key': idempotencyKey,
          },
        },
      );

      const { paymentKey, status } = response.data;

      if (status !== 'DONE') {
        throw new Error('결제가 완료되지 않았습니다.');
      }

      // 3단계: 결제 성공 - Payment 상태 업데이트
      pendingPayment.paymentKey = paymentKey;
      pendingPayment.status = PaymentStatus.PAID;
      pendingPayment.paidAt = new Date();
      await queryRunner.manager.save(Payment, pendingPayment);

      // 4단계: 구독 정보 생성/업데이트 (트랜잭션 내에서)
      await this.createOrUpdateSubscriptionWithTransaction(
        queryRunner,
        userId,
        tier,
        interval,
        paymentKey,
        orderId,
        pendingPayment.id,
      );

      // 5단계: 모든 작업 성공 - 트랜잭션 커밋
      await queryRunner.commitTransaction();

      this.logger.log(`결제 완료: userId=${userId}, paymentKey=${paymentKey}`);

      return { success: true, paymentKey };
    } catch (error) {
      // 트랜잭션 롤백
      await queryRunner.rollbackTransaction();

      const errorCode = error?.response?.data?.code || 'UNKNOWN_ERROR';
      const errorInfo = getPaymentErrorInfo(errorCode);
      const failureCategory = categorizePaymentFailure(errorCode);

      this.logger.error(`결제 실패: userId=${userId}, code=${errorCode}, category=${failureCategory}`, {
        errorCode,
        errorMessage: error?.response?.data?.message || error.message,
        failureCategory,
        orderId,
      });

      // 결제 실패 기록 (트랜잭션 외부에서 별도 저장)
      await this.recordFailedPayment(userId, orderId, orderName, amount, errorCode, errorInfo.userMessage);

      // 토스에서 이미 결제가 된 경우 환불 처리 시도
      if (error.response?.data?.paymentKey) {
        await this.attemptRefundOnFailure(error.response.data.paymentKey, orderId, amount);
      }

      // 카드 문제인 경우 사용자에게 알림 필요 표시
      if (errorInfo.notifyUser) {
        this.logger.log(`결제 실패 알림 필요: userId=${userId}, error=${errorInfo.userMessage}`);
      }

      // 전역 예외 필터가 statusCode·error·message 만 남기고 나머지 키를
      // 버린다. 예전에는 code·action·retryable·category 를 그대로 실어
      // 보냈는데 프론트까지 하나도 닿지 않았고, 그래서 한도초과든
      // 분실카드든 잔액부족이든 화면에는 똑같이 "잠시 후 다시 시도해
      // 주세요" 만 떴다. 한도초과 카드는 다시 시도해도 계속 실패한다.
      //
      // 살아남는 두 칸에 싣는다. 식별자는 error 로, 사람이 읽을 말은
      // message 로. 기능 게이트(402)에서 쓴 것과 같은 방식이다.
      throw new BadRequestException({
        error: errorInfo.code,
        message: errorInfo.actionRequired
          ? `${errorInfo.userMessage} ${errorInfo.actionRequired}`
          : errorInfo.userMessage,
      });
    } finally {
      // QueryRunner 해제
      await queryRunner.release();
    }
  }

  /**
   * 결제 실패 시 환불 시도 (토스에서 결제는 됐지만 DB 저장 실패한 경우)
   */
  private async attemptRefundOnFailure(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<void> {
    try {
      this.logger.warn(`DB 저장 실패로 환불 시도: paymentKey=${paymentKey}, orderId=${orderId}`);

      await axios.post(
        `${this.apiUrl}/payments/${paymentKey}/cancel`,
        {
          cancelReason: '시스템 오류로 인한 자동 환불',
          cancelAmount: amount,
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`자동 환불 완료: paymentKey=${paymentKey}`);
    } catch (refundError) {
      // 환불도 실패한 경우 — 로그로만 기록 (외부 알림 채널 사용 안 함)
      this.logger.error(
        `자동 환불 실패 - 수동 확인 필요: paymentKey=${paymentKey}, orderId=${orderId}, amount=${amount}`,
        refundError,
      );
    }
  }

  /**
   * 결제 실패 기록 (트랜잭션 외부)
   */
  private async recordFailedPayment(
    userId: string,
    orderId: string,
    orderName: string,
    amount: number,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      const failedPayment = this.paymentRepository.create({
        userId,
        orderId,
        orderName,
        amount,
        baseAmount: amount,
        status: PaymentStatus.FAILED,
        failureCode: errorCode,
        failureMessage: errorMessage,
      });
      await this.paymentRepository.save(failedPayment);
    } catch (err) {
      this.logger.error('결제 실패 기록 저장 실패:', err);
    }
  }

  /**
   * 결제 시도 기록
   */
  private async recordPaymentAttempt(
    userId: string,
    orderId: string,
    amount: number,
    success: boolean,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      // 간단한 로그 기록 (추후 별도 테이블로 분리 가능)
      this.logger.log(`결제 시도 기록: userId=${userId}, orderId=${orderId}, amount=${amount}, success=${success}`, {
        userId,
        orderId,
        amount,
        success,
        errorCode,
        errorMessage,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('결제 시도 기록 실패:', err);
    }
  }

  // 구독 생성/업데이트 (트랜잭션 내에서 실행)
  private async createOrUpdateSubscriptionWithTransaction(
    queryRunner: QueryRunner,
    userId: string,
    tier: SubscriptionTier,
    interval: BillingInterval,
    paymentKey: string,
    orderId: string,
    paymentId: string,
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now);

    if (interval === BillingInterval.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 기존 구독 정리.
    //
    // ACTIVE 만 지우면 안 된다. 결제가 한 번 실패해 PAST_DUE 로 내려간
    // 구독은 그대로 남고 새 ACTIVE 가 하나 더 생겨, 한 사람에게 살아 있는
    // 구독이 둘이 된다. 그중 하나는 기간이 이미 지난 채라 다음날 자동갱신
    // 크론이 다시 집어서 또 결제한다.
    await queryRunner.manager.update(
      Subscription,
      {
        userId,
        status: In([
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PAST_DUE,
          // 체험 중에 바로 결제하는 경우가 있다. 체험 행을 남기면 살아
          // 있는 구독이 둘이 된다.
          SubscriptionStatus.TRIALING,
        ]),
      },
      { status: SubscriptionStatus.CANCELED, canceledAt: now },
    );

    // 새 구독 생성
    const subscription = queryRunner.manager.create(Subscription, {
      userId,
      stripeSubscriptionId: paymentKey, // 토스 paymentKey 저장
      stripePriceId: orderId,
      status: SubscriptionStatus.ACTIVE,
      billingInterval: interval,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });

    const savedSubscription = await queryRunner.manager.save(Subscription, subscription);

    // Payment에 구독 ID 연결
    await queryRunner.manager.update(Payment, paymentId, {
      subscriptionId: savedSubscription.id,
    });

    // 사용자 구독 정보 업데이트
    await queryRunner.manager.update(User, userId, {
      subscriptionTier: tier,
      subscriptionExpiresAt: periodEnd,
    });

    this.logger.log(`구독 생성 완료: userId=${userId}, tier=${tier}, interval=${interval}`);
  }

  // 구독 생성/업데이트 (레거시 - 트랜잭션 없이)
  private async createOrUpdateSubscription(
    userId: string,
    tier: SubscriptionTier,
    interval: BillingInterval,
    paymentKey: string,
    orderId: string,
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now);

    if (interval === BillingInterval.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 기존 활성 구독 취소
    await this.subscriptionRepository.update(
      { userId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.CANCELED, canceledAt: now },
    );

    // 새 구독 생성
    const subscription = this.subscriptionRepository.create({
      userId,
      stripeSubscriptionId: paymentKey, // 토스 paymentKey 저장
      stripePriceId: orderId,
      status: SubscriptionStatus.ACTIVE,
      billingInterval: interval,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });

    await this.subscriptionRepository.save(subscription);

    // 사용자 구독 정보 업데이트
    await this.userRepository.update(userId, {
      subscriptionTier: tier,
      subscriptionExpiresAt: periodEnd,
    });

    this.logger.log(`구독 생성 완료: userId=${userId}, tier=${tier}, interval=${interval}`);
  }

  /**
   * 부가서비스 결제.
   *
   * 애드온 가입에 결제 호출이 아예 없었다. 레코드만 만들고 ACTIVE 로
   * 띄웠고("별도 PR에서 통합" 이라는 주석만 남아 있었다), 화면에는 구독
   * 버튼이 그대로 있었다. 누르면 카드는 안 긁히는데 "구독되었습니다" 가
   * 뜨고 유료 기능이 열린다. 결제가 안 됐는데 됐다고 말하는 것이라
   * 요금제 전체를 못 믿게 만든다.
   *
   * 플랜 결제(payWithBillingKey)와 같은 규칙을 따른다 — 트랜잭션 안에서
   * PENDING Payment 를 먼저 남기고, 토스가 DONE 을 주면 PAID 로 바꾸고,
   * 중간에 실패하면 롤백한 뒤 이미 나간 돈이 있으면 환불을 시도한다.
   *
   * 성공하면 paymentKey 를 돌려준다. 부르는 쪽이 애드온 레코드에 남겨
   * 나중에 환불할 때 어느 결제인지 찾을 수 있게 한다.
   */
  async chargeAddon(
    userId: string,
    addonKey: string,
    addonName: string,
    amount: number,
    interval: BillingInterval,
  ): Promise<{ paymentKey: string; paymentId: string }> {
    if (!Number.isFinite(amount) || amount <= 0) {
      // 0원을 토스로 보내면 거절당한다. 여기서 먼저 막아야 원인이 드러난다.
      throw new BadRequestException('부가서비스 금액이 올바르지 않습니다.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    if (!user.tossBillingKey) {
      throw new BadRequestException(
        '등록된 결제 수단이 없습니다. 먼저 카드를 등록해주세요.',
      );
    }

    const billingKey = user.tossBillingKey;
    const customerKey = `customer_${userId}`;
    const orderId = `addon_${userId}_${Date.now()}`;
    const orderName = `온고지신 AI ${addonName} (${
      interval === BillingInterval.YEARLY ? '연간' : '월간'
    })`;
    // 플랜 결제와 같은 이유로 날짜 단위. 같은 날 같은 부가서비스를 두 번
    // 청구하지 않는다.
    const billingDay = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `addon_${userId}_${addonKey}_${interval}_${billingDay}`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const pendingPayment = queryRunner.manager.create(Payment, {
        userId,
        orderId,
        orderName,
        amount,
        baseAmount: amount,
        overageAmount: 0,
        overageCount: 0,
        status: PaymentStatus.PENDING,
      });
      await queryRunner.manager.save(Payment, pendingPayment);

      const response = await axios.post<TossPaymentResponse>(
        `${this.apiUrl}/billing/${billingKey}`,
        {
          customerKey,
          amount,
          orderId,
          orderName,
          customerEmail: user.email,
          customerName: user.name,
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
        },
      );

      const { paymentKey, status } = response.data;
      if (status !== 'DONE') {
        throw new Error('결제가 완료되지 않았습니다.');
      }

      pendingPayment.paymentKey = paymentKey;
      pendingPayment.status = PaymentStatus.PAID;
      pendingPayment.paidAt = new Date();
      await queryRunner.manager.save(Payment, pendingPayment);

      await queryRunner.commitTransaction();
      this.logger.log(
        `부가서비스 결제 완료: userId=${userId}, addon=${addonKey}, amount=${amount}`,
      );
      return { paymentKey, paymentId: pendingPayment.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      const errorCode = error?.response?.data?.code || 'UNKNOWN_ERROR';
      const errorInfo = getPaymentErrorInfo(errorCode);
      this.logger.error(
        `부가서비스 결제 실패: userId=${userId}, addon=${addonKey}, code=${errorCode}`,
      );

      // 돈은 나갔는데 우리 쪽 저장이 실패한 경우가 가장 나쁘다. 되돌린다.
      if (error.response?.data?.paymentKey) {
        await this.attemptRefundOnFailure(
          error.response.data.paymentKey,
          orderId,
          amount,
        );
      }

      throw new BadRequestException({
        error: errorInfo.code,
        message: errorInfo.actionRequired
          ? `${errorInfo.userMessage} ${errorInfo.actionRequired}`
          : errorInfo.userMessage,
      });
    } finally {
      await queryRunner.release();
    }
  }

  // 구독 취소
  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      throw new NotFoundException('활성화된 구독이 없습니다.');
    }

    // 구독 기간 종료 시점에 취소되도록 예약
    subscription.cancelAt = subscription.currentPeriodEnd;
    await this.subscriptionRepository.save(subscription);

    this.logger.log(`구독 취소 예약: userId=${userId}, cancelAt=${subscription.cancelAt}`);
  }

  // 구독 즉시 취소
  async cancelSubscriptionImmediately(userId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      throw new NotFoundException('활성화된 구독이 없습니다.');
    }

    subscription.status = SubscriptionStatus.CANCELED;
    subscription.canceledAt = new Date();
    await this.subscriptionRepository.save(subscription);

    // 등급은 낸 기간이 끝날 때까지 그대로 둔다.
    //
    // 예전에는 여기서 바로 Free 로 내리고 subscriptionExpiresAt 을 지웠다.
    // 한 달치를 결제한 사람이 취소를 누르는 순간 남은 기간을 통째로 잃는데
    // 환불은 따로 신청해야 한다 — 돈은 받고 서비스는 끊는 셈이었다.
    //
    // 여기서 하는 일은 다음 청구를 멈추는 것까지다. 만료일이 지나면
    // effectiveTier 가 알아서 Free 로 본다. 돈을 돌려받고 싶으면 환불
    // 창구를 쓰고, 전액 환불이 되면 그때 등급을 회수한다.
    this.logger.log(
      `구독 즉시 취소(청구 중단): userId=${userId}, ` +
        `이용 가능 기간=${subscription.currentPeriodEnd?.toISOString() ?? '없음'}`,
    );
  }

  // 만료된 구독 처리 (크론잡에서 호출)
  async processExpiredSubscriptions(): Promise<void> {
    const now = new Date();

    // 취소 예약된 구독 중 현재 기간이 종료된 것 처리
    const expiredSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        cancelAt: LessThanOrEqual(now),
      },
    });

    for (const sub of expiredSubscriptions) {
      sub.status = SubscriptionStatus.CANCELED;
      sub.canceledAt = now;
      await this.subscriptionRepository.save(sub);

      await this.userRepository.update(sub.userId, {
        subscriptionTier: SubscriptionTier.FREE,
        subscriptionExpiresAt: null,
      });

      this.logger.log(`만료된 구독 처리: subscriptionId=${sub.id}`);
    }
  }

  // 자동 갱신 결제 (크론잡에서 호출)
  async processAutoRenewals(): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 내일 만료되는 활성 구독 중 취소 예약이 없는 것
    const subscriptionsToRenew = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: LessThanOrEqual(tomorrow),
        cancelAt: IsNull(),
      },
    });

    for (const sub of subscriptionsToRenew) {
      try {
        const user = await this.userRepository.findOne({ where: { id: sub.userId } });
        if (!user || !user.tossBillingKey) continue;

        // 무료 등급은 갱신하지 않는다.
        //
        // 여기서 티어를 user 에서 읽는데(Subscription 에 티어 칸이 없다),
        // 만료·취소로 FREE 로 내려간 사용자가 걸릴 수 있다. FREE 는 월
        // 0원이라 0원 결제를 시도하게 된다. 받을 돈이 없으면 청구하지 않는다.
        if (user.subscriptionTier === SubscriptionTier.FREE) {
          this.logger.warn(
            `자동 갱신 건너뜀(무료 등급): userId=${sub.userId}, subId=${sub.id}`,
          );
          continue;
        }

        // 다음 결제 실행
        await this.payWithBillingKey(
          sub.userId,
          user.subscriptionTier,
          sub.billingInterval,
        );

        // 여기서 sub 를 저장하지 않는다.
        //
        // payWithBillingKey 가 트랜잭션 안에서 이 구독을 CANCELED 로 바꾸고
        // 새 기간의 구독을 따로 만든다. 그런데 이 루프가 들고 있는 sub 는
        // 아직 status=ACTIVE 에 옛 기간이 담긴 낡은 객체다. 그대로 save 하면
        // 방금 정리한 행이 되살아나 살아 있는 구독이 둘이 되고, 그중 하나는
        // 기간이 지난 채라 다음날 크론이 또 집어서 또 결제한다. 매일.
        this.logger.log(`자동 갱신 성공: userId=${sub.userId}, subId=${sub.id}`);
      } catch (error) {
        this.logger.error(`자동 갱신 실패: userId=${sub.userId}`, error);

        // 결제 실패 시 재시도 정보 저장 + 3일 유예 기간 시작
        sub.paymentRetryCount = (sub.paymentRetryCount || 0) + 1;
        sub.lastPaymentError = error.message || '결제 실패';
        sub.status = SubscriptionStatus.PAST_DUE;
        if (!sub.paymentFailedAt) {
          sub.paymentFailedAt = new Date();
          sub.pastDueUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        }
        await this.subscriptionRepository.save(sub);

        // 즉시 알림 트리거 (3일 유예 안내)
        await this.notifyPaymentFailure(
          sub.userId,
          sub.id,
          sub.lastPaymentError,
          sub.pastDueUntil,
        );
      }
    }
  }

  /**
   * 결제 실패 알림 트리거 (Notification 모듈 미연동 stub).
   *
   * 현 시점 — 별도 system notification 테이블이 없으므로 로그 + Subscription.metadata
   * 에 알림 발송 기록만 저장. 추후 NotificationsModule 의 Kakao Biz / 이메일 채널 연동.
   */
  private async notifyPaymentFailure(
    userId: string,
    subscriptionId: string,
    errorMessage: string,
    pastDueUntil: Date | null,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) return;

      this.logger.warn(
        `[결제실패알림] userId=${userId}, email=${user.email}, ` +
          `pastDueUntil=${pastDueUntil?.toISOString()}, reason=${errorMessage}`,
      );

      // 이메일 채널 — 기존 EmailService 가 있으면 사용 (sendPaymentFailedEmail 메서드는 미존재
      // 일 수 있으니 best-effort)
      const emailSvc = this.emailService as any;
      if (typeof emailSvc?.sendPaymentFailedEmail === 'function') {
        await emailSvc.sendPaymentFailedEmail(
          user.email,
          user.name,
          errorMessage,
          pastDueUntil,
        );
      }

      // Subscription.metadata 에 알림 발송 기록 (DB stub)
      const sub = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
      });
      if (sub) {
        sub.metadata = {
          ...sub.metadata,
          paymentFailedNotifiedAt: new Date().toISOString(),
          lastFailureReason: errorMessage,
        };
        await this.subscriptionRepository.save(sub);
      }
    } catch (err) {
      this.logger.error('결제실패 알림 발송 실패:', err);
    }
  }

  /**
   * PAST_DUE 유예 만료 처리 — pastDueUntil 경과한 구독을 SUSPENDED 로 전환.
   * 크론잡(billing-scheduler)에서 매시간 호출.
   */
  async processSuspendOverdueSubscriptions(): Promise<void> {
    const now = new Date();

    const overdue = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        pastDueUntil: LessThanOrEqual(now),
      },
    });

    for (const sub of overdue) {
      sub.status = SubscriptionStatus.SUSPENDED;
      await this.subscriptionRepository.save(sub);

      this.logger.warn(
        `3일 유예 경과 — 구독 SUSPENDED: userId=${sub.userId}, subId=${sub.id}`,
      );

      // 사용자에게 마지막 안내 발송
      await this.notifyPaymentFailure(
        sub.userId,
        sub.id,
        '결제 미해결로 서비스 일시 정지됨',
        null,
      );
    }
  }

  // 결제 실패 재시도 (크론잡에서 호출)
  async processPaymentRetries(): Promise<void> {
    const MAX_RETRY_COUNT = 3;

    // PAST_DUE 상태이고 재시도 횟수가 3회 미만인 구독
    const failedSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });

    for (const sub of failedSubscriptions) {
      if ((sub.paymentRetryCount || 0) >= MAX_RETRY_COUNT) {
        // 최대 재시도 횟수 초과 시 구독 취소
        sub.status = SubscriptionStatus.CANCELED;
        sub.canceledAt = new Date();
        await this.subscriptionRepository.save(sub);

        await this.userRepository.update(sub.userId, {
          subscriptionTier: SubscriptionTier.FREE,
          subscriptionExpiresAt: null,
        });

        this.logger.log(`결제 실패로 구독 취소: userId=${sub.userId}, retryCount=${sub.paymentRetryCount}`);
        continue;
      }

      // 재시도 간격을 지킨다.
      //
      // 이 크론은 매시간 돈다. 간격 검사가 없으면 실패한 카드를 세 시간
      // 안에 세 번 긁고 재시도를 다 써 버린다. 3일 유예를 둔 뜻이 없어지고,
      // 짧은 시간에 거절이 몰리면 카드사가 이상거래로 막는다.
      //
      // 첫 실패로부터 하루씩 벌린다 — 1회차는 1일 뒤, 2회차는 2일 뒤.
      if (sub.paymentFailedAt) {
        const waitDays = sub.paymentRetryCount || 1;
        const nextAttemptAt = new Date(sub.paymentFailedAt);
        nextAttemptAt.setDate(nextAttemptAt.getDate() + waitDays);
        if (new Date() < nextAttemptAt) continue;
      }

      try {
        const user = await this.userRepository.findOne({ where: { id: sub.userId } });
        if (!user || !user.tossBillingKey) continue;

        // 무료 등급에는 청구하지 않는다. 0원 결제를 시도하게 된다.
        if (user.subscriptionTier === SubscriptionTier.FREE) {
          this.logger.warn(
            `재시도 건너뜀(무료 등급): userId=${sub.userId}, subId=${sub.id}`,
          );
          continue;
        }

        await this.payWithBillingKey(
          sub.userId,
          user.subscriptionTier,
          sub.billingInterval,
        );

        // 자동갱신과 같은 이유로 sub 를 저장하지 않는다. payWithBillingKey 가
        // 이 행을 CANCELED 로 정리하고 새 구독을 만들었는데, 낡은 객체를
        // ACTIVE 로 되돌려 저장하면 살아 있는 구독이 둘이 된다.
        this.logger.log(`결제 재시도 성공: userId=${sub.userId}, subId=${sub.id}`);
      } catch (error) {
        sub.paymentRetryCount = (sub.paymentRetryCount || 0) + 1;
        sub.lastPaymentError = error.message || '결제 실패';
        await this.subscriptionRepository.save(sub);

        this.logger.error(`결제 재시도 실패: userId=${sub.userId}, retryCount=${sub.paymentRetryCount}`, error);
      }
    }
  }

  /**
   * 지금 실제로 적용되는 등급.
   *
   * subscriptionTier 를 그대로 믿으면 안 된다. 강등은 매일 자정 크론이
   * 하는데 그날 앱이 안 떠 있었거나 크론이 한 번 실패하면 유료 등급이
   * 그대로 남는다.
   *
   * 이 값을 한 곳에서 정하는 이유는 화면과 차단이 어긋나면 안 되기
   * 때문이다. 한도를 보여주는 곳과 막는 곳이 서로 다른 규칙을 쓰면
   * "1,000회라고 적혀 있는데 50회에서 막힌다" 가 된다. 돈 낸 사람에게
   * 그보다 나쁜 경험은 없다.
   *
   * 만료일이 없으면 건드리지 않는다. 값이 없다고 만료된 것은 아니다.
   */
  private effectiveTier(user: User): SubscriptionTier {
    const expiresAt = user.subscriptionExpiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return SubscriptionTier.FREE;
    }
    return user.subscriptionTier;
  }

  // 사용량 추적 (트랜잭션 + 락으로 race condition 방지)
  async trackUsage(userId: string, usageType: UsageType): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 사용자 조회 (락 적용)
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!user) {
        await queryRunner.rollbackTransaction();
        // false 를 돌려주면 호출자가 '이번 달 한도를 다 썼다' 로 안내한다.
        // 사용자가 없는 것은 한도 문제가 아니다.
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // 2. 사용량 조회 (비관적 락 - FOR UPDATE)
      let usage = await queryRunner.manager.findOne(UsageTracking, {
        where: { userId, usageType, periodStart },
        lock: { mode: 'pessimistic_write' },
      });

      if (!usage) {
        // 새 레코드 생성 시에도 트랜잭션 내에서 처리
        usage = queryRunner.manager.create(UsageTracking, {
          userId,
          usageType,
          count: 0,
          periodStart,
          periodEnd,
        });
        await queryRunner.manager.save(UsageTracking, usage);

        // 저장 후 다시 락을 걸어 조회
        usage = await queryRunner.manager.findOne(UsageTracking, {
          where: { userId, usageType, periodStart },
          lock: { mode: 'pessimistic_write' },
        });

        if (!usage) {
          await queryRunner.rollbackTransaction();
          return false;
        }
      }

      // 3. 무료 체험 중인지 확인
      const trialSubscription = await queryRunner.manager.findOne(Subscription, {
        where: { userId, status: SubscriptionStatus.TRIALING, isTrial: true },
      });

      // 4. 제한 계산 (체험 중이면 TRIAL_AI_LIMIT, 아니면 플랜별 제한)
      //
      // 만료일이 지났으면 무료로 본다. 강등은 매일 자정 크론이 하는데,
      // 그날 앱이 안 떠 있었거나 크론이 실패하면 유료 한도가 그대로
      // 남는다. 결제가 끊긴 사람이 계속 쓰는 것을 하루짜리 크론 하나에
      // 기대지 않는다.
      //
      // 만료일이 아예 없는 경우는 건드리지 않는다 — 값이 없다고 해서
      // 만료된 것은 아니다.
      const limit = trialSubscription
        ? TRIAL_CONFIG.TRIAL_AI_LIMIT
        : PLAN_LIMITS[this.effectiveTier(user)];

      // 5. 제한 체크 (락이 걸린 상태에서 정확한 값 체크)
      if (usageType === UsageType.AI_QUERY && usage.count >= limit) {
        await queryRunner.rollbackTransaction();
        return false;
      }

      // 6. 사용량 증가 및 저장
      usage.count += 1;
      await queryRunner.manager.save(UsageTracking, usage);

      // 7. 트랜잭션 커밋
      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`사용량 추적 실패: userId=${userId}, usageType=${usageType}`, error);
      // 여기서 false 를 돌려주던 것이 문제였다. 호출하는 가드가 false 를
      // '이번 달 한도를 다 썼다' 로 읽어 402 를 던진다. DB 가 한 번
      // 삐끗한 것을 두고 돈 낸 사람에게 "요금제를 올리라" 고 말하는 셈이다.
      //
      // 세지 못한 것과 한도를 넘은 것은 다른 일이다. 못 센 것은 그대로
      // 올려 보내 서버 오류로 다루게 한다.
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 사용량 조회
  async getUsage(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const usages = await this.usageRepository.find({
      where: { userId, periodStart },
    });

    const aiQueryUsage = usages.find((u) => u.usageType === UsageType.AI_QUERY);

    // 무료 체험 중인지 확인
    const trialSubscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.TRIALING, isTrial: true },
    });

    // 체험 중이면 TRIAL_AI_LIMIT 적용, 아니면 플랜별 제한 적용.
    // 차단하는 쪽(trackUsage)과 반드시 같은 규칙이어야 한다.
    const limit = trialSubscription
      ? TRIAL_CONFIG.TRIAL_AI_LIMIT
      : PLAN_LIMITS[this.effectiveTier(user)];

    return {
      aiQuery: {
        used: aiQueryUsage?.count || 0,
        limit: limit === Infinity ? -1 : limit,
        isTrial: !!trialSubscription,
        trialEndsAt: trialSubscription?.trialEndsAt || null,
      },
      resetDate: nextMonth.toISOString(),
    };
  }

  // 구독 정보 조회
  async getSubscriptionInfo(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    const features = Array.from(PLAN_FEATURES[user.subscriptionTier] ?? []);

    return {
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      hasBillingKey: !!user.tossBillingKey,
      features, // 현재 티어에서 접근 가능한 FeatureKey 목록 — 프론트 게이팅용
      seats: PRACTITIONER_SEAT_LIMITS[user.subscriptionTier] ?? 1,
      caseSaveLimit:
        CASE_SAVE_LIMITS[user.subscriptionTier] === Infinity
          ? -1
          : CASE_SAVE_LIMITS[user.subscriptionTier],
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            billingInterval: subscription.billingInterval,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAt: subscription.cancelAt,
          }
        : null,
    };
  }

  // 요금제 목록 조회
  getPlans() {
    /** PLAN_FEATURES 매트릭스의 FeatureKey를 사람이 읽는 한글 라벨로 변환 */
    const featureLabels = (tier: SubscriptionTier): string[] =>
      Array.from(PLAN_FEATURES[tier]).map((key) => FEATURE_LABELS[key]);

    return {
      plans: [
        {
          tier: 'free',
          name: 'Free',
          description: '한의사·학생·수련생 — 핵심 임상은 영구 무료',
          // 치험례를 "무제한" 으로 팔지 않는다. 검색은 정말 무제한이지만
          // 목록 둘러보기와 원문 열람에는 한도가 있다 — 결제 후에 알게 되면
          // 그건 속인 것이고, 환불보다 신뢰를 잃는 쪽이 비싸다.
          tagline: '변증·처방·커뮤니티 무제한 · 치험례 검색 무제한',
          features: [
            `AI 챗봇 월 ${PLAN_PRICES[SubscriptionTier.FREE].includedQueries}회`,
            '변증·통합진단 무제한',
            '처방 추천 + 근거 무제한',
            '증상·치험례 검색 무제한',
            `치험례 목록 ${CASE_BROWSE_FREE_PAGES}페이지 · 원문 하루 ${CASE_VIEW_DAILY_LIMITS[SubscriptionTier.FREE]}건`,
            '커뮤니티 무제한',
            '한약재·DUR / 침구혈자리',
          ],
          featureKeys: Array.from(PLAN_FEATURES[SubscriptionTier.FREE]),
          featureLabels: featureLabels(SubscriptionTier.FREE),
          monthlyPrice: 0,
          yearlyPrice: 0,
          aiQueryLimit: PLAN_PRICES[SubscriptionTier.FREE].includedQueries,
          overagePrice: 0,
          canExceed: false,
          seats: PRACTITIONER_SEAT_LIMITS[SubscriptionTier.FREE],
          caseSaveLimit: CASE_SAVE_LIMITS[SubscriptionTier.FREE],
        },
        {
          tier: 'basic',
          name: 'Basic',
          description: '한약사·예비개원의 — 가볍게 시작',
          features: [
            `AI 챗봇 월 ${PLAN_PRICES[SubscriptionTier.BASIC].includedQueries}회 (초과 ${PLAN_PRICES[SubscriptionTier.BASIC].overagePrice}원/건)`,
            `치험례 전체 열람 (원문 하루 ${CASE_VIEW_DAILY_LIMITS[SubscriptionTier.BASIC]}건)`,
            '케이스 저장 50건',
            '내 케이스 내보내기 (PDF/이미지)',
            '기본 통계',
            '이메일 지원',
          ],
          featureKeys: Array.from(PLAN_FEATURES[SubscriptionTier.BASIC]),
          featureLabels: featureLabels(SubscriptionTier.BASIC),
          monthlyPrice: PLAN_PRICES[SubscriptionTier.BASIC].monthly,
          yearlyPrice: PLAN_PRICES[SubscriptionTier.BASIC].yearly,
          aiQueryLimit: PLAN_PRICES[SubscriptionTier.BASIC].includedQueries,
          overagePrice: PLAN_PRICES[SubscriptionTier.BASIC].overagePrice,
          canExceed: true,
          seats: PRACTITIONER_SEAT_LIMITS[SubscriptionTier.BASIC],
          caseSaveLimit: CASE_SAVE_LIMITS[SubscriptionTier.BASIC],
        },
        {
          tier: 'professional',
          name: 'Pro',
          description: '한의사 1인 — 활발한 임상의 메인 티어',
          tagline: '환자관리 + 음성차트 + 무제한 저장',
          features: [
            `AI 챗봇 월 ${PLAN_PRICES[SubscriptionTier.PROFESSIONAL].includedQueries.toLocaleString()}회`,
            `치험례 전체 열람 (원문 하루 ${CASE_VIEW_DAILY_LIMITS[SubscriptionTier.PROFESSIONAL]}건)`,
            '케이스 무제한 저장 + 통계',
            '환자 관리 (전자차트)',
            '음성차트 (Voice Chart)',
            '고급 검색 필터·학파 비교',
            '내 케이스 워터마크 없이 내보내기',
            '우선 지원',
          ],
          featureKeys: Array.from(PLAN_FEATURES[SubscriptionTier.PROFESSIONAL]),
          featureLabels: featureLabels(SubscriptionTier.PROFESSIONAL),
          monthlyPrice: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].monthly,
          yearlyPrice: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].yearly,
          aiQueryLimit: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].includedQueries,
          overagePrice: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].overagePrice,
          canExceed: true,
          seats: PRACTITIONER_SEAT_LIMITS[SubscriptionTier.PROFESSIONAL],
          caseSaveLimit: -1, // unlimited
          recommended: true,
        },
        {
          tier: 'clinic',
          name: 'Clinic',
          description: '한의원 단위 (원장 + 한의사 2인 포함)',
          tagline: '보험청구·삭감방지 포함 · 팀 협업',
          features: [
            `AI 챗봇 월 ${PLAN_PRICES[SubscriptionTier.CLINIC].includedQueries.toLocaleString()}회 (Fair Use)`,
            `다인 계정 (기본 ${PRACTITIONER_SEAT_LIMITS[SubscriptionTier.CLINIC]}인, 추가 시트 별도)`,
            '보험청구·삭감방지 포함',
            '한의원 단위 대시보드·고급 분석',
            '한의원 공동 케이스 DB',
            '전담 지원',
          ],
          featureKeys: Array.from(PLAN_FEATURES[SubscriptionTier.CLINIC]),
          featureLabels: featureLabels(SubscriptionTier.CLINIC),
          monthlyPrice: PLAN_PRICES[SubscriptionTier.CLINIC].monthly,
          yearlyPrice: PLAN_PRICES[SubscriptionTier.CLINIC].yearly,
          aiQueryLimit: PLAN_PRICES[SubscriptionTier.CLINIC].includedQueries,
          overagePrice: PLAN_PRICES[SubscriptionTier.CLINIC].overagePrice,
          canExceed: true,
          seats: PRACTITIONER_SEAT_LIMITS[SubscriptionTier.CLINIC],
          caseSaveLimit: -1,
        },
        {
          tier: 'enterprise',
          name: 'Enterprise',
          description: '한방병원·네트워크 — 별도 협의',
          features: [
            '무제한 AI 쿼리',
            '전용 서버 환경',
            '맞춤형 API 연동',
            'SLA 보장 (99.9%)',
            '전담 계정 매니저',
            '개인정보 컴플라이언스',
          ],
          featureKeys: [],
          featureLabels: [],
          monthlyPrice: 0,
          yearlyPrice: 0,
          aiQueryLimit: -1,
          overagePrice: 0,
          canExceed: false,
          seats: -1,
          caseSaveLimit: -1,
          isCustom: true,
        },
      ],
      addons: [
        {
          key: 'insurance_claim',
          name: BILLING_ADDON.name,
          description: BILLING_ADDON.description,
          monthlyPrice: BILLING_ADDON.INSURANCE_CLAIM_MONTHLY,
          yearlyPrice: BILLING_ADDON.INSURANCE_CLAIM_YEARLY,
          requiresTier: SubscriptionTier.PROFESSIONAL, // Pro 이상에서 add-on 가능 (Clinic은 포함)
          includedInTiers: [SubscriptionTier.CLINIC],
          features: [
            '자동 보험청구',
            '삭감 위험 사전 점검',
            '청구 누락 알람',
            '심사 대응 가이드',
          ],
        },
      ],
    };
  }

  // 클라이언트 키 반환 (프론트엔드용)
  getClientKey(): string {
    return this.clientKey;
  }

  // ========== 무료 체험 관련 ==========

  /**
   * 무료 체험 시작 (14일 + AI 30건)
   * - 카드 등록 없이 바로 시작 가능
   * - Professional 플랜 기능 제공 (AI 쿼리는 30건으로 제한)
   * - 14일 후 자동으로 Free 플랜으로 전환
   */
  async startFreeTrial(
    userId: string,
    targetTier: SubscriptionTier,
    interval: BillingInterval = BillingInterval.MONTHLY,
  ): Promise<{
    success: boolean;
    trialEndsAt: Date;
    message: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (targetTier === SubscriptionTier.FREE) {
      throw new BadRequestException('체험할 유료 플랜을 선택해 주세요.');
    }

    // 카드 없이 체험을 시작하지 않는다.
    //
    // 예전에는 카드 없이 시작하고 14일 뒤 조용히 Free 로 내려갔다. 체험을
    // 왜 하는지 생각하면 앞뒤가 안 맞는다 — 써 보고 마음에 들면 결제로
    // 이어져야 하는데, 기능이 꺼진 뒤 다시 결제 화면을 찾아 들어와야 했다.
    // 그 사이에 대부분은 돌아오지 않는다.
    //
    // 카드를 먼저 받으면 체험이 끝나는 날 자동으로 결제된다. 대신 그
    // 사실을 화면에서 분명히 알려야 한다 — 모르고 결제되면 그건 사기다.
    if (!user.tossBillingKey) {
      throw new BadRequestException({
        error: 'BILLING_KEY_REQUIRED',
        message:
          '무료 체험을 시작하려면 결제 수단을 먼저 등록해 주세요. 체험 기간에는 결제되지 않습니다.',
      });
    }

    // 이미 체험 중이거나 유료 구독 중인 경우
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: [
        { userId, status: SubscriptionStatus.TRIALING },
        { userId, status: SubscriptionStatus.ACTIVE },
      ],
    });

    if (existingSubscription) {
      if (existingSubscription.isTrial) {
        throw new BadRequestException('이미 무료 체험 중입니다.');
      }
      throw new BadRequestException('이미 유료 구독 중입니다.');
    }

    // 이전에 체험을 사용한 적이 있는지 확인
    const previousTrial = await this.subscriptionRepository.findOne({
      where: { userId, isTrial: true },
    });

    if (previousTrial) {
      throw new BadRequestException('무료 체험은 1회만 가능합니다. 유료 플랜을 구독해 주세요.');
    }

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_CONFIG.TRIAL_DAYS);

    // 체험 구독 생성
    const trialSubscription = this.subscriptionRepository.create({
      userId,
      stripeSubscriptionId: `trial_${userId}_${Date.now()}`,
      status: SubscriptionStatus.TRIALING,
      billingInterval: interval,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      isTrial: true,
      trialStartedAt: now,
      trialEndsAt,
      // 끝나는 날 이 플랜으로 결제한다.
      trialTargetTier: targetTier,
    });

    await this.subscriptionRepository.save(trialSubscription);

    // 사용자 플랜 업그레이드
    await this.userRepository.update(userId, {
      subscriptionTier: TRIAL_CONFIG.TRIAL_TIER,
      subscriptionExpiresAt: trialEndsAt,
    });

    this.logger.log(`무료 체험 시작: userId=${userId}, trialEndsAt=${trialEndsAt.toISOString()}`);

    // 체험 시작 이메일 발송
    await this.emailService.sendTrialStartEmail(
      user.email,
      user.name,
      trialEndsAt,
      TRIAL_CONFIG.TRIAL_AI_LIMIT,
    );

    return {
      success: true,
      trialEndsAt,
      message: `${TRIAL_CONFIG.TRIAL_DAYS}일 무료 체험이 시작되었습니다. AI 쿼리 ${TRIAL_CONFIG.TRIAL_AI_LIMIT}건과 ${TRIAL_CONFIG.TRIAL_TIER} 플랜의 기능을 이용하실 수 있습니다.`,
    };
  }

  /**
   * 체험 기간 확인
   */
  async getTrialStatus(userId: string): Promise<{
    isTrialing: boolean;
    daysRemaining: number | null;
    trialEndsAt: Date | null;
    canStartTrial: boolean;
    aiUsed?: number;
    aiLimit?: number;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 현재 체험 중인 구독 확인
    const trialSubscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.TRIALING, isTrial: true },
    });

    if (trialSubscription && trialSubscription.trialEndsAt) {
      const now = new Date();
      const daysRemaining = Math.ceil(
        (trialSubscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 체험 기간 AI 사용량 조회
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const aiUsage = await this.usageRepository.findOne({
        where: { userId, usageType: UsageType.AI_QUERY, periodStart },
      });

      return {
        isTrialing: true,
        daysRemaining: Math.max(0, daysRemaining),
        trialEndsAt: trialSubscription.trialEndsAt,
        canStartTrial: false,
        aiUsed: aiUsage?.count || 0,
        aiLimit: TRIAL_CONFIG.TRIAL_AI_LIMIT,
      };
    }

    // 이전 체험 기록 확인
    const previousTrial = await this.subscriptionRepository.findOne({
      where: { userId, isTrial: true },
    });

    return {
      isTrialing: false,
      daysRemaining: null,
      trialEndsAt: null,
      canStartTrial: !previousTrial,
    };
  }

  /**
   * 체험 → 정식 구독 전환
   */
  async convertTrialToSubscription(
    userId: string,
    tier: SubscriptionTier,
    interval: BillingInterval,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const trialSubscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.TRIALING, isTrial: true },
    });

    if (!trialSubscription) {
      throw new BadRequestException('활성화된 체험 구독이 없습니다.');
    }

    if (!user.tossBillingKey) {
      throw new BadRequestException('결제 수단이 등록되지 않았습니다. 먼저 카드를 등록해 주세요.');
    }

    // 결제 진행
    const paymentResult = await this.payWithBillingKey(userId, tier, interval);

    if (paymentResult.success) {
      // 체험 구독 완료 처리
      trialSubscription.status = SubscriptionStatus.CANCELED;
      trialSubscription.trialConverted = true;
      trialSubscription.canceledAt = new Date();
      await this.subscriptionRepository.save(trialSubscription);

      this.logger.log(`체험 → 정식 구독 전환: userId=${userId}, tier=${tier}`);

      return {
        success: true,
        message: `${tier} 플랜으로 구독이 시작되었습니다.`,
      };
    }

    throw new BadRequestException('결제에 실패했습니다.');
  }

  /**
   * 만료된 체험 처리 (크론잡에서 호출)
   */
  async processExpiredTrials(): Promise<void> {
    const now = new Date();

    // 만료된 체험 구독 조회
    const expiredTrials = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.TRIALING,
        isTrial: true,
        trialEndsAt: LessThanOrEqual(now),
      },
    });

    for (const trial of expiredTrials) {
      const user = await this.userRepository.findOne({ where: { id: trial.userId } });
      if (!user) continue;

      // 카드와 대상 플랜이 있으면 결제로 잇는다.
      //
      // 체험을 왜 하는지 생각하면 이게 맞다. 써 보고 마음에 들면 결제로
      // 이어져야 하는데, 예전에는 14일 뒤 조용히 Free 로 내려가고 다시
      // 결제 화면을 찾아 들어와야 했다. 그 사이에 대부분은 돌아오지 않는다.
      const targetTier = trial.trialTargetTier;
      const canCharge =
        !!user.tossBillingKey &&
        !!targetTier &&
        targetTier !== SubscriptionTier.FREE;

      if (canCharge) {
        try {
          // 결제 전에 체험을 먼저 닫는다.
          //
          // payWithBillingKey 가 기존 구독을 정리할 때 ACTIVE·PAST_DUE 만
          // 본다. TRIALING 인 이 행을 남겨 두면 새 ACTIVE 가 하나 더 생겨
          // 살아 있는 구독이 둘이 되고, 다음날 이 크론이 또 집어서 또
          // 결제한다. 자동갱신에서 겪은 것과 같은 함정이다.
          trial.status = SubscriptionStatus.CANCELED;
          trial.canceledAt = now;
          await this.subscriptionRepository.save(trial);

          await this.payWithBillingKey(
            trial.userId,
            targetTier as SubscriptionTier,
            trial.billingInterval,
          );

          this.logger.log(
            `체험 종료 후 결제 완료: userId=${trial.userId}, tier=${targetTier}`,
          );
          continue;
        } catch (error) {
          // 결제가 실패해도 체험은 끝났다. 무료로 내리고 알린다.
          // 여기서 다시 시도하지 않는다 — 카드 문제면 몇 번을 더 긁어도
          // 같고, 그 사이 거절이 쌓이면 카드사가 이상거래로 막는다.
          this.logger.error(
            `체험 종료 후 결제 실패: userId=${trial.userId}`,
            error,
          );
        }
      }

      // 여기까지 오면 결제하지 않았다 — 카드가 없거나 결제가 실패했다.
      if (trial.status !== SubscriptionStatus.CANCELED) {
        trial.status = SubscriptionStatus.CANCELED;
        trial.canceledAt = now;
        await this.subscriptionRepository.save(trial);
      }

      const postTrialTier = TRIAL_CONFIG.POST_TRIAL_TIER || SubscriptionTier.FREE;
      await this.userRepository.update(trial.userId, {
        subscriptionTier: postTrialTier,
        subscriptionExpiresAt: null,
      });

      this.logger.log(`체험 만료 처리(무료 전환): userId=${trial.userId}`);
      await this.emailService.sendTrialExpiredEmail(user.email, user.name);
    }
  }

  /**
   * 체험 종료 3일 전 알림 처리 (크론잡에서 호출)
   */
  async sendTrialEndingNotifications(): Promise<void> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    // 3일 이내에 만료되는 체험 중 알림 미발송건
    const expiringTrials = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.TRIALING,
        isTrial: true,
        trialEndsAt: LessThanOrEqual(threeDaysFromNow),
        trialEndingNotified: false,
      },
    });

    for (const trial of expiringTrials) {
      // 사용자 정보 조회
      const user = await this.userRepository.findOne({ where: { id: trial.userId } });
      if (!user || !trial.trialEndsAt) continue;

      // 남은 일수 계산
      const now = new Date();
      const daysRemaining = Math.ceil(
        (trial.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      trial.trialEndingNotified = true;
      await this.subscriptionRepository.save(trial);

      // 체험 종료 임박 알림 이메일 발송 (3일 전)
      await this.emailService.sendTrialEndingEmail(
        user.email,
        user.name,
        daysRemaining,
        trial.trialEndsAt,
      );

      this.logger.log(`체험 종료 3일 전 알림: userId=${trial.userId}, endsAt=${trial.trialEndsAt}`);
    }
  }

  /**
   * 체험 종료 당일 알림 처리 (크론잡에서 호출)
   */
  async sendTrialEndingTodayNotifications(): Promise<void> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 오늘 만료되는 체험 (별도 플래그로 관리)
    const expiringTodayTrials = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.status = :status', { status: SubscriptionStatus.TRIALING })
      .andWhere('subscription.isTrial = :isTrial', { isTrial: true })
      .andWhere('subscription.trialEndsAt BETWEEN :todayStart AND :todayEnd', { todayStart, todayEnd })
      .andWhere('(subscription.metadata IS NULL OR JSON_EXTRACT(subscription.metadata, "$.todayNotified") IS NULL)')
      .getMany();

    for (const trial of expiringTodayTrials) {
      const user = await this.userRepository.findOne({ where: { id: trial.userId } });
      if (!user) continue;

      // 당일 알림 발송 기록
      trial.metadata = { ...trial.metadata, todayNotified: true };
      await this.subscriptionRepository.save(trial);

      // 체험 종료 당일 이메일 발송
      await this.emailService.sendTrialEndingTodayEmail(user.email, user.name);

      this.logger.log(`체험 종료 당일 알림: userId=${trial.userId}`);
    }
  }

  /**
   * 체험 종료 후 3일 팔로업 알림 처리 (크론잡에서 호출)
   */
  async sendTrialFollowUpNotifications(): Promise<void> {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const fourDaysAgo = new Date(now);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    // 3일 전에 만료된 체험 (아직 유료 전환 안 함)
    const expiredTrials = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.CANCELED,
        isTrial: true,
        trialConverted: false,
        canceledAt: MoreThan(fourDaysAgo),
      },
    });

    for (const trial of expiredTrials) {
      // 이미 팔로업 발송했는지 확인
      if (trial.metadata?.followUpSent) continue;

      const user = await this.userRepository.findOne({ where: { id: trial.userId } });
      if (!user) continue;

      // 현재 유료 구독 중인지 확인 (이미 전환했으면 스킵)
      const activeSubscription = await this.subscriptionRepository.findOne({
        where: { userId: trial.userId, status: SubscriptionStatus.ACTIVE },
      });
      if (activeSubscription) continue;

      // 체험 기간 AI 사용량 조회
      const periodStart = new Date(trial.trialStartedAt || trial.createdAt);
      const aiUsage = await this.usageRepository.findOne({
        where: { userId: trial.userId, usageType: UsageType.AI_QUERY },
        order: { createdAt: 'DESC' },
      });

      // 팔로업 발송 기록
      trial.metadata = { ...trial.metadata, followUpSent: true };
      await this.subscriptionRepository.save(trial);

      // 팔로업 이메일 발송
      await this.emailService.sendTrialFollowUpEmail(
        user.email,
        user.name,
        aiUsage?.count || 0,
      );

      this.logger.log(`체험 종료 3일 후 팔로업 알림: userId=${trial.userId}`);
    }
  }

  // 결제 내역 조회
  async getPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      payments: payments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderName: p.orderName,
        amount: p.amount,
        baseAmount: p.baseAmount,
        overageAmount: p.overageAmount,
        overageCount: p.overageCount,
        refundedAmount: p.refundedAmount,
        status: p.status,
        cardCompany: p.cardCompany,
        cardNumber: p.cardNumber,
        receiptUrl: p.receiptUrl,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 결제 저장 (빌링키 결제 후 호출)
  async savePayment(
    userId: string,
    subscriptionId: string | null,
    paymentData: {
      orderId: string;
      orderName: string;
      amount: number;
      baseAmount: number;
      overageAmount?: number;
      overageCount?: number;
      paymentKey: string;
      cardCompany?: string;
      cardNumber?: string;
      receiptUrl?: string;
    },
  ): Promise<Payment> {
    const payment = this.paymentRepository.create({
      userId,
      subscriptionId,
      orderId: paymentData.orderId,
      orderName: paymentData.orderName,
      amount: paymentData.amount,
      baseAmount: paymentData.baseAmount,
      overageAmount: paymentData.overageAmount || 0,
      overageCount: paymentData.overageCount || 0,
      paymentKey: paymentData.paymentKey,
      status: PaymentStatus.PAID,
      paidAt: new Date(),
      cardCompany: paymentData.cardCompany,
      cardNumber: paymentData.cardNumber,
      receiptUrl: paymentData.receiptUrl,
    });

    return this.paymentRepository.save(payment);
  }

  // 환불 요청
  async requestRefund(
    userId: string,
    paymentId: string,
    reason: string,
    amount?: number, // 부분 환불 금액 (없으면 전액)
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('결제 내역을 찾을 수 없습니다.');
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('이미 환불 처리된 결제입니다.');
    }

    // 환불 가능 금액 계산
    const refundableAmount = payment.amount - payment.refundedAmount;
    const refundAmount = amount ? Math.min(amount, refundableAmount) : refundableAmount;

    if (refundAmount <= 0) {
      throw new BadRequestException('환불 가능한 금액이 없습니다.');
    }

    // 결제일로부터 7일 이내 확인
    const paymentDate = payment.paidAt || payment.createdAt;
    const daysSincePayment = Math.floor(
      (Date.now() - new Date(paymentDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSincePayment > 7) {
      throw new BadRequestException(
        '결제일로부터 7일이 경과하여 환불이 불가능합니다.',
      );
    }

    // 토스 환불 API 호출
    try {
      const response = await axios.post(
        `${this.apiUrl}/payments/${payment.paymentKey}/cancel`,
        {
          cancelReason: reason,
          cancelAmount: refundAmount,
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      const { cancels } = response.data;
      const cancelInfo = cancels?.[cancels.length - 1];

      // 환불 기록 저장
      const refund = this.refundRepository.create({
        paymentId: payment.id,
        amount: refundAmount,
        reason,
        status: RefundStatus.COMPLETED,
        refundKey: cancelInfo?.transactionKey,
        processedAt: new Date(),
      });

      await this.refundRepository.save(refund);

      // 결제 내역 업데이트
      payment.refundedAmount += refundAmount;
      payment.refundReason = reason;
      payment.refundedAt = new Date();

      if (payment.refundedAmount >= payment.amount) {
        payment.status = PaymentStatus.REFUNDED;
      } else {
        payment.status = PaymentStatus.PARTIALLY_REFUNDED;
      }

      await this.paymentRepository.save(payment);

      this.logger.log(
        `환불 완료: paymentId=${paymentId}, amount=${refundAmount}`,
      );

      return {
        success: true,
        refundAmount,
        refundId: refund.id,
      };
    } catch (error) {
      this.logger.error('환불 실패:', error.response?.data || error);

      // 환불 실패 기록
      const refund = this.refundRepository.create({
        paymentId: payment.id,
        amount: refundAmount,
        reason,
        status: RefundStatus.FAILED,
        failureReason: error.response?.data?.message || '환불 처리 실패',
      });

      await this.refundRepository.save(refund);

      throw new BadRequestException(
        error.response?.data?.message || '환불 처리에 실패했습니다.',
      );
    }
  }

  /**
   * 환불 처리 (관리자/시스템 호출 — 정책 검증 없이 토스 환불 API 직행).
   *
   * - 같은 paymentId 중복 호출 차단 (idempotency): COMPLETED Refund 가 이미 있으면 그대로 반환.
   * - 부분 환불 지원 (amount 미지정 시 잔여 전액).
   * - 트랜잭션: Payment 업데이트 + Refund 레코드 생성을 원자적으로.
   *
   * @param paymentId  내부 Payment.id
   * @param reason     환불 사유 (한국어, 토스에도 전달)
   * @param amount     부분 환불 금액 (원). 미지정 시 잔여 전액.
   */
  async refundPayment(
    paymentId: string,
    reason: string,
    amount?: number,
  ): Promise<{
    success: boolean;
    refundId: string;
    refundedAmount: number;
    payment: Payment;
  }> {
    if (!paymentId) {
      throw new BadRequestException('paymentId 가 필요합니다.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Payment 조회 + 행 단위 락 (동시 환불 차단)
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException('결제 내역을 찾을 수 없습니다.');
      }

      if (!payment.paymentKey) {
        throw new BadRequestException(
          '결제가 완료되지 않아 환불할 수 없습니다.',
        );
      }

      if (payment.status === PaymentStatus.REFUNDED) {
        // Idempotency: 이미 전액 환불된 경우 — 기존 환불 정보를 그대로 반환.
        const existingRefund = await queryRunner.manager.findOne(Refund, {
          where: { paymentId: payment.id, status: RefundStatus.COMPLETED },
          order: { createdAt: 'DESC' },
        });
        await queryRunner.commitTransaction();
        return {
          success: true,
          refundId: existingRefund?.id || '',
          refundedAmount: payment.refundedAmount,
          payment,
        };
      }

      // 2. 환불 가능 금액 계산
      const refundableAmount = payment.amount - payment.refundedAmount;
      const refundAmount = amount
        ? Math.min(amount, refundableAmount)
        : refundableAmount;

      if (refundAmount < REFUND_POLICY.MIN_PARTIAL_REFUND_AMOUNT) {
        throw new BadRequestException(
          `환불 가능 금액이 ${REFUND_POLICY.MIN_PARTIAL_REFUND_AMOUNT}원 미만입니다.`,
        );
      }

      // 3. 토스 API 호출 — idempotency-key 로 같은 paymentId+reason 의 중복 호출 차단
      let cancelTransactionKey: string | undefined;
      try {
        const response = await axios.post(
          `${this.apiUrl}/payments/${payment.paymentKey}/cancel`,
          {
            cancelReason: reason,
            cancelAmount: refundAmount,
          },
          {
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
              // 같은 결제건의 중복 환불 호출을 토스 측에서도 차단
              'Idempotency-Key': `refund_${paymentId}_${refundAmount}`,
            },
          },
        );

        const cancels = response.data?.cancels;
        cancelTransactionKey = cancels?.[cancels.length - 1]?.transactionKey;
      } catch (apiError: any) {
        // 토스 측 실패 — Refund FAILED 기록 후 롤백
        const failedRefund = queryRunner.manager.create(Refund, {
          paymentId: payment.id,
          amount: refundAmount,
          reason,
          status: RefundStatus.FAILED,
          failureReason:
            apiError?.response?.data?.message || '토스 환불 API 호출 실패',
        });
        await queryRunner.manager.save(Refund, failedRefund);
        await queryRunner.commitTransaction(); // 실패 기록은 남김

        this.logger.error(
          `환불 실패: paymentId=${paymentId}, amount=${refundAmount}`,
          apiError?.response?.data || apiError?.message,
        );

        throw new BadRequestException(
          apiError?.response?.data?.message || '환불 처리에 실패했습니다.',
        );
      }

      // 4. Refund 레코드 + Payment 업데이트 (트랜잭션 내)
      const refund = queryRunner.manager.create(Refund, {
        paymentId: payment.id,
        amount: refundAmount,
        reason,
        status: RefundStatus.COMPLETED,
        refundKey: cancelTransactionKey,
        processedAt: new Date(),
      });
      const savedRefund = await queryRunner.manager.save(Refund, refund);

      payment.refundedAmount += refundAmount;
      payment.refundReason = reason;
      payment.refundedAt = new Date();
      const isFullRefund = payment.refundedAmount >= payment.amount;
      payment.status = isFullRefund
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
      await queryRunner.manager.save(Payment, payment);

      // 전액 환불이면 등급을 내린다.
      //
      // 이게 없어서 149,000원을 돌려받고도 Clinic 을 만료일까지 그대로
      // 쓰는 길이 열려 있었다. 돈을 돌려줬으면 서비스도 회수해야 한다.
      //
      // 부분 환불은 건드리지 않는다. 연간 결제의 잔여 월 환불 같은 것이라
      // 남은 기간은 계속 쓰는 것이 맞다.
      if (isFullRefund) {
        await queryRunner.manager.update(
          Subscription,
          {
            userId: payment.userId,
            status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE]),
          },
          { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
        );
        await queryRunner.manager.update(User, payment.userId, {
          subscriptionTier: SubscriptionTier.FREE,
          subscriptionExpiresAt: null,
        });
        this.logger.log(
          `전액 환불로 등급 회수: userId=${payment.userId}, paymentId=${paymentId}`,
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `환불 완료: paymentId=${paymentId}, amount=${refundAmount}, refundId=${savedRefund.id}`,
      );

      return {
        success: true,
        refundId: savedRefund.id,
        refundedAmount: refundAmount,
        payment,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 7일 환불 보증 — 결제일 7일 이내 + 사용량 50% 미만 자동 승인.
   *
   * 정책 상수는 refund-policy.ts 의 REFUND_POLICY 참고.
   * 자동 승인 미충족 시 BadRequestException 으로 사유 반환 (UI 가 고객센터 안내).
   */
  async requestRefundWithinGracePeriod(
    userId: string,
    paymentId: string,
  ): Promise<{
    success: boolean;
    refundedAmount: number;
    refundId: string;
    message: string;
  }> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('결제 내역을 찾을 수 없습니다.');
    }

    // 사용량 비율 계산: 이번 월 AI_QUERY 사용량 / 플랜 포함량
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const aiUsage = await this.usageRepository.findOne({
      where: {
        userId,
        usageType: UsageType.AI_QUERY,
        periodStart,
      },
    });
    const includedQueries = PLAN_PRICES[user.subscriptionTier]?.includedQueries || 0;
    const usageRatio =
      includedQueries > 0 ? (aiUsage?.count || 0) / includedQueries : 0;

    const eligibility = evaluateRefundEligibility(
      payment.paidAt,
      payment.amount,
      payment.refundedAmount,
      usageRatio,
    );

    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    if (!eligibility.autoApprove) {
      throw new BadRequestException({
        message: eligibility.reason,
        action: `고객센터(${REFUND_POLICY.SUPPORT_EMAIL})에 문의해 주세요.`,
        autoApprove: false,
      });
    }

    // 자동 승인 → 환불 실행
    const result = await this.refundPayment(
      paymentId,
      `7일 환불 보증 자동 승인 (사용량 ${Math.round(usageRatio * 100)}%)`,
    );

    return {
      success: true,
      refundedAmount: result.refundedAmount,
      refundId: result.refundId,
      message: `${REFUND_POLICY.GRACE_PERIOD_DAYS}일 환불 보증에 따라 ${result.refundedAmount.toLocaleString()}원이 자동 환불되었습니다. ${REFUND_POLICY_TEXT.processingTime}`,
    };
  }

  // 환불 내역 조회
  async getRefundHistory(userId: string) {
    const payments = await this.paymentRepository.find({
      where: { userId },
      relations: ['payment'],
    });

    const paymentIds = payments.map((p) => p.id);

    if (paymentIds.length === 0) {
      return { refunds: [] };
    }

    const refunds = await this.refundRepository.find({
      where: paymentIds.map((id) => ({ paymentId: id })),
      order: { createdAt: 'DESC' },
    });

    return {
      refunds: refunds.map((r) => ({
        id: r.id,
        paymentId: r.paymentId,
        amount: r.amount,
        reason: r.reason,
        status: r.status,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
    };
  }
}
