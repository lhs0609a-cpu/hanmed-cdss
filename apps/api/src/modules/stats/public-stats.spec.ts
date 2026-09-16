import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { PublicStatsService } from './public-stats.service';
import { CacheService } from '../cache/cache.service';

/**
 * 홈페이지 지표 집계.
 *
 * 이 숫자는 로그인 전 첫 화면에 그대로 찍힌다. 틀리면 표시광고 문제가 되고,
 * 0 이 찍히면 "치험례 0건" 이 된다. 둘 다 조용히 지나가면 안 되는 실패다.
 */
describe('PublicStatsService', () => {
  const build = async (opts: {
    columns?: Array<Record<string, string>>;
    counts?: Record<string, number>;
    corpusRows?: Array<{ corpus: string; n: number }>;
    fail?: string[];
  }) => {
    const queries: string[] = [];

    const query = jest.fn(async (sql: string, params?: any[]) => {
      queries.push(sql);

      if (sql.includes('information_schema.columns')) {
        return opts.columns ?? [];
      }
      if (sql.includes('GROUP BY corpus')) {
        return opts.corpusRows ?? [];
      }

      const table = sql.match(/FROM "?([a-z_]+)"?/i)?.[1] ?? '';
      if (opts.fail?.includes(table)) {
        throw new Error(`relation "${table}" does not exist`);
      }
      return [{ n: opts.counts?.[table] ?? 0 }];
    });

    const module = await Test.createTestingModule({
      providers: [
        PublicStatsService,
        { provide: getDataSourceToken(), useValue: { query } },
        {
          // 캐시는 그대로 통과시켜 집계 자체를 본다.
          provide: CacheService,
          useValue: { getOrSet: jest.fn(async (_k: string, f: () => any) => f()) },
        },
      ],
    }).compile();

    return { service: module.get(PublicStatsService), queries };
  };

  it('corpus 로 한국 기록과 고전 의안을 갈라 센다', async () => {
    const { service } = await build({
      columns: [{ column_name: 'corpus' }],
      corpusRows: [
        { corpus: 'korean', n: 8579 },
        { corpus: 'classical', n: 7920 },
      ],
      counts: { formulas: 404, herbs_master: 636, clinical_references: 42182 },
    });

    const stats = await service.getStats();

    expect(stats.cases).toBe(8579);
    expect(stats.classicalCases).toBe(7920);
    expect(stats.formulas).toBe(404);
    expect(stats.herbs).toBe(636);
    expect(stats.references).toBe(42182);
    expect(stats.countedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('고전 의안을 치험례에 더하지 않는다', async () => {
    const { service } = await build({
      columns: [{ column_name: 'corpus' }],
      corpusRows: [
        { corpus: 'korean', n: 8579 },
        { corpus: 'classical', n: 7920 },
      ],
    });

    const stats = await service.getStats();

    // 16,499 로 합쳐 내걸면 목록에서 절반을 못 찾는다.
    expect(stats.cases).not.toBe(16499);
  });

  it('corpus 컬럼이 없으면 전부 한국 기록으로 센다', async () => {
    const { service } = await build({
      columns: [],
      counts: { clinical_cases: 6454 },
    });

    const stats = await service.getStats();

    expect(stats.cases).toBe(6454);
    expect(stats.classicalCases).toBe(0);
  });

  it('테이블 하나가 없어도 나머지 숫자는 살린다', async () => {
    const { service } = await build({
      columns: [{ column_name: 'corpus' }],
      corpusRows: [{ corpus: 'korean', n: 8579 }],
      counts: { herbs_master: 636, clinical_references: 42182 },
      fail: ['formulas'],
    });

    const stats = await service.getStats();

    expect(stats.formulas).toBe(0); // 프론트가 폴백으로 되돌아갈 신호
    expect(stats.cases).toBe(8579);
    expect(stats.herbs).toBe(636);
  });

  it('알 수 없는 corpus 값은 한국 기록 쪽에 넣는다', async () => {
    const { service } = await build({
      columns: [{ column_name: 'corpus' }],
      corpusRows: [
        { corpus: 'korean', n: 8000 },
        { corpus: null as any, n: 579 },
      ],
    });

    const stats = await service.getStats();

    expect(stats.cases).toBe(8579);
  });
});
