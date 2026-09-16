import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';

type Row = Pick<
  AnalyticsEvent,
  'type' | 'sessionId' | 'properties' | 'occurredAt' | 'createdAt'
>;
const pct = (n: number, d: number) =>
  d ? Math.round((n / d) * 1000) / 10 : null;
export function summarizeGrowth(
  rows: Row[],
  now: number,
  source = '',
  device = '',
) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const list = groups.get(r.sessionId) || [];
    list.push(r);
    groups.set(r.sessionId, list);
  }
  const sessions = [...groups]
    .map(([id, list]) => {
      list.sort(
        (a, b) =>
          +(a.occurredAt || a.createdAt) - +(b.occurredAt || b.createdAt),
      );
      const first = list[0];
      const views = list.filter((r) => r.type === 'growth_page_view');
      const has = (type: string) =>
        list.some((r) => r.type === `growth_${type}`);
      const durationByPage = new Map<string, number>();
      for (const r of list)
        if (r.type === 'growth_page_engagement') {
          const key = String(r.properties.viewId || r.properties.page);
          durationByPage.set(
            key,
            Math.max(
              durationByPage.get(key) || 0,
              Number(r.properties.duration) || 0,
            ),
          );
        }
      const duration = [...durationByPage.values()].reduce((a, b) => a + b, 0);
      const last = list[list.length - 1];
      const closed = now - +(last.occurredAt || last.createdAt) > 1800000;
      return {
        id,
        visitor: String(first.properties.visitorId),
        source: String(first.properties.source || 'direct'),
        medium: String(first.properties.medium || 'none'),
        campaign: String(first.properties.campaign || '(none)'),
        device: String(first.properties.device),
        entry: String(views[0]?.properties.page || first.properties.page),
        exit: String(views.at(-1)?.properties.page || last.properties.page),
        startedAt: first.occurredAt || first.createdAt,
        lastAt: last.occurredAt || last.createdAt,
        views: views.length,
        duration,
        closed,
        bounced:
          closed &&
          views.length <= 1 &&
          duration < 10 &&
          !has('signup_success') &&
          !has('demo_completed') &&
          !has('feature_used'),
        signedUp: has('signup_success'),
        activated: has('feature_used'),
        list,
      };
    })
    .filter(
      (s) =>
        (!source || s.source === source) && (!device || s.device === device),
    );
  const filtered = sessions.flatMap((s) => s.list);
  const closed = sessions.filter((s) => s.closed);
  // One observed pattern per ended session. These are not statements of intent.
  const patterns = [
    { code: 'signup_error', label: '가입 오류 후 미완료', action: '오류 코드별로 가입을 재현하고 필수 입력과 중복 계정 안내를 점검하세요.' },
    { code: 'login_error', label: '로그인 오류 후 미완료', action: '로그인 오류 안내와 비밀번호 재설정 경로를 점검하세요.' },
    { code: 'client_error', label: '화면 오류 후 사용 중단', action: '해당 페이지와 기기의 화면 오류를 재현하세요.' },
    { code: 'signup_pending', label: '가입 요청 후 완료 기록 없음', action: '가입 API 응답과 네트워크 실패, 완료 이벤트 누락을 확인하세요.' },
    { code: 'form_abandoned', label: '가입 입력 중 중단', action: '모바일 입력 길이와 필수 항목, 동의 단계의 불편을 확인하세요.' },
    { code: 'not_activated', label: '가입 후 첫 사용 없음', action: '가입 직후 예시와 첫 기능 안내를 개선해 보세요.' },
    { code: 'brief_visit', label: '짧은 방문 후 종료', action: '광고 내용과 첫 화면의 일치 여부, 체험 버튼 노출을 비교하세요.' },
    { code: 'demo_only', label: '체험 완료 후 가입 없음', action: '체험 다음에 가입으로 이어지는 안내를 확인하세요.' },
    { code: 'unknown', label: '추가 확인 필요', action: '기록만으로 설명하기 어렵습니다. 방문 경로와 사용자 피드백을 함께 확인하세요.' },
  ];
  const classify = (s: (typeof sessions)[number]): string | null => {
    if (!s.closed || s.activated) return null;
    const has = (type: string) => s.list.some((r) => r.type === `growth_${type}`);
    if (s.signedUp) return 'not_activated';
    if (has('login_success')) return null;
    if (has('signup_error')) return 'signup_error';
    if (has('login_error')) return 'login_error';
    if (has('client_error')) return 'client_error';
    if (has('signup_submit')) return 'signup_pending';
    if (has('signup_start')) return 'form_abandoned';
    if (s.bounced) return 'brief_visit';
    if (has('demo_completed')) return 'demo_only';
    return 'unknown';
  };
  const outcomes = new Map(sessions.map((s) => [s.id, classify(s)]));
  const candidates = closed.filter((s) => outcomes.get(s.id) !== null);
  const dropoffs = patterns.map((p) => {
    const matching = candidates.filter((s) => outcomes.get(s.id) === p.code);
    return { ...p, count: matching.length, rate: pct(matching.length, candidates.length) };
  }).sort((a, b) => b.count - a.count);
  const funnelTypes = [
    'page_view',
    'signup_start',
    'signup_submit',
    'signup_success',
    'feature_used',
  ];
  const counts = funnelTypes.map(() => 0);
  for (const s of sessions) {
    let step = 0;
    for (const r of s.list)
      if (r.type === `growth_${funnelTypes[step]}`) {
        counts[step]++;
        step++;
      }
  }
  const channels = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = `${s.source}/${s.medium}/${s.campaign}`;
    const list = channels.get(key) || [];
    list.push(s);
    channels.set(key, list);
  }
  const pages = [...new Set(filtered.map((r) => String(r.properties.page)))]
    .map((page) => {
      const visits = sessions.filter((s) =>
        s.list.some(
          (r) => r.type === 'growth_page_view' && r.properties.page === page,
        ),
      );
      const exits = closed.filter((s) => s.exit === page).length;
      const scrolls = visits.map((s) =>
        Math.max(
          0,
          ...s.list
            .filter((r) => r.properties.page === page)
            .map((r) => Number(r.properties.scroll) || 0),
        ),
      );
      return {
        page,
        views: filtered.filter(
          (r) => r.type === 'growth_page_view' && r.properties.page === page,
        ).length,
        sessions: visits.length,
        exits,
        exitRate: pct(exits, visits.filter((s) => s.closed).length),
        scroll: [25, 50, 75, 90].map((depth) => ({
          depth,
          count: scrolls.filter((s) => s >= depth).length,
          rate: pct(scrolls.filter((s) => s >= depth).length, visits.length),
        })),
      };
    })
    .sort((a, b) => b.views - a.views);
  const clicks = new Map<
    string,
    { page: string; device: string; x: number; y: number; count: number }
  >();
  const targets = new Map<string, number>();
  const errors = new Map<string, number>();
  for (const r of filtered) {
    const p = r.properties;
    if (r.type === 'growth_click') {
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        const point = {
          page: String(p.page),
          device: String(p.device),
          x: Math.min(97.5, Math.floor(p.x / 5) * 5 + 2.5),
          y: Math.min(97.5, Math.floor(p.y / 5) * 5 + 2.5),
          count: 0,
        };
        const key = `${point.page}:${point.device}:${point.x}:${point.y}`;
        const cell = clicks.get(key) || point;
        cell.count++;
        clicks.set(key, cell);
      }
      const key = `${p.page} · ${p.target || 'other'}`;
      targets.set(key, (targets.get(key) || 0) + 1);
    }
    if (r.type.endsWith('_error')) {
      const key = `${p.page} · ${p.code || 'unknown'}`;
      errors.set(key, (errors.get(key) || 0) + 1);
    }
  }
  const tally = (map: Map<string, number>) =>
    [...map]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  const days = new Map<
    string,
    { date: string; sessions: number; signups: number }
  >();
  for (const s of sessions) {
    const date = new Date(+s.startedAt + 9 * 3600000)
      .toISOString()
      .slice(0, 10);
    const day = days.get(date) || { date, sessions: 0, signups: 0 };
    day.sessions++;
    day.signups += Number(s.signedUp);
    days.set(date, day);
  }
  return {
    summary: {
      recentVisitors: new Set(sessions.filter((s) => now - +s.lastAt <= 300000).map((s) => s.visitor)).size,
      visitors: new Set(sessions.map((s) => s.visitor)).size,
      sessions: sessions.length,
      active: sessions.length - closed.length,
      pageViews: sessions.reduce((a, s) => a + s.views, 0),
      signups: sessions.filter((s) => s.signedUp).length,
      activated: sessions.filter((s) => s.activated).length,
      signupRate: pct(
        sessions.filter((s) => s.signedUp).length,
        sessions.length,
      ),
      bounceRate: pct(closed.filter((s) => s.bounced).length, closed.length),
      avgEngagement: sessions.length
        ? Math.round(
            sessions.reduce((a, s) => a + s.duration, 0) / sessions.length,
          )
        : 0,
    },
    dropoffs: { closedSessions: closed.length, analyzedSessions: candidates.length, patterns: dropoffs },
    funnel: funnelTypes.map((type, i) => ({
      type,
      count: counts[i],
      conversion: pct(counts[i], i ? counts[i - 1] : counts[0]),
      dropoff: i ? counts[i - 1] - counts[i] : 0,
    })),
    channels: [...channels]
      .map(([label, list]) => ({
        label,
        sessions: list.length,
        signups: list.filter((s) => s.signedUp).length,
        conversion: pct(list.filter((s) => s.signedUp).length, list.length),
        bounce: pct(
          list.filter((s) => s.bounced).length,
          list.filter((s) => s.closed).length,
        ),
      }))
      .sort((a, b) => b.sessions - a.sessions),
    pages,
    heatmap: [...clicks.values()],
    targets: tally(targets).slice(0, 30),
    errors: tally(errors),
    daily: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    sessions: sessions
      .sort((a, b) => +b.lastAt - +a.lastAt)
      .slice(0, 100)
      .map(({ list, ...s }) => ({
        ...s,
        dropoff: outcomes.get(s.id) || null,
        journey: list
          .filter(
            (r) =>
              ![
                'growth_click',
                'growth_page_engagement',
                'growth_web_vital',
              ].includes(r.type),
          )
          .slice(-30)
          .map((r) => ({
            type: r.type.replace('growth_', ''),
            page: String(r.properties.page),
            at: r.occurredAt || r.createdAt,
          })),
      })),
    sources: [
      ...new Set(rows.map((r) => String(r.properties.source || 'direct'))),
    ].sort(),
    vitals: ['LCP', 'CLS', 'INP'].map((metric) => {
      const values = filtered
        .filter(
          (r) =>
            r.type === 'growth_web_vital' && r.properties.metric === metric,
        )
        .map((r) => Number(r.properties.value))
        .sort((a, b) => a - b);
      return {
        metric,
        samples: values.length,
        p75: values.length ? values[Math.ceil(values.length * 0.75) - 1] : null,
      };
    }),
  };
}

