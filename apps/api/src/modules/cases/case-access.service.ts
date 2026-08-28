import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  CaseAccessLog,
  CaseAccessAction,
} from '../../database/entities/case-access-log.entity';
import { User, SubscriptionTier } from '../../database/entities/user.entity';
import { dailyViewLimit } from '../../database/entities/plan-features';

/**
 * 치험례 본문 열람 통제 — 대량 유출을 비경제적으로 만든다.
 *
 * 전제: 화면에 뜬 것을 타이핑하거나 카메라로 찍는 것은 못 막는다. 웹에서는
 * 스크린샷도 못 막는다. 막을 수 있는 건 "자동화된 대량 수집"이고, 사업을
 * 위협하는 것도 그쪽이다. 한 건을 손으로 베끼는 사람은 위협이 아니다.
 *
 * 그래서 사람이 읽는 속도를 넘는 열람을 차단한다. 시간당 20건이면 6,000건을
 * 다 가져가는 데 300시간이 걸린다 — 그 사이에 이상탐지가 먼저 잡는다.
 */

/** 사람이 치험례 한 건을 읽는 데 걸리는 시간을 감안한 상한 */
export const CASE_ACCESS_LIMITS = {
  /** 분당 열람 건수 — 연속 클릭 스크래핑 차단 */
  PER_MINUTE: 3,
  /** 시간당 열람 건수 */
  PER_HOUR: 20,
  /** 이상 판정: 10분 안에 이만큼 열면 사람이 아니다 */
  ANOMALY_BURST_COUNT: 25,
  ANOMALY_BURST_MINUTES: 10,
  /** 이상 판정 시 열람 잠금 시간 */
  AUTO_LOCK_HOURS: 24,
  /** 1시간 안에 이 수 이상의 서로 다른 IP 면 계정 공유·탈취 의심 */
  DISTINCT_IP_THRESHOLD: 4,
} as const;

export interface AccessContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

@Injectable()
export class CaseAccessService {
  private readonly logger = new Logger(CaseAccessService.name);

  constructor(
    @InjectRepository(CaseAccessLog)
    private readonly logRepository: Repository<CaseAccessLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private since(minutes: number): Date {
    return new Date(Date.now() - minutes * 60_000);
  }

  private countViews(userId: string, minutes: number): Promise<number> {
    return this.logRepository.count({
      where: {
        userId,
        action: CaseAccessAction.VIEW_FULL,
        createdAt: MoreThan(this.since(minutes)),
      },
    });
  }

  /**
   * 열람을 허가하고 로그를 남긴다.
   *
   * 반환하는 로그 id 가 워터마크 traceId 다 — 응답 본문을 만들기 전에 반드시
   * 이 메서드를 통과해야 유출본 역추적이 성립한다.
   *
   * @throws ForbiddenException 속도제한·잠금에 걸린 경우
   */
  async authorizeAndLog(
    userId: string,
    caseId: string,
    ctx: AccessContext,
  ): Promise<{ traceId: string; user: User }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('사용자를 확인할 수 없습니다.');
    }

    // 1. 관리자 또는 이상탐지가 걸어둔 잠금
    const lockedUntil = (user as any).casesAccessLockedUntil as Date | null;
    if (lockedUntil && lockedUntil > new Date()) {
      await this.record(userId, caseId, CaseAccessAction.DENIED_LOCKED, ctx, user, {
        lockedUntil,
      });
      throw new ForbiddenException(
        '비정상적인 열람 패턴이 감지되어 치험례 열람이 일시 제한되었습니다. 본인의 이용이 맞다면 고객센터로 문의해 주세요.',
      );
    }

