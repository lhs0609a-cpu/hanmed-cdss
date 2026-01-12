import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { PatientAccount } from '../../../database/entities/patient-account.entity';
import { Clinic } from '../../../database/entities/clinic.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { UsageTracking } from '../../../database/entities/usage-tracking.entity';
import { AuditLogService } from './audit-log.service';
import {
  DashboardStatsDto,
  DashboardResponseDto,
  RecentActivityDto,
  DailySignupsDto,
} from '../dto';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
    @InjectRepository(Clinic)
    private clinicRepository: Repository<Clinic>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(UsageTracking)
    private usageTrackingRepository: Repository<UsageTracking>,
    private auditLogService: AuditLogService,
  ) {}

  async getDashboard(): Promise<DashboardResponseDto> {
    const [stats, recentActivities, dailySignups] = await Promise.all([
      this.getStats(),
      this.getRecentActivities(),
      this.getDailySignups(),
    ]);

    return {
      stats,
      recentActivities,
      dailySignups,
    };
  }

  async getStats(): Promise<DashboardStatsDto> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 사용자 통계
    const totalUsers = await this.userRepository.count();
    const newUsersToday = await this.userRepository.count({
      where: { createdAt: MoreThanOrEqual(today) },
    });
    const newUsersThisWeek = await this.userRepository.count({
      where: { createdAt: MoreThanOrEqual(weekAgo) },
    });
    const newUsersThisMonth = await this.userRepository.count({
      where: { createdAt: MoreThanOrEqual(monthAgo) },
    });

    // 구독 통계
    const subscriptionCounts = await this.userRepository
      .createQueryBuilder('user')
      .select('user.subscriptionTier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.subscriptionTier')
      .getRawMany();

    const subscriptionsByTier = {
      free: 0,
      basic: 0,
      professional: 0,
      clinic: 0,
    };

    subscriptionCounts.forEach((item) => {
      if (subscriptionsByTier.hasOwnProperty(item.tier)) {
        subscriptionsByTier[item.tier] = parseInt(item.count, 10);
      }
    });

    const activeSubscribers =
      subscriptionsByTier.basic +
      subscriptionsByTier.professional +
      subscriptionsByTier.clinic;

    // 매출 통계
    const revenueThisMonth = await this.getRevenue(startOfMonth, now);
    const revenueLastMonth = await this.getRevenue(startOfLastMonth, endOfLastMonth);
    const revenueGrowthRate =
      revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : 0;

    // AI 사용량 통계
    const totalAiQueries = await this.usageTrackingRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.count)', 'total')
      .where('usage.usageType = :type', { type: 'ai_query' })
      .getRawOne();

    const aiQueriesThisMonth = await this.usageTrackingRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.count)', 'total')
      .where('usage.usageType = :type', { type: 'ai_query' })
      .andWhere('usage.periodStart >= :start', { start: startOfMonth })
      .getRawOne();

    // 환자 통계
    const totalPatients = await this.patientRepository.count();
    const newPatientsThisMonth = await this.patientRepository.count({
      where: { createdAt: MoreThanOrEqual(startOfMonth) },
    });

    // 한의원 통계
    const totalClinics = await this.clinicRepository.count();
    const verifiedClinics = await this.clinicRepository.count({
      where: { isHanmedVerified: true },
    });
    const pendingVerification = await this.clinicRepository.count({
      where: { isHanmedVerified: false },
    });

    return {
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      activeSubscribers,
      subscriptionsByTier,
      revenueThisMonth,
      revenueLastMonth,
      revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
      totalAiQueries: parseInt(totalAiQueries?.total || '0', 10),
      aiQueriesThisMonth: parseInt(aiQueriesThisMonth?.total || '0', 10),
      totalPatients,
      newPatientsThisMonth,
      totalClinics,
      verifiedClinics,
      pendingVerification,
    };
  }

  async getRecentActivities(limit: number = 10): Promise<RecentActivityDto[]> {
    const logs = await this.auditLogService.getRecentActivities(limit);

    return logs.map((log) => ({
      id: log.id,
      adminName: log.admin?.name || 'Unknown',
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      description: this.getActionDescription(log.action, log.newValue),
      createdAt: log.createdAt,
    }));
  }

  async getDailySignups(days: number = 30): Promise<DailySignupsDto[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const signups = await this.userRepository
      .createQueryBuilder('user')
      .select("TO_CHAR(user.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', { startDate })
      .groupBy("TO_CHAR(user.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // 빈 날짜 채우기
    const result: DailySignupsDto[] = [];
    const signupMap = new Map(signups.map((s) => [s.date, parseInt(s.count, 10)]));

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: signupMap.get(dateStr) || 0,
      });
    }

    return result;
  }

  private async getRevenue(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: 'PAID' })
      .andWhere('payment.paidAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  private getActionDescription(action: string, newValue: any): string {
    const descriptions: Record<string, string> = {
      'user:suspend': `사용자 계정 정지${newValue?.reason ? `: ${newValue.reason}` : ''}`,
      'user:activate': '사용자 계정 활성화',
      'user:ban': '사용자 영구 차단',
      'user:role_change': `역할 변경: ${newValue?.role || ''}`,
      'user:password_reset': '비밀번호 초기화',
      'subscription:upgrade': `구독 업그레이드: ${newValue?.tier || ''}`,
      'subscription:downgrade': `구독 다운그레이드: ${newValue?.tier || ''}`,
      'subscription:extend': `구독 ${newValue?.extendedDays || 0}일 연장`,
      'subscription:cancel': '구독 취소',
      'subscription:usage_reset': '사용량 초기화',
      'payment:refund': '환불 처리',
      'clinic:verify': '한의원 인증 승인',
      'clinic:reject': '한의원 인증 반려',
    };

    return descriptions[action] || action;
  }
}
