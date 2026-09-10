import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '../cache/cache.service';

/**
 * 홈페이지 히어로에 걸리는 자산 수 — DB 실측.
 *
 * 예전에는 stats.config.ts 에 손으로 적어 두고 사람이 기억나면 고쳤다.
 * 그 방식은 반드시 어긋난다. 실제로 어긋나 있었다 — 치험례를 8,579 건까지
 * 모아 놓고 홈페이지는 6,454 건이라고 적고 있었다. 적게 적는 쪽으로 틀리면
 * 손해고, 많게 적는 쪽으로 틀리면 열어 본 사람이 바로 안다. 둘 다 나쁘다.
 *
 * 그래서 세는 일을 DB 에 맡긴다. 사람이 갱신할 것이 없어진다.
 */

export interface PublicStats {
  /** 한국 현대 치험례 — 치험례 목록에서 실제로 열리는 것. */
  cases: number;
  /** 고전 의안 — 문언문이라 목록 기본값에서 빠져 있어 따로 센다. */
  classicalCases: number;
  /** 처방 (formulas 테이블). */
  formulas: number;
  /** 약재 (herbs_master). */
  herbs: number;
  /** 국내외 학술 문헌 (clinical_references). */
  references: number;
  /** 이 수치를 집계한 시각. 캐시 때문에 응답 시각과 다를 수 있다. */
  countedAt: string;
}

/** 5분. 히어로 숫자는 초 단위로 정확할 필요가 없고, 매 방문마다 COUNT 를 돌릴 이유도 없다. */
const CACHE_TTL_SECONDS = 300;
const CACHE_KEY = 'public-stats:v1';

@Injectable()
export class PublicStatsService {
  private readonly logger = new Logger(PublicStatsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  async getStats(): Promise<PublicStats> {
    return this.cache.getOrSet<PublicStats>(
      CACHE_KEY,
      () => this.countAll(),
      { ttl: CACHE_TTL_SECONDS },
    );
  }

  private async countAll(): Promise<PublicStats> {
    const [cases, formulas, herbs, references] = await Promise.all([
      this.countCases(),
      this.count('formulas'),
      this.count('herbs_master'),
      this.count('clinical_references'),
    ]);

    return {
      cases: cases.korean,
      classicalCases: cases.classical,
      formulas,
      herbs,
      references,
      countedAt: new Date().toISOString(),
    };
  }

  /**
   * 치험례는 corpus 로 갈라 센다.
   *
   * 한국 현대 기록과 고전 의안을 합쳐 하나로 내걸면, 그 숫자를 보고 들어온
   * 한의사가 목록에서 절반을 못 찾는다. 열어 본 사람이 바로 아는 종류의
   * 과장이라 자리를 나눈다.
   *
   * corpus 컬럼이 없는 환경(마이그레이션 전)에서는 전부 한국 기록으로 센다.
   * 숫자 하나 때문에 홈페이지가 죽는 것보다는 낫다.
   */
  private async countCases(): Promise<{ korean: number; classical: number }> {
    const hasCorpus = await this.hasColumn('clinical_cases', 'corpus');

    if (!hasCorpus) {
      return { korean: await this.count('clinical_cases'), classical: 0 };
    }

    // 목록에서 뺀 것은 세지 않는다. 홈페이지에 내건 숫자를 보고 들어온
    // 한의사가 목록에서 찾을 수 있는 수와 같아야 한다.
    const hasExclusion = await this.hasColumn(
      'clinical_cases',
      'excludedReason',
    );
    const notExcluded = hasExclusion
      ? `WHERE "excludedReason" IS NULL`
      : '';

    const rows: Array<{ corpus: string; n: string }> = await this.dataSource.query(
      `SELECT corpus, COUNT(*)::int AS n FROM clinical_cases ${notExcluded} GROUP BY corpus`,
    );

    let korean = 0;
    let classical = 0;
    for (const row of rows) {
      if (row.corpus === 'classical') classical += Number(row.n);
      else korean += Number(row.n);
    }
    return { korean, classical };
  }

  private async count(table: string): Promise<number> {
    try {
      const rows = await this.dataSource.query(
        `SELECT COUNT(*)::int AS n FROM "${table}"`,
      );
      return Number(rows?.[0]?.n ?? 0);
    } catch (e: any) {
      // 테이블 하나가 없다고 히어로 전체가 죽으면 안 된다. 0 을 돌려주면
      // 프론트가 하드코딩 폴백으로 되돌아간다.
      this.logger.warn(`${table} 집계 실패: ${e?.message ?? 'unknown'}`);
      return 0;
    }
  }

  private async hasColumn(table: string, column: string): Promise<boolean> {
    try {
      const rows = await this.dataSource.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
        [table, column],
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }
}
