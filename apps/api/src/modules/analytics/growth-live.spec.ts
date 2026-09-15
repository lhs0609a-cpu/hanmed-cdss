import { buildLive, LiveSession } from './growth-live.rules';
import { GrowthLiveService } from './growth-live.service';
import { AdminGrowthController } from './growth.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';

const now = Date.parse('2026-09-15T03:00:00Z');
const at = (minutes: number) => new Date(now - minutes * 60000).toISOString();
const session = (id: string, overrides: Partial<LiveSession> = {}): LiveSession => ({
  id, visitor: id, source: 'direct', device: 'mobile', firstAt: at(10), lastAt: at(1),
  receivedAt: at(1), startAt: null, submitAt: null, successAt: null,
  errorAt: null, demoAt: null, featureAt: null, page: '/', ...overrides,
});
const rule = (rows: LiveSession[], code = 'signup_error') => buildLive(rows, now).rules.find(r => r.id === `${code}:mobile`)!;

describe('live growth evidence', () => {
  it('deduplicates browsers across sessions and does not sum minute counts', () => {
    const result = buildLive([session('a'), session('b', { visitor: 'a' }), session('c', { lastAt: at(6) })], now);
    expect(result.recentVisitors).toBe(1);
    expect(result.sampleSize).toBe(3);
    expect(result.minutes).toHaveLength(60);
    expect(JSON.stringify(result.feed)).not.toContain('visitor');
  });
  it('uses null rates and insufficient evidence for empty windows', () => {
    expect(rule([])).toMatchObject({ rate: null, baselineRate: null, sufficient: false, triggered: false });
  });
  it('requires minimum samples in both periods and separates recovery', () => {
    const current = Array.from({ length: 20 }, (_, i) => session(`c${i}`, { submitAt: at(10), errorAt: i < 10 ? at(9) : null, successAt: i < 3 ? at(8) : null }));
    const previous = Array.from({ length: 20 }, (_, i) => session(`p${i}`, { submitAt: at(25), errorAt: i < 2 ? at(24) : null }));
    expect(rule([...current, ...previous])).toMatchObject({ denominator: 20, numerator: 10, baselineNumerator: 2, triggered: true, recovered: 3 });
    expect(rule([...current, ...previous.slice(1)])).toMatchObject({ sufficient: false, triggered: false });
  });
  it('does not count an error before a signup request as request failure', () => {
    expect(rule([session('a', { submitAt: at(5), errorAt: at(6) })]).numerator).toBe(0);
  });
  it('does not count an unrelated earlier error as signup recovery', () => {
    expect(rule([session('a', { submitAt: at(5), errorAt: at(6), successAt: at(4) })]))
      .toMatchObject({ numerator: 0, recovered: 0 });
  });
  it('places boundary events in exactly one comparison window', () => {
    expect(rule([session('a', { submitAt: at(15) }), session('b', { submitAt: at(30) }), session('future', { submitAt: at(0) })])).toMatchObject({ denominator: 1, baselineDenominator: 1 });
  });
  it('excludes ongoing and successfully completed signup forms', () => {
    expect(rule([
      session('ongoing', { startAt: at(10) }),
      session('ended', { startAt: at(50), lastAt: at(40) }),
      session('done', { startAt: at(50), lastAt: at(40), successAt: at(41) }),
    ], 'form_abandoned')).toMatchObject({ numerator: 1, denominator: 2 });
  });
  it('requires a feature after signup for activation and filters devices', () => {
    const result = rule([
      session('before', { successAt: at(50), featureAt: at(51), lastAt: at(40) }),
      session('after', { successAt: at(50), featureAt: at(49), lastAt: at(40) }),
      session('desktop', { device: 'desktop', successAt: at(50), lastAt: at(40) }),
    ], 'not_activated');
    expect(result).toMatchObject({ denominator: 2, numerator: 1 });
  });
});

describe('live growth service', () => {
  it('protects live and mutation endpoints with the existing administrator guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminGrowthController)).toHaveLength(2);
    expect(Reflect.getMetadata('roles', AdminGrowthController)).toEqual(['admin']);
  });
  it('returns stale cached values without rescanning events', async () => {
    const query = jest.fn().mockResolvedValue([{ asOf: new Date(0), payload: { recentVisitors: 7 } }]);
    const result = await new GrowthLiveService({ query } as any).live();
    expect(result).toMatchObject({ dataStatus: 'stale', recentVisitors: 7 });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).not.toContain('analytics_events');
  });
  it('does not fabricate zero visitors when no aggregate exists', async () => {
    expect(await new GrowthLiveService({ query: async () => [] } as any).live()).toEqual({ dataStatus: 'pending', asOf: null, lastReceivedAt: null });
  });
  it('skips concurrent aggregation and rejects invalid state mutations', async () => {
    const query = jest.fn().mockResolvedValue([{ locked: false }]);
    const service = new GrowthLiveService({ transaction: (fn: any) => fn({ query }) } as any);
    await service.aggregate();
    expect(query).toHaveBeenCalledTimes(1);
    await expect(service.update('x', { status: 'invented', version: 1 }, 'actor')).rejects.toThrow('Invalid status');
  });
  it('rejects concurrent administrator edits before writing an audit record', async () => {
    const query = jest.fn().mockResolvedValue([{ status: 'new', version: 2 }]);
    const service = new GrowthLiveService({ transaction: (fn: any) => fn({ query }) } as any);
    await expect(service.update('x', { status: 'reviewing', version: 1 }, 'actor')).rejects.toThrow('다른 관리자');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('saves actor and both states in the same transaction', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ status: 'new', version: 1 }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ status: 'reviewing', version: 2 }]);
    const service = new GrowthLiveService({ transaction: (fn: any) => fn({ query }) } as any);
    await expect(service.update('x', { status: 'reviewing', version: 1 }, 'actor')).resolves.toEqual({ status: 'reviewing', version: 2 });
    expect(query.mock.calls[1][1]).toEqual(['x', 'actor', 'new', 'reviewing']);
  });
});
