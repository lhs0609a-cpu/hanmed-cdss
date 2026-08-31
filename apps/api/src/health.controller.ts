import { Controller, Get, Optional } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Public } from './common/decorators/public.decorator';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { CacheService } from './modules/cache/cache.service';

/**
 * 지금 떠 있는 것이 어느 커밋인가.
 *
 * 배포 워크플로가 이 값으로 "정말 새 버전이 떴는가" 를 확인한다. 이게 없으면
 * 새 머신이 마이그레이션 실패로 못 떠도 Fly 가 구버전을 유지하고, 그 구버전이
 * 200 을 돌려주니 배포는 초록색으로 끝난다. 실제로 그렇게 놓친 배포가 있었다.
 *
 * 파일로 받는 이유: --build-arg 로 넣으려다 배포가 통째로 안 올라갔다.
 * COPY 는 확실히 동작하고 배포 명령에 손대지 않아도 된다.
 *
 * 모듈 로드 때 한 번만 읽는다. Fly 헬스체크가 30초마다 두드리는 경로라
 * 매번 파일을 열 이유가 없다.
 */
function readCommit(): string | null {
  const fromEnv = process.env.GIT_SHA?.trim();
  if (fromEnv && fromEnv !== 'unknown') return fromEnv;
  try {
    const v = readFileSync(join(process.cwd(), 'GIT_SHA'), 'utf8').trim();
    return v && v !== 'unknown' ? v : null;
  } catch {
    // 로컬 개발처럼 파일이 없는 환경도 정상이다. 없으면 없다고 말한다.
    return null;
  }
}

const COMMIT = readCommit();

@Controller('health')
export class HealthController {
  constructor(
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  @Public()
  @Get()
  check() {
    // 가벼운 응답 — Fly.io 헬스체크용. DB/Redis 핑은 /health/warmup 에서.
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'hanmed-cdss-api',
      commit: COMMIT,
    };
  }

  @Public()
  @Get('ready')
  readiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('live')
  liveness() {
    return {
      status: 'live',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fly.io auto-stop 콜드스타트 완화 + 의존성 워밍업.
   * - DB 풀에서 하나 꺼내서 SELECT 1 (커넥션 풀 워밍)
   * - Redis PING
   * 외부 모니터링(UptimeRobot 등)이 이 엔드포인트를 1분 간격으로 치면
   * Fly 머신이 idle 로 빠지지 않는다.
   */
  @Public()
  @Get('warmup')
  async warmup() {
    const result: Record<string, any> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    if (this.dataSource && this.dataSource.isInitialized) {
      const t0 = Date.now();
      try {
        await this.dataSource.query('SELECT 1');
        result.db = { ok: true, latencyMs: Date.now() - t0 };
      } catch (e: any) {
        result.db = { ok: false, error: e?.message ?? 'unknown' };
      }
    } else {
      result.db = { ok: false, reason: 'not initialized' };
    }

    if (this.cacheService) {
      result.redis = { ok: this.cacheService.isAvailable() };
    }

    return result;
  }

  /**
   * Keep-alive 전용 — 외부 핑이 auto-stop 을 막을 수 있게 의도적으로 분리.
   * DB/Redis 를 건드리지 않아서 모니터링 트래픽이 비용을 늘리지 않는다.
   */
  @Public()
  @Get('ping')
  ping() {
    return { pong: true, ts: Date.now() };
  }
}
