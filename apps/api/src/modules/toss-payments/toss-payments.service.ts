import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
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
} from '../../database/entities/subscription.entity';
import {
  UsageTracking,
  UsageType,
} from '../../database/entities/usage-tracking.entity';

// 플랜별 가격 정보
export const PLAN_PRICES = {
  [SubscriptionTier.BASIC]: {
    monthly: 19900,
    yearly: 199000,
    name: 'Basic',
  },
  [SubscriptionTier.PROFESSIONAL]: {
    monthly: 99000,
    yearly: 990000,
    name: 'Professional',
  },
  [SubscriptionTier.CLINIC]: {
    monthly: 199000,
    yearly: 1990000,
    name: 'Clinic',
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(UsageTracking)
    private usageRepository: Repository<UsageTracking>,
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
      this.logger.error('빌링키 발급 실패:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.message || '빌링키 발급에 실패했습니다.',
      );
    }
  }

  // 빌링키로 결제 요청
  async payWithBillingKey(
    userId: string,
    tier: SubscriptionTier,
    interval: BillingInterval,
  ): Promise<{ success: boolean; paymentKey: string }> {
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

    try {
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

      if (status === 'DONE') {
        // 구독 정보 생성/업데이트
        await this.createOrUpdateSubscription(userId, tier, interval, paymentKey, orderId);
        return { success: true, paymentKey };
      }

      throw new BadRequestException('결제가 완료되지 않았습니다.');
    } catch (error) {
      this.logger.error('결제 실패:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.message || '결제에 실패했습니다.',
      );
    }
  }

  // 구독 생성/업데이트
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
        cancelAt: null,
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

    const limit = PLAN_LIMITS[user.subscriptionTier];
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
    const limit = PLAN_LIMITS[user.subscriptionTier];

    return {
      aiQuery: {
        used: aiQueryUsage?.count || 0,
        limit: limit === Infinity ? -1 : limit,
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
          features: ['AI 쿼리 10회/월', '기본 검색 기능', '커뮤니티 읽기'],
          monthlyPrice: 0,
          yearlyPrice: 0,
          aiQueryLimit: 10,
        },
        {
          tier: 'basic',
          name: 'Basic',
          description: '한약사, 체험 사용자를 위한 기본 플랜',
          features: [
            'AI 쿼리 50회/월',
            '전체 검색 기능',
            '커뮤니티 참여',
            '이메일 지원',
          ],
          monthlyPrice: PLAN_PRICES[SubscriptionTier.BASIC].monthly,
          yearlyPrice: PLAN_PRICES[SubscriptionTier.BASIC].yearly,
          aiQueryLimit: 50,
        },
        {
          tier: 'professional',
          name: 'Professional',
          description: '봉직 한의사를 위한 전문가 플랜',
          features: [
            'AI 쿼리 300회/월',
            '고급 분석 기능',
            '처방 비교 무제한',
            '우선 지원',
          ],
          monthlyPrice: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].monthly,
          yearlyPrice: PLAN_PRICES[SubscriptionTier.PROFESSIONAL].yearly,
          aiQueryLimit: 300,
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
        },
      ],
    };
  }

  // 클라이언트 키 반환 (프론트엔드용)
  getClientKey(): string {
    return this.clientKey;
  }
}