    // 2. 속도제한 — 좁은 창부터 검사해야 흔한 경우를 싸게 거른다
    const windows: Array<{ minutes: number; limit: number; label: string }> = [
      { minutes: 1, limit: CASE_ACCESS_LIMITS.PER_MINUTE, label: '1분' },
      { minutes: 60, limit: CASE_ACCESS_LIMITS.PER_HOUR, label: '1시간' },
      { minutes: 60 * 24, limit: dailyViewLimit(user.subscriptionTier), label: '24시간' },
    ];
    for (const w of windows) {
      const used = await this.countViews(userId, w.minutes);
      if (used >= w.limit) {
        await this.record(userId, caseId, CaseAccessAction.DENIED_RATE_LIMIT, ctx, user, {
          window: w.label,
          used,
          limit: w.limit,
        });
        // 하루 한도에 걸린 무료 회원에게는 "기다리세요" 만 말하면 길이 막힌 것처럼 보인다.
        // 실제로 열려 있는 길(요금제)을 같이 알려 준다.
        const upgradable =
          w.minutes === 60 * 24 && user.subscriptionTier === SubscriptionTier.FREE;
        throw new ForbiddenException(
          `${w.label} 동안 열람 가능한 치험례 수(${w.limit}건)를 넘었습니다.` +
            (upgradable
              ? ' 더 보시려면 요금제를 업그레이드해 주세요.'
              : ' 잠시 후 다시 시도해 주세요.'),
        );
      }
    }

    // 3. 이상 패턴 — 사람이 낼 수 없는 속도면 계정을 잠근다
    const burst = await this.countViews(userId, CASE_ACCESS_LIMITS.ANOMALY_BURST_MINUTES);
    if (burst >= CASE_ACCESS_LIMITS.ANOMALY_BURST_COUNT) {
      await this.lockUser(userId, 'burst', { burst });
      await this.record(userId, caseId, CaseAccessAction.DENIED_LOCKED, ctx, user, { burst });
      throw new ForbiddenException(
        '비정상적인 열람 패턴이 감지되어 치험례 열람이 일시 제한되었습니다.',
      );
    }

    // 4. 통과 — 로그를 남기고 그 id 를 워터마크로 쓴다
    const log = await this.record(userId, caseId, CaseAccessAction.VIEW_FULL, ctx, user);

    // 5. 계정 공유·탈취 의심은 막지 않고 경고만 남긴다 (오탐으로 진료를 끊으면 안 된다)
    void this.flagDistinctIps(userId).catch((e) =>
      this.logger.warn(`IP 다중 사용 점검 실패: userId=${userId}`, e),
    );

