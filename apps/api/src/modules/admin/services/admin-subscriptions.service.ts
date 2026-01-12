import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { User, SubscriptionTier } from '../../../database/entities/user.entity';
import { Subscription } from '../../../database/entities/subscription.entity';
import { UsageTracking } from '../../../database/entities/usage-tracking.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { AuditLogService } from './audit-log.service';
import { AuditActions } from '../../../database/entities/admin-audit-log.entity';
import {
  ChangeSubscriptionPlanDto,
  ExtendSubscriptionDto,
  SubscriptionStatsDto,
} from '../dto';

@Injectable()
export class AdminSubscriptionsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(UsageTracking)
    private usageTrackingRepository: Repository<UsageTracking>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private auditLogService: AuditLogService,
  ) {}

  async getSubscriptionStats(): Promise<SubscriptionStatsDto> {
    const totalUsers = await this.userRepository.count();

    const activeSubscribers = await this.userRepository.count({
      where: {
        subscriptionTier: MoreThan(SubscriptionTier.FREE) as any,
      },
    });

    // 티어별 사용자 수
    const tierCounts = await this.userRepository
      .createQueryBuilder('user')
      .select('user.subscriptionTier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.subscriptionTier')
      .getRawMany();

    const byTier = {
      free: 0,
      basic: 0,
      professional: 0,
      clinic: 0,
    };

    tierCounts.forEach((item) => {
      if (byTier.hasOwnProperty(item.tier)) {
        byTier[item.tier] = parseInt(item.count, 10);
      }
    });

    // 이번 달 매출
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyRevenue = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: 'PAID' })
      .andWhere('payment.paidAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .getRawOne();

    // 올해 매출
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const yearlyRevenue = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: 'PAID' })
      .andWhere('payment.paidAt >= :start', { start: startOfYear })
      .getRawOne();

    return {
      totalUsers,
      activeSubscribers,
      byTier,
      monthlyRevenue: parseInt(monthlyRevenue?.total || '0', 10),
      yearlyRevenue: parseInt(yearlyRevenue?.total || '0', 10),
    };
  }

  async changeSubscriptionPlan(
    adminId: string,
    userId: string,
    dto: ChangeSubscriptionPlanDto,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const oldTier = user.subscriptionTier;
    const oldExpiresAt = user.subscriptionExpiresAt;

    user.subscriptionTier = dto.tier;
    if (dto.expiresAt) {
      user.subscriptionExpiresAt = new Date(dto.expiresAt);
    } else if (dto.tier !== SubscriptionTier.FREE) {
      // 만료일이 없으면 1개월 후로 설정
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      user.subscriptionExpiresAt = expiresAt;
    }

    const updatedUser = await this.userRepository.save(user);

    // 감사 로그
    const action =
      this.getTierLevel(dto.tier) > this.getTierLevel(oldTier)
        ? AuditActions.SUBSCRIPTION_UPGRADE
        : AuditActions.SUBSCRIPTION_DOWNGRADE;

    await this.auditLogService.log({
      adminId,
      action,
      targetType: 'user',
      targetId: userId,
      oldValue: { tier: oldTier, expiresAt: oldExpiresAt },
      newValue: { tier: dto.tier, expiresAt: user.subscriptionExpiresAt },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  async extendSubscription(
    adminId: string,
    userId: string,
    dto: ExtendSubscriptionDto,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const oldExpiresAt = user.subscriptionExpiresAt;

    // 현재 만료일 또는 오늘 날짜 기준으로 연장
    const baseDate = user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()
      ? new Date(user.subscriptionExpiresAt)
      : new Date();

    baseDate.setDate(baseDate.getDate() + dto.days);
    user.subscriptionExpiresAt = baseDate;

    const updatedUser = await this.userRepository.save(user);

    // 감사 로그
    await this.auditLogService.log({
      adminId,
      action: AuditActions.SUBSCRIPTION_EXTEND,
      targetType: 'user',
      targetId: userId,
      oldValue: { expiresAt: oldExpiresAt },
      newValue: { expiresAt: user.subscriptionExpiresAt, extendedDays: dto.days },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  async cancelSubscription(
    adminId: string,
    userId: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const oldTier = user.subscriptionTier;
    const oldExpiresAt = user.subscriptionExpiresAt;

    user.subscriptionTier = SubscriptionTier.FREE;
    user.subscriptionExpiresAt = null;

    const updatedUser = await this.userRepository.save(user);

    // 감사 로그
    await this.auditLogService.log({
      adminId,
      action: AuditActions.SUBSCRIPTION_CANCEL,
      targetType: 'user',
      targetId: userId,
      oldValue: { tier: oldTier, expiresAt: oldExpiresAt },
      newValue: { tier: SubscriptionTier.FREE },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });

    return updatedUser;
  }

  async resetUsage(
    adminId: string,
    userId: string,
    newCount: number = 0,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 현재 월의 사용량 조회
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const currentUsage = await this.usageTrackingRepository.findOne({
      where: {
        userId,
        usageType: 'ai_query' as any,
        periodStart: Between(periodStart, periodEnd) as any,
      },
    });

    const oldCount = currentUsage?.count || 0;

    if (currentUsage) {
      currentUsage.count = newCount;
      await this.usageTrackingRepository.save(currentUsage);
    }

    // 감사 로그
    await this.auditLogService.log({
      adminId,
      action: AuditActions.SUBSCRIPTION_USAGE_RESET,
      targetType: 'user',
      targetId: userId,
      oldValue: { count: oldCount },
      newValue: { count: newCount },
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
    });
  }

  async getUserUsage(userId: string): Promise<{ count: number; limit: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usage = await this.usageTrackingRepository.findOne({
      where: {
        userId,
        usageType: 'ai_query' as any,
        periodStart: Between(periodStart, periodEnd) as any,
      },
    });

    const limits = {
      [SubscriptionTier.FREE]: 10,
      [SubscriptionTier.BASIC]: 50,
      [SubscriptionTier.PROFESSIONAL]: 300,
      [SubscriptionTier.CLINIC]: -1, // 무제한
    };

    return {
      count: usage?.count || 0,
      limit: limits[user.subscriptionTier],
    };
  }

  private getTierLevel(tier: SubscriptionTier): number {
    const levels = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 1,
      [SubscriptionTier.PROFESSIONAL]: 2,
      [SubscriptionTier.CLINIC]: 3,
    };
    return levels[tier] || 0;
  }
}
