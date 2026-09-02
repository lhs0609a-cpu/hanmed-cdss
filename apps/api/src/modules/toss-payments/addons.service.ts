import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import {
  SubscriptionAddon,
  AddonKey,
  AddonStatus,
} from '../../database/entities/subscription-addon.entity';
import { BillingInterval } from '../../database/entities/subscription.entity';
import { User, SubscriptionTier } from '../../database/entities/user.entity';
import { tierHasFeature, FeatureKey } from '../../database/entities/plan-features';
import { BILLING_ADDON, TossPaymentsService } from './toss-payments.service';

const ADDON_PRICES: Record<AddonKey, { monthly: number; yearly: number }> = {
  [AddonKey.INSURANCE_CLAIM]: {
    monthly: BILLING_ADDON.INSURANCE_CLAIM_MONTHLY,
    yearly: BILLING_ADDON.INSURANCE_CLAIM_YEARLY,
  },
};

/** 결제 내역에 찍히는 이름. 카드 명세서에서 무엇인지 알아볼 수 있어야 한다. */
const ADDON_LABELS: Record<AddonKey, string> = {
  [AddonKey.INSURANCE_CLAIM]: '보험청구 부가서비스',
};

@Injectable()
export class AddonsService {
  private readonly logger = new Logger(AddonsService.name);

  constructor(
    @InjectRepository(SubscriptionAddon)
    private addonRepo: Repository<SubscriptionAddon>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    // 순환 참조를 피하려고 forwardRef 를 쓴다 — TossPaymentsService 가
    // 애드온 목록을 읽고, 애드온이 결제를 부른다.
    @Inject(forwardRef(() => TossPaymentsService))
    private tossPayments: TossPaymentsService,
  ) {}

  async listForUser(userId: string): Promise<SubscriptionAddon[]> {
    return this.addonRepo.find({
      where: { userId, status: Not(AddonStatus.CANCELED) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * add-on이 현재 사용자에게 이미 포함되어 있는지 검사.
   *
   * 예: 보험청구 add-on은 Clinic 티어에 기본 포함되어 있으므로 별도 결제 불필요.
   */
  isIncludedInTier(addonKey: AddonKey, tier: SubscriptionTier): boolean {
    if (addonKey === AddonKey.INSURANCE_CLAIM) {
      return tierHasFeature(tier, FeatureKey.INSURANCE_CLAIM);
    }
    return false;
  }

  async subscribe(
    userId: string,
    addonKey: AddonKey,
    interval: BillingInterval,
  ): Promise<SubscriptionAddon> {
    // 결제 게이트 — 실제 Toss 과금 연동(chargeWithBillingKey)과 add-on 자동 갱신 크론이
    // 붙기 전까지는 부가서비스 가입을 막는다. 열어두면 빌링키만 있는 사용자가
    // 유료 add-on(예: 청구 99,000원/월)을 과금 없이 활성화받는 결함이 된다.
    // 결제 연동 완료 후 ADDONS_BILLING_ENABLED=true 로 활성화.
    if (process.env.ADDONS_BILLING_ENABLED !== 'true') {
      throw new ServiceUnavailableException(
        '부가서비스 결제는 현재 준비 중입니다. 곧 오픈 예정입니다.',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (this.isIncludedInTier(addonKey, user.subscriptionTier)) {
      throw new BadRequestException(
        '이미 현재 구독에 포함된 부가서비스입니다. 별도 결제가 필요하지 않습니다.',
      );
    }

    if (!user.tossBillingKey) {
      throw new BadRequestException(
        '카드 등록(빌링키 발급)이 먼저 필요합니다.',
      );
    }

    const existing = await this.addonRepo.findOne({
      where: { userId, addonKey, status: Not(AddonStatus.CANCELED) },
    });
    if (existing) {
      throw new BadRequestException('이미 가입된 부가서비스입니다.');
    }

    const price = ADDON_PRICES[addonKey];
    const unitPrice = interval === BillingInterval.YEARLY ? price.yearly : price.monthly;

    const now = new Date();
    const periodEnd = new Date(now);
    if (interval === BillingInterval.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 먼저 결제하고 그 다음에 활성화한다.
    //
    // 예전에는 결제 호출이 아예 없었다. 레코드만 만들고 ACTIVE 로 띄웠고
    // 화면에는 구독 버튼이 그대로 있었다. 누르면 카드는 안 긁히는데
    // "구독되었습니다" 가 뜨고 유료 기능이 열렸다.
    //
    // 순서가 중요하다. 결제가 실패하면 여기서 예외가 올라가 애드온 레코드는
    // 만들어지지 않는다. 반대로 했다면 결제 실패인데 부가서비스는 살아 있는
    // 상태가 남는다.
    await this.tossPayments.chargeAddon(
      userId,
      addonKey,
      ADDON_LABELS[addonKey],
      unitPrice,
      interval,
    );

    const addon = this.addonRepo.create({
      userId,
      addonKey,
      status: AddonStatus.ACTIVE,
      billingInterval: interval,
      unitPrice,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });

    const saved = await this.addonRepo.save(addon);
    this.logger.log(
      `Add-on subscribed: user=${userId}, key=${addonKey}, interval=${interval}, price=${unitPrice}`,
    );
    return saved;
  }

  async cancel(userId: string, addonKey: AddonKey, immediate = false): Promise<SubscriptionAddon> {
    const addon = await this.addonRepo.findOne({
      where: { userId, addonKey, status: Not(AddonStatus.CANCELED) },
    });
    if (!addon) {
      throw new NotFoundException('해당 부가서비스 구독을 찾을 수 없습니다.');
    }

    const now = new Date();
    if (immediate) {
      addon.status = AddonStatus.CANCELED;
      addon.canceledAt = now;
      addon.cancelAt = now;
    } else {
      // 기간 종료 시 취소 — 현재 기간까지는 활성 유지
      addon.cancelAt = addon.currentPeriodEnd;
      addon.canceledAt = now;
    }

    return this.addonRepo.save(addon);
  }
}