    return { traceId: log.id, user };
  }

  /** 로그 한 줄 기록 — 실패해도 열람 자체를 막지는 않는다(단, VIEW_FULL 은 예외) */
  async record(
    userId: string,
    caseId: string | null,
    action: CaseAccessAction,
    ctx: AccessContext,
    user?: User | null,
    detail?: Record<string, unknown>,
  ): Promise<CaseAccessLog> {
    const log = this.logRepository.create({
      userId,
      caseId,
      action,
      ipAddress: ctx.ipAddress?.slice(0, 45) || null,
      userAgent: ctx.userAgent?.slice(0, 500) || null,
      sessionId: ctx.sessionId?.slice(0, 128) || null,
      tierAtAccess: user?.subscriptionTier || null,
      detail: detail || null,
    });
    return this.logRepository.save(log);
  }

  /** 이상 탐지 시 열람 잠금 */
  async lockUser(userId: string, reason: string, detail?: Record<string, unknown>) {
    const until = new Date(Date.now() + CASE_ACCESS_LIMITS.AUTO_LOCK_HOURS * 3600_000);
    await this.userRepository.update({ id: userId }, {
      casesAccessLockedUntil: until,
    } as any);
    this.logger.warn(
      `치험례 열람 잠금: userId=${userId}, reason=${reason}, until=${until.toISOString()}, detail=${JSON.stringify(detail || {})}`,
    );
  }

  /** 1시간 내 서로 다른 IP 가 많으면 경고 로그 — 계정 공유·탈취 신호 */
  private async flagDistinctIps(userId: string) {
    const rows = await this.logRepository
      .createQueryBuilder('l')
      .select('COUNT(DISTINCT l."ipAddress")', 'cnt')
      .where('l."userId" = :userId', { userId })
      .andWhere('l."action" = :action', { action: CaseAccessAction.VIEW_FULL })
      .andWhere('l."createdAt" > :since', { since: this.since(60) })
      .getRawOne<{ cnt: string }>();

    const distinct = parseInt(rows?.cnt || '0', 10);
    if (distinct >= CASE_ACCESS_LIMITS.DISTINCT_IP_THRESHOLD) {
      this.logger.warn(
        `치험례 열람 IP 다중 사용 의심: userId=${userId}, distinctIps=${distinct}/1h`,
      );
    }
  }

  /** 이번 시간·오늘 남은 열람 수 — 프론트가 미리 안내하는 데 쓴다 */
  async getRemaining(userId: string) {
    const [hour, day, user] = await Promise.all([
      this.countViews(userId, 60),
      this.countViews(userId, 60 * 24),
      this.userRepository.findOne({
        where: { id: userId },
        select: { id: true, subscriptionTier: true },
      }),
    ]);
    return {
      hourly: { used: hour, limit: CASE_ACCESS_LIMITS.PER_HOUR },
      // 한도가 티어마다 다르므로 화면에 쓸 값도 티어에서 뽑아야 한다.
      daily: { used: day, limit: dailyViewLimit(user?.subscriptionTier) },
    };
  }

  /**
   * 유출본 텍스트의 워터마크로 열람자를 역추적한다 (관리자용).
   *
   * hex 8자(32비트)라 이론상 충돌이 있다. 그래서 단건이 아니라 후보 목록을 준다 —
   * 최종 판단은 사람이 열람 시각·IP·치험례 id 를 맞춰 보고 한다.
   *
   * @param traceHex extractZeroWidthWatermark 가 뽑아낸 hex 8자
   */
  async traceLeak(traceHex: string) {
    // traceId(uuid) 의 하이픈 제거 후 앞 8자가 워터마크 페이로드다.
    return this.logRepository
      .createQueryBuilder('l')
      .select([
        'l."id" AS "traceId"',
        'l."caseId" AS "caseId"',
        'l."createdAt" AS "viewedAt"',
        'l."ipAddress" AS "ipAddress"',
        'l."userAgent" AS "userAgent"',
        'l."tierAtAccess" AS "tierAtAccess"',
        'l."userId" AS "userId"',
        'u."name" AS "userName"',
        'u."email" AS "userEmail"',
        'u."licenseNumber" AS "licenseNumber"',
      ])
      .leftJoin(User, 'u', 'u."id" = l."userId"')
      .where(`LEFT(REPLACE(l."id"::text, '-', ''), 8) = :hex`, { hex: traceHex.toLowerCase() })
      .andWhere('l."action" = :action', { action: CaseAccessAction.VIEW_FULL })
      .orderBy('l."createdAt"', 'DESC')
      .limit(50)
      .getRawMany();
  }

  /**
   * 최근 열람 로그 — 이상 열람 신고가 들어왔을 때 관리자가 눈으로 확인하는 창구.
   */
  async recentLogs(filter: {
    userId?: string;
    caseId?: string;
    action?: CaseAccessAction;
    limit?: number;
  }) {
    const qb = this.logRepository
      .createQueryBuilder('l')
      .orderBy('l."createdAt"', 'DESC')
      .limit(Math.min(Math.max(filter.limit ?? 100, 1), 500));
    if (filter.userId) qb.andWhere('l."userId" = :userId', { userId: filter.userId });
    if (filter.caseId) qb.andWhere('l."caseId" = :caseId', { caseId: filter.caseId });
    if (filter.action) qb.andWhere('l."action" = :action', { action: filter.action });
    return qb.getMany();
  }

  /**
   * 열람 잠금 해제 — 이상탐지는 오탐을 낸다.
   *
   * 잠금 메시지가 "고객센터로 문의해 주세요" 라고 안내하는 이상, 문의를 받은
   * 쪽에 풀어 줄 수단이 있어야 한다. 없으면 24시간을 기다리라는 말밖에 못 한다.
   */
  async unlockUser(userId: string) {
    await this.userRepository.update({ id: userId }, {
      casesAccessLockedUntil: null,
    } as any);
    this.logger.log(`치험례 열람 잠금 해제: userId=${userId}`);
    return { userId, unlocked: true };
  }
}
