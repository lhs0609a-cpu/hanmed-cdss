import { Controller, Get, Optional } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { CacheService } from './modules/cache/cache.service';

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
      // 지금 떠 있는 것이 어느 커밋인지. 배포 워크플로가 이 값으로
      // "정말 새 버전이 떴는가" 를 확인한다.
      //
      // 이 필드가 없던 시절에는 확인할 방법이 없었다. 새 머신이 마이그레이션
      // 실패로 못 떠도 Fly 가 구버전을 유지하고, 그 구버전이 200 을 돌려주니
      // 배포는 초록색으로 끝났다. 그래서 실패를 며칠 뒤에 발견했다.
      commit: process.env.GIT_SHA || null,
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