@Injectable()
export class GrowthService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly events: Repository<AnalyticsEvent>,
  ) {}
  @Cron('0 0 4 * * *', { timeZone: 'Asia/Seoul' })
  async prune() {
    await this.events
      .createQueryBuilder()
      .delete()
      .where('type LIKE :prefix', { prefix: 'growth\\_%' })
      .andWhere('"createdAt" < :cutoff', {
        cutoff: new Date(Date.now() - 90 * 86400000),
      })
      .execute();
  }
  async report(days: string, source: string, device: string) {
    if (
      !['1', '7', '14', '30', '90'].includes(days) ||
      source.length > 80 ||
      !['', 'desktop', 'mobile', 'tablet'].includes(device)
    )
      throw new BadRequestException('Invalid filters');
    const now = Date.now();
    const start = new Date(now - Number(days) * 86400000);
    const rows = await this.events
      .createQueryBuilder('e')
      .where('e.type IN (:...types)', {
        types: [
          'page_view',
          'page_engagement',
          'click',
          'signup_start',
          'signup_submit',
          'signup_success',
          'signup_error',
          'login_success',
          'login_error',
          'demo_completed',
          'feature_used',
          'client_error',
          'web_vital',
        ].map((t) => `growth_${t}`),
      })
      .andWhere('e.createdAt >= :start', { start })
      .orderBy('e.createdAt', 'ASC')
      .take(50001)
      .getMany();
    if (rows.length > 50000)
      throw new UnprocessableEntityException(
        '이벤트가 50,000건을 초과합니다. 조회 기간을 줄여주세요. 일부 데이터로 비율을 계산하지 않습니다.',
      );
    return {
      ...summarizeGrowth(rows, now, source, device),
      start: start.toISOString(),
      end: new Date(now).toISOString(),
      eventCount: rows.length,
      firstCollectedAt: rows[0]?.createdAt || null,
    };
  }
}
