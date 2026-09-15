import { randomUUID } from 'crypto';
import { parseGrowthEvents, safePage } from './growth-events';
import { summarizeGrowth } from './growth.service';
import {
  GrowthEventsController,
  AdminGrowthController,
} from './growth.controller';
import { ROLES_KEY } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';

const now = Date.now();
const event = (patch = {}) => ({
  id: randomUUID(),
  sessionId: randomUUID(),
  visitorId: randomUUID(),
  type: 'page_view',
  page: '/',
  timestamp: new Date(now - 3600000).toISOString(),
  device: 'mobile',
  ...patch,
});
describe('growth collection', () => {
  it('keeps only safe metadata, no identifiers or clinical/form content', () => {
    const [row] = parseGrowthEvents({
      events: [
        event({
          email: 'secret@example.com',
          userId: randomUUID(),
          source: 'meta',
          campaign: 'autumn_1',
          target: 'secret@example.com',
          search: 'patient symptoms',
          x: 20,
          y: 30,
        }),
      ],
    });
    expect(row.userId).toBeNull();
    expect(row.properties).toMatchObject({
      source: 'meta',
      campaign: 'autumn_1',
      x: 20,
    });
    expect(JSON.stringify(row)).not.toMatch(/secret|symptoms/);
  });
  it.each([
    '/guide/secret',
    '/t/secret',
    '/dashboard/patients/123',
    '/register?email=secret',
    '/admin',
  ])('rejects sensitive page %s', (page) => {
    expect(safePage(page)).toBeNull();
    expect(() => parseGrowthEvents({ events: [event({ page })] })).toThrow();
  });
  it('rejects malformed batches/times and unsupported types', () => {
    for (const body of [
      null,
      {},
      { events: [] },
      { events: Array(51).fill(event()) },
      { events: [null] },
      { events: [event({ timestamp: 'bad' })] },
      { events: [event({ type: 'anything' })] },
    ])
      expect(() => parseGrowthEvents(body)).toThrow();
  });
  it('ignores out-of-bounds or non-numeric coordinates', () => {
    const [row] = parseGrowthEvents({
      events: [event({ x: -1, y: 101, scroll: '90', duration: Infinity })],
    });
    expect(row.properties).not.toHaveProperty('x');
    expect(row.properties).not.toHaveProperty('scroll');
  });
  it('uses conflict-safe writes and propagates database failure', async () => {
    const execute = jest.fn().mockResolvedValue({});
    const builder = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute,
    };
    const controller = new GrowthEventsController({
      createQueryBuilder: () => builder,
    } as any);
    await expect(controller.collect({ events: [event()] })).resolves.toEqual({
      accepted: 1,
    });
    expect(builder.orIgnore).toHaveBeenCalled();
    execute.mockRejectedValue(new Error('DB unavailable'));
    await expect(controller.collect({ events: [event()] })).rejects.toThrow(
      'DB unavailable',
    );
  });
  it('restricts reporting to admins', () =>
    expect(Reflect.getMetadata(ROLES_KEY, AdminGrowthController)).toEqual([
      UserRole.ADMIN,
    ]));
});

function rows(types: string[], sessionId = randomUUID(), offset = -3600000) {
  return types.map((type, i) => ({
    type: `growth_${type}`,
    sessionId,
    properties: {
      page: '/',
      visitorId: sessionId,
      device: 'mobile',
      source: 'meta',
      duration: 2,
    },
    occurredAt: new Date(now + offset + i * 1000),
    createdAt: new Date(now + offset + i * 1000),
  }));
}
describe('growth metrics', () => {
  it('counts recent unique browsers, not open thirty-minute sessions', () => {
    const recent = rows(['page_view'], randomUUID(), -60000);
    const sameVisitor = rows(['page_view'], randomUUID(), -120000);
    sameVisitor[0].properties.visitorId = recent[0].properties.visitorId;
    const report = summarizeGrowth([...recent, ...sameVisitor, ...rows(['page_view'], randomUUID(), -600000)], now);
    expect(report.summary.recentVisitors).toBe(1);
    expect(report.summary.active).toBe(3);
  });
  it('classifies ended sessions once and excludes ongoing and recovered errors', () => {
    const report = summarizeGrowth([
      ...rows(['page_view', 'signup_start', 'signup_error']),
      ...rows(['page_view', 'signup_start']),
      ...rows(['page_view', 'signup_error', 'signup_success', 'feature_used']),
      ...rows(['page_view', 'login_error', 'login_success']),
      ...rows(['page_view', 'signup_error'], randomUUID(), -60000),
      ...rows(['page_view', 'signup_success']),
    ], now);
    expect(report.dropoffs.analyzedSessions).toBe(3);
    expect(report.dropoffs.patterns.filter((p) => p.count).map((p) => p.code)).toEqual(['signup_error', 'form_abandoned', 'not_activated']);
    expect(report.dropoffs.patterns.reduce((sum, p) => sum + p.count, 0)).toBe(3);
  });
  it('filters diagnoses with the report and leaves empty rates undefined', () => {
    const report = summarizeGrowth(rows(['page_view', 'signup_error']), now, 'google');
    expect(report.dropoffs.analyzedSessions).toBe(0);
    expect(report.dropoffs.patterns.every((p) => p.rate === null)).toBe(true);
  });
  it('excludes live sessions from bounce denominator', () => {
    const r = summarizeGrowth(
      [...rows(['page_view']), ...rows(['page_view'], randomUUID(), -1000)],
      now,
    );
    expect(r.summary.sessions).toBe(2);
    expect(r.summary.active).toBe(1);
    expect(r.summary.bounceRate).toBe(100);
  });
  it('counts funnels in order and excludes incomplete steps', () => {
    const r = summarizeGrowth(
      [
        ...rows([
          'page_view',
          'signup_start',
          'signup_submit',
          'signup_success',
          'feature_used',
        ]),
        ...rows(['page_view', 'signup_success', 'signup_start']),
      ],
      now,
    );
    expect(r.funnel.map((f) => f.count)).toEqual([2, 2, 1, 1, 1]);
    expect(r.summary.bounceRate).toBe(0);
  });
  it('does not turn cumulative heartbeat time into inflated engagement', () => {
    const list = rows(['page_view', 'page_engagement', 'page_engagement']);
    list[1].properties.duration = 15;
    list[2].properties.duration = 30;
    expect(summarizeGrowth(list, now).summary.avgEngagement).toBe(30);
  });
  it('filters whole sessions and uses null for empty denominators', () => {
    const r = summarizeGrowth(rows(['page_view']), now, 'google');
    expect(r.summary.sessions).toBe(0);
    expect(r.summary.bounceRate).toBeNull();
    expect(r.summary.signupRate).toBeNull();
  });
});
