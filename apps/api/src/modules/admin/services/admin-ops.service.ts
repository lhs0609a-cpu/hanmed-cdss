import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ErrorLog } from '../../../database/entities/error-log.entity';
import { PLAN_PRICES } from '../../toss-payments/toss-payments.service';
import { SubscriptionTier } from '../../../database/entities/user.entity';

/**
 * 운영 지표.
 *
 * 관리자 화면에 숫자를 띄우는 것이 목적이 아니다. "지금 이 서비스가 살아
 * 있나, 돈은 들어오나, 무엇이 깨졌나" 세 질문에 답하는 것이 목적이다.
 * SaaS 운영 대시보드가 공통으로 다루는 항목(MRR·이탈·코호트 리텐션·오류)
 * 을 우리 데이터로 낼 수 있는 만큼만 낸다.
 *
 * 없는 것을 만들어 내지 않는다. CAC·LTV 는 광고비를 우리가 모르므로 넣지
 * 않았다. 넣으려면 먼저 광고비를 기록할 곳이 있어야 한다. 지표가 하나라도
 * 거짓이면 나머지 숫자도 못 믿게 된다.
 *
 * 활동을 무엇으로 볼 것인가 — analytics_events 만 보면 안 된다. 이벤트
 * 수집을 이제 붙였기 때문에 그 전 기록이 없다. 그래서 사람이 남긴 흔적을
 * 모두 합친다: 이벤트, 게시글, 댓글, AI 사용량, 진료기록. 이 합집합이
 * "그날 서비스를 쓴 사람" 이다.
 */
