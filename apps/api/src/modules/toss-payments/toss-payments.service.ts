import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThan, IsNull, QueryRunner } from 'typeorm';
import axios from 'axios';
import {
  User,
  SubscriptionTier,
  PLAN_LIMITS,
} from '../../database/entities/user.entity';
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

// 플랜별 가격 정보 (초과 사용료 포함)
export const PLAN_PRICES = {
  [SubscriptionTier.FREE]: {
    monthly: 0,
    yearly: 0,
    name: 'Free',
    includedQueries: 10,
    overagePrice: 0, // 무료 플랜은 초과 불가
    canExceed: false,
  },
  [SubscriptionTier.BASIC]: {
    monthly: 19900,
    yearly: 199000,
    name: 'Basic',
    includedQueries: 50,
    overagePrice: 500, // 초과 시 건당 500원
    canExceed: true,
  },
  [SubscriptionTier.PROFESSIONAL]: {
    monthly: 99000,
    yearly: 990000,
    name: 'Professional',
    includedQueries: 300,
    overagePrice: 300, // 초과 시 건당 300원
    canExceed: true,
  },
  [SubscriptionTier.CLINIC]: {
    monthly: 199000,
    yearly: 1990000,
    name: 'Clinic',
    includedQueries: -1, // 무제한
    overagePrice: 0,
    canExceed: false,
  },
};

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

      // 빌링키를 사용자 정보에 저장 (stripeCustomerId 필드 재사용)
      await this.userRepository.update(userId, {
        stripeCustomerId: billingKey,
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

      throw new BadRequestException({
        message: errorInfo.userMessage,
        action: errorInfo.actionRequired,
        code: errorInfo.code,
        originalMessage: process.env.NODE_ENV === 'development'
          ? error.response?.data?.message
          : undefined,
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

    if (!user.stripeCustomerId) {
      throw new BadRequestException('등록된 결제 수단이 없습니다. 먼저 카드를 등록해주세요.');
    }

    const billingKey = user.stripeCustomerId;
    const customerKey = `customer_${userId}`;
    const price = PLAN_PRICES[tier];
    const amount = interval === BillingInterval.YEARLY ? price.yearly : price.monthly;
    const orderId = `order_${userId}_${Date.now()}`;
    const orderName = `온고지신 AI ${price.name} 플랜 (${interval === BillingInterval.YEARLY ? '연간' : '월간'})`;

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
      await queryRunner.manager.save(Payment, pendingPayment);

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

      throw new BadRequestException({
        message: errorInfo.userMessage,
        action: errorInfo.actionRequired,
        code: errorInfo.code,
        retryable: errorInfo.retryable,
        category: failureCategory,
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
      // 환불도 실패한 경우 관리자 알림 필요
      this.logger.error(
        `자동 환불 실패 - 수동 확인 필요: paymentKey=${paymentKey}, orderId=${orderId}`,
        refundError,
      );
      // TODO: 관리자에게 알림 발송 (이메일/슬랙 등)
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

    // 기존 활성 구독 취소
    await queryRunner.manager.update(
      Subscription,
      { userId, status: SubscriptionStatus.ACTIVE },
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

    // 사용자를 Free 플랜으로 변경
    await this.userRepository.update(userId, {
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionExpiresAt: null,
    });

    this.logger.log(`구독 즉시 취소: userId=${userId}`);
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
        if (!user || !user.stripeCustomerId) continue;

        // 다음 결제 실행
        await this.payWithBillingKey(
          sub.userId,
          user.subscriptionTier,
          sub.billingInterval,
        );

        // 결제 성공 시 재시도 횟수 초기화
        sub.paymentRetryCount = 0;
        sub.lastPaymentError = null;
        await this.subscriptionRepository.save(sub);

        this.logger.log(`자동 갱신 성공: userId=${sub.userId}`);
      } catch (error) {
        this.logger.error(`자동 갱신 실패: userId=${sub.userId}`, error);

        // 결제 실패 시 재시도 정보 저장
        sub.paymentRetryCount = (sub.paymentRetryCount || 0) + 1;
        sub.lastPaymentError = error.message || '결제 실패';
        sub.status = SubscriptionStatus.PAST_DUE;
        await this.subscriptionRepository.save(sub);
      }
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

      try {
        const user = await this.userRepository.findOne({ where: { id: sub.userId } });
        if (!user || !user.stripeCustomerId) continue;

        await this.payWithBillingKey(
          sub.userId,
          user.subscriptionTier,
          sub.billingInterval,
        );

        // 결제 성공 시 상태 복원
        sub.status = SubscriptionStatus.ACTIVE;
        sub.paymentRetryCount = 0;
        sub.lastPaymentError = null;
        await this.subscriptionRepository.save(sub);

        this.logger.log(`결제 재시도 성공: userId=${sub.userId}`);
      } catch (error) {
        sub.paymentRetryCount = (sub.paymentRetryCount || 0) + 1;
        sub.lastPaymentError = error.message || '결제 실패';
        await this.subscriptionRepository.save(sub);

        this.logger.error(`결제 재시도 실패: userId=${sub.userId}, retryCount=${sub.paymentRetryCount}`, error);
      }
    }
  }

  // 사용량 추적
  async trackUsage(userId: string, usageType: UsageType): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return false;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let usage = await this.usageRepository.findOne({
      where: { userId, usageType, periodStart },
    });

    if (!usage) {
      usage = this.usageRepository.create({
        userId,
        usageType,
        count: 0,
        periodStart,
        periodEnd,
      });
    }

    // 무료 체험 중인지 확인
    const trialSubscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.TRIALING, isTrial: true },
    });

    // 체험 중이면 TRIAL_AI_LIMIT(30건) 적용, 아니면 플랜별 제한 적용
    const limit = trialSubscription
      ? TRIAL_CONFIG.TRIAL_AI_LIMIT
      : PLAN_LIMITS[user.subscriptionTier];

    if (usageType === UsageType.AI_QUERY && usage.count >= limit) {
      return false;
    }

    usage.count += 1;
    await this.usageRepository.save(usage);
    return true;
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

    // 체험 중이면 TRIAL_AI_LIMIT(30건) 적용, 아니면 플랜별 제한 적용
    const limit = trialSubscription
      ? TRIAL_CONFIG.TRIAL_AI_LIMIT
      : PLAN_LIMITS[user.subscriptionTier];

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

    return {
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      hasBillingKey: !!user.stripeCustomerId,
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
    return {
      plans: [
        {
          tier: 'free',
          name: 'Free',
          description: '학생/수련생을 위한 무료 플랜',
          features: [
            'AI 쿼리 10회/월',
            '기본 검색 기능',
            '커뮤니티 읽기',
          ],
          monthlyPrice: 0,
          yearlyPrice: 0,
          aiQueryLimit: PLAN_PRICES[SubscriptionTier.FREE].includedQueries,
          overagePrice: 0,
          canExceed: false,
        },
        {
          tier: 'basic',
          name: 'Basic',
          description: '한약사, 체험 사용자를 위한 기본 플랜',
          features: [
            'AI 쿼리 50회/월 포함',
            `초과 시 ${PLAN_PRICES[SubscriptionTier.BASIC].overagePrice}원/건`,
            '전체 검색 기능',
            '커뮤니티 참여',
            '이메일 지원',
          ],
          monthlyPrice: PLAN_PRICES[SubscriptionTier.BASIC].monthly,
          yearlyPrice: PLAN_PRICES[SubscriptionTier.BASIC].yearly,
          aiQueryLimit: PLAN_PRICES[SubscriptionTier.BASIC].includedQueries,
          overagePrice: PLAN_PRICES[SubscriptionTier.BASIC].overagePrice,
          canExceed: true,
        },
        {
          tier: 'professional',
          name: 'Professional',
          description: '봉직 한의사를 위한 전문가 플랜',
          features: [
            'AI 쿼리 300회/월 포함',
            `초과 시 ${PLAN_PRICES[SubscriptionTier.PROFESSIONAL].overagePrice}원/건`,
            '고급 분석 기능',
            '처방 비교 무제한',
            '우선 지원',
          ],
          monthlyPrice: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].monthly,
          yearlyPrice: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].yearly,
          aiQueryLimit: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].includedQueries,
          overagePrice: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].overagePrice,
          canExceed: true,
        },
        {
          tier: 'clinic',
          name: 'Clinic',
          description: '개원 한의사를 위한 최상위 플랜',
          features: [
            'AI 쿼리 무제한',
            '모든 기능 이용',
            '다중 계정 지원',
            '전담 지원',
          ],
          monthlyPrice: PLAN_PRICES[SubscriptionTier.CLINIC].monthly,
          yearlyPrice: PLAN_PRICES[SubscriptionTier.CLINIC].yearly,
          aiQueryLimit: -1,
          overagePrice: 0,
          canExceed: false,
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
  async startFreeTrial(userId: string): Promise<{
    success: boolean;
    trialEndsAt: Date;
    message: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
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
      billingInterval: BillingInterval.MONTHLY,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      isTrial: true,
      trialStartedAt: now,
      trialEndsAt,
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

    if (!user.stripeCustomerId) {
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
      // 사용자 정보 조회
      const user = await this.userRepository.findOne({ where: { id: trial.userId } });
      if (!user) continue;

      // 체험 종료 처리
      trial.status = SubscriptionStatus.CANCELED;
      trial.canceledAt = now;
      await this.subscriptionRepository.save(trial);

      // 사용자를 Free 플랜으로 전환
      const postTrialTier = TRIAL_CONFIG.POST_TRIAL_TIER || SubscriptionTier.FREE;
      await this.userRepository.update(trial.userId, {
        subscriptionTier: postTrialTier,
        subscriptionExpiresAt: null,
      });

      this.logger.log(`체험 만료 처리: userId=${trial.userId}`);

      // 체험 만료 알림 이메일 발송
      await this.emailService.sendTrialExpiredEmail(user.email, user.name);
    }
  }

  /**
   * 체험 종료 2일 전 알림 처리 (크론잡에서 호출)
   */
  async sendTrialEndingNotifications(): Promise<void> {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 2일 이내에 만료되는 체험 중 알림 미발송건
    const expiringTrials = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.TRIALING,
        isTrial: true,
        trialEndsAt: LessThanOrEqual(twoDaysFromNow),
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

      // 체험 종료 임박 알림 이메일 발송
      await this.emailService.sendTrialEndingEmail(
        user.email,
        user.name,
        daysRemaining,
        trial.trialEndsAt,
      );

      this.logger.log(`체험 종료 임박 알림: userId=${trial.userId}, endsAt=${trial.trialEndsAt}`);
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