@Injectable()
export class AdminOpsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ErrorLog)
    private readonly errorRepo: Repository<ErrorLog>,
  ) {}

  /**
   * 활동 흔적을 한 줄기로 모으는 SQL.
   *
   * 테이블마다 사용자 열 이름이 달라서(userId / authorId) 여기서 맞춘다.
   * 없는 테이블이 있어도 전체가 죽지 않도록 존재하는 것만 골라 붙인다.
   */
  private async activityUnion(): Promise<string> {
    const candidates: Array<{ table: string; user: string; at: string }> = [
      { table: 'analytics_events', user: 'userId', at: 'occurredAt' },
      { table: 'posts', user: 'authorId', at: 'createdAt' },
      { table: 'comments', user: 'authorId', at: 'createdAt' },
      { table: 'usage_tracking', user: 'userId', at: 'createdAt' },
      { table: 'patient_records', user: 'practitionerId', at: 'createdAt' },
    ];

    const existing: string[] = [];
    for (const c of candidates) {
      // 두 열을 모두 확인한다. 예전에는 사용자 열만 보고 붙였다가
      // usage_tracking 에 updatedAt 이 없어서 질의가 통째로 깨졌다.
      const rows = await this.dataSource.query(
        `select count(*)::int as n from information_schema.columns
         where table_name = $1 and column_name in ($2, $3)`,
        [c.table, c.user, c.at],
      );
      if (rows[0]?.n === 2) {
        existing.push(
          `select "${c.user}" as uid, "${c.at}" as at from "${c.table}" where "${c.user}" is not null`,
        );
      }
    }
    // 하나도 없을 수는 없지만, 그때는 빈 집합을 돌려준다.
    return existing.length > 0
      ? existing.join(' union all ')
      : `select null::uuid as uid, now() as at where false`;
  }

  /** 첫 화면 — 여덟에서 열두 개. 그 이상은 아무도 훑지 않는다. */
  async getOverview() {
    const union = await this.activityUnion();

    const [users] = await this.dataSource.query(`
      select
        count(*)::int as total,
        count(*) filter (where "createdAt" >= current_date)::int as today,
        count(*) filter (where "createdAt" >= current_date - interval '7 days')::int as week,
        count(*) filter (where "createdAt" >= current_date - interval '30 days')::int as month,
        count(*) filter (where status = 'active')::int as active,
        count(*) filter (where "deletionRequestedAt" is not null)::int as leaving,
        count(*) filter (where "licenseVerificationStatus" = 'pending')::int as license_pending
      from users
      where role = 'user'
    `);

    const [activity] = await this.dataSource.query(`
      with a as (${union})
      select
        count(distinct uid) filter (where at >= current_date)::int as dau,
        count(distinct uid) filter (where at >= current_date - interval '7 days')::int as wau,
        count(distinct uid) filter (where at >= current_date - interval '30 days')::int as mau
      from a
    `);

    const tiers = await this.dataSource.query(`
      select "subscriptionTier" as tier, count(*)::int as n
      from users where role = 'user' and status = 'active'
      group by 1
    `);
    const byTier: Record<string, number> = {
      free: 0,
      basic: 0,
      professional: 0,
      clinic: 0,
    };
    for (const t of tiers) byTier[t.tier] = t.n;

    // MRR — 유료 티어 인원 × 월 정가. 연간 결제는 12로 나눠 월로 환산한다.
    //
    // 구독 행에 금액이 없어서(가격은 코드에 있다) 티어별 인원으로 계산한다.
    // 할인·환불이 반영되지 않으므로 '정가 기준' 이라고 화면에 밝힌다.
    const mrr =
      byTier.basic * PLAN_PRICES[SubscriptionTier.BASIC].monthly +
      byTier.professional * PLAN_PRICES[SubscriptionTier.PROFESSIONAL].monthly +
      byTier.clinic * PLAN_PRICES[SubscriptionTier.CLINIC].monthly;

    const [revenue] = await this.dataSource.query(`
      select
        coalesce(sum(amount) filter (where status = 'paid'), 0)::bigint as total,
        coalesce(sum(amount) filter (where status = 'paid' and "paidAt" >= date_trunc('month', current_date)), 0)::bigint as this_month,
        coalesce(sum(amount) filter (where status = 'paid' and "paidAt" >= date_trunc('month', current_date) - interval '1 month' and "paidAt" < date_trunc('month', current_date)), 0)::bigint as last_month,
        coalesce(sum("refundedAmount"), 0)::bigint as refunded,
        count(*) filter (where status = 'paid')::int as paid_count,
        count(*) filter (where status = 'failed')::int as failed_count,
        count(*) filter (where status = 'failed' and "createdAt" >= current_date - interval '7 days')::int as failed_week
      from payments
    `);

    const [subs] = await this.dataSource.query(`
      select
        count(*) filter (where status = 'active')::int as active,
        count(*) filter (where status = 'trialing')::int as trialing,
        count(*) filter (where status = 'past_due')::int as past_due,
        count(*) filter (where status = 'canceled')::int as canceled,
        count(*) filter (where "cancelAt" is not null and status = 'active')::int as cancel_scheduled
      from subscriptions
    `);

    const [errors] = await this.dataSource.query(`
      select
        count(*) filter (where "resolvedAt" is null)::int as open,
        coalesce(sum("count") filter (where "lastSeenAt" >= current_date - interval '1 day'), 0)::int as day_count,
        count(*) filter (where "resolvedAt" is null and "statusCode" >= 500)::int as open_5xx
      from error_logs
    `);

    // 체험 → 유료 전환. 체험을 한 번이라도 시작한 사람 중 결제까지 간 비율.
    const [trial] = await this.dataSource.query(`
      with t as (
        select distinct "userId" from subscriptions
        where status = 'trialing' or "trialEndsAt" is not null
      ),
      p as (select distinct "userId" from payments where status = 'paid')
      select
        (select count(*) from t)::int as started,
        (select count(*) from t join p using ("userId"))::int as converted
    `).catch(() => [{ started: 0, converted: 0 }]);

    return {
      users: {
        total: users.total,
        newToday: users.today,
        newThisWeek: users.week,
        newThisMonth: users.month,
        active: users.active,
        leaving: users.leaving,
        licensePending: users.license_pending,
      },
      activity: {
        dau: activity.dau,
        wau: activity.wau,
        mau: activity.mau,
        // 끈끈함. 매일 오는 사람의 비율 — 20% 를 넘으면 습관이 붙은 것으로 본다.
        stickiness: activity.mau > 0 ? Math.round((activity.dau / activity.mau) * 1000) / 10 : 0,
      },
      subscriptions: {
        byTier,
        paidUsers: byTier.basic + byTier.professional + byTier.clinic,
        active: subs.active,
        trialing: subs.trialing,
        pastDue: subs.past_due,
        canceled: subs.canceled,
        cancelScheduled: subs.cancel_scheduled,
      },
      revenue: {
        mrr,
        arr: mrr * 12,
        total: Number(revenue.total),
        thisMonth: Number(revenue.this_month),
        lastMonth: Number(revenue.last_month),
        refunded: Number(revenue.refunded),
        paidCount: revenue.paid_count,
        failedCount: revenue.failed_count,
        failedThisWeek: revenue.failed_week,
        arpu:
          byTier.basic + byTier.professional + byTier.clinic > 0
            ? Math.round(mrr / (byTier.basic + byTier.professional + byTier.clinic))
            : 0,
      },
      trial: {
        started: trial.started,
        converted: trial.converted,
        conversionRate:
          trial.started > 0
            ? Math.round((trial.converted / trial.started) * 1000) / 10
            : 0,
      },
      errors: {
        open: errors.open,
        open5xx: errors.open_5xx,
        last24h: errors.day_count,
      },
    };
  }

  /**
   * 주간 코호트 리텐션.
   *
   * 가입한 주를 코호트로 잡고, 그 사람들이 이후 몇 주에 다시 왔는지를 센다.
   * 이 표가 다른 어떤 지표보다 먼저다 — 신규가 늘어도 2주차에 아무도 남지
   * 않으면 그 성장은 새는 양동이에 물을 붓는 것이다.
   */
  async getRetention(weeks = 8) {
    const union = await this.activityUnion();
    const rows = await this.dataSource.query(
      `
      with cohorts as (
        select id, date_trunc('week', "createdAt") as cohort_week
        from users
        where role = 'user'
          and "createdAt" >= date_trunc('week', current_date) - ($1::int || ' weeks')::interval
      ),
      acts as (${union}),
      weekly as (
        select distinct c.id, c.cohort_week,
               floor(extract(epoch from (date_trunc('week', a.at) - c.cohort_week)) / 604800)::int as week_offset
        from cohorts c
        join acts a on a.uid = c.id and a.at >= c.cohort_week
      )
      select
        c.cohort_week,
        count(distinct c.id)::int as cohort_size,
        w.week_offset,
        count(distinct w.id)::int as retained
      from cohorts c
      left join weekly w on w.cohort_week = c.cohort_week
      group by c.cohort_week, w.week_offset
      order by c.cohort_week desc, w.week_offset
      `,
      [weeks],
    );

    // 코호트별로 접어서 돌려준다. 화면에서 표로 그린다.
    const byCohort = new Map<
      string,
      { week: string; size: number; retention: Array<{ offset: number; users: number; rate: number }> }
    >();
    for (const r of rows) {
      const key = new Date(r.cohort_week).toISOString().slice(0, 10);
      if (!byCohort.has(key)) {
        byCohort.set(key, { week: key, size: r.cohort_size, retention: [] });
      }
      if (r.week_offset === null) continue;
      const entry = byCohort.get(key)!;
      entry.retention.push({
        offset: r.week_offset,
        users: r.retained,
        rate: entry.size > 0 ? Math.round((r.retained / entry.size) * 1000) / 10 : 0,
      });
    }
    return { weeks, cohorts: [...byCohort.values()] };
  }

  /** 가입에서 결제까지 어디서 새는가. */
  async getFunnel() {
    const [row] = await this.dataSource.query(`
      select
        (select count(*) from users where role = 'user')::int as signed_up,
        (select count(*) from users where role = 'user' and "licenseVerificationStatus" in ('pending','verified'))::int as license_submitted,
        (select count(distinct "userId") from subscriptions)::int as subscribed_any,
        (select count(distinct "userId") from payments where status = 'paid')::int as paid,
        (select count(*) from users where role = 'user' and "subscriptionTier" != 'free' and status = 'active')::int as paying_now
    `);
    return row;
  }

  /** 월별 매출. 그래프 하나로 흐름이 보여야 한다. */
  async getRevenueTrend(months = 12) {
    return this.dataSource.query(
      `
      select
        to_char(date_trunc('month', "paidAt"), 'YYYY-MM') as "month",
        coalesce(sum(amount), 0)::bigint as amount,
        count(*)::int as payments,
        count(distinct "userId")::int as payers
      from payments
      where status = 'paid'
        and "paidAt" >= date_trunc('month', current_date) - ($1::int || ' months')::interval
      group by 1
      order by 1
      `,
      [months],
    );
  }

  /** 신규 가입 추이. 일 단위. */
  async getSignupTrend(days = 30) {
    return this.dataSource.query(
      `
      select to_char("createdAt"::date, 'YYYY-MM-DD') as "day", count(*)::int as signups
      from users
      where role = 'user'
        and "createdAt" >= current_date - ($1::int || ' days')::interval
      group by 1
      order by 1
      `,
      [days],
    );
  }

  /** 오류 목록. 최근에 많이 난 것부터. */
  async getErrors(params: { status?: 'open' | 'resolved' | 'all'; limit?: number }) {
    const qb = this.errorRepo
      .createQueryBuilder('e')
      .orderBy('e."lastSeenAt"', 'DESC')
      .take(Math.min(params.limit ?? 50, 200));
    if (params.status === 'open') qb.where('e."resolvedAt" IS NULL');
    if (params.status === 'resolved') qb.where('e."resolvedAt" IS NOT NULL');
    return qb.getMany();
  }

  async resolveError(id: string, adminId: string) {
    await this.errorRepo.update(
      { id },
      { resolvedAt: new Date(), resolvedBy: adminId },
    );
    return { ok: true };
  }

  /**
   * 기능별 사용량.
   *
   * 무엇을 실제로 쓰는지 모르면 어디를 고쳐야 하는지도 모른다. 이벤트가
   * 쌓이기 시작한 뒤부터의 값이라, 화면에 수집 시작 시점을 함께 보여준다.
   */
  async getFeatureUsage(days = 30) {
    const rows = await this.dataSource.query(
      `
      select type, count(*)::int as events, count(distinct "userId")::int as users
      from analytics_events
      where "occurredAt" >= current_date - ($1::int || ' days')::interval
      group by 1
      order by 2 desc
      limit 20
      `,
      [days],
    );
    const [first] = await this.dataSource.query(
      `select min("occurredAt") as since from analytics_events`,
    );
    return { since: first?.since ?? null, rows };
  }
}
