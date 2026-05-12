import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface CacheOptions {
  ttl?: number; // seconds
  prefix?: string;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(CacheService.name);
  private isConnected = false;
  private readonly defaultTtl = 3600; // 1 hour

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured. Cache will be disabled.');
      return;
    }

    try {
      this.client = createClient({ url: redisUrl });

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        this.logger.warn('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const basePrefix = 'hanmed:';
    if (prefix) {
      return `${basePrefix}${prefix}:${key}`;
    }
    return `${basePrefix}${key}`;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const value = await this.client.get(fullKey);

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl ?? this.defaultTtl;

      await this.client.setEx(fullKey, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      await this.client.del(fullKey);
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete all cached values matching a pattern
   */
  async deletePattern(pattern: string, prefix?: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const fullPattern = this.buildKey(pattern, prefix);
      const keys = await this.client.keys(fullPattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      this.logger.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Get or set cached value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // If not cached, get from factory and cache
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Invalidate cache by tags (useful for related data)
   */
  async invalidateByTag(tag: string): Promise<boolean> {
    return this.deletePattern(`*:${tag}:*`);
  }

  /**
   * SET key value EX ttl NX — 분산 락 + 중복 방지의 공통 원시 연산.
   * 키가 이미 존재하면 false 반환. 존재하지 않으면 설정 후 true.
   */
  async setNx(
    key: string,
    value: string | number,
    ttlSeconds: number,
    options?: { prefix?: string },
  ): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.client.set(fullKey, String(value), {
        EX: ttlSeconds,
        NX: true,
      });
      // node-redis v4: SET ... NX 가 'OK' 또는 null
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Cache setNx error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * getOrSet + 분산 락 (Thundering Herd 방지).
   *
   * - 캐시 히트면 즉시 반환.
   * - 미스 시 SETNX 로 락 획득 시도.
   *   * 획득 → factory 실행 후 캐시 set, 락 해제.
   *   * 실패 → 다른 워커가 채우는 중. 짧은 폴링으로 캐시를 기다리고,
   *           lockWaitMs 초과 시 stale 캐시(있으면) 또는 factory 직접 호출(없으면).
   *
   * 락 키: `{prefix}:lock:{key}` — Redis 에서 락의 prefix 를 강제 부여.
   *
   * 옵션:
   *   - lockTtl(초): 락 자동 만료(기본 10s). factory 가 더 오래 걸리면 늘려야 함.
   *   - lockWaitMs(밀리초): 다른 워커를 기다리는 최대 시간(기본 5s).
   *   - pollIntervalMs: 폴링 주기(기본 50ms).
   *   - staleTtl(초): 락 실패 시 fallback 용 stale 값을 별도 키에 보존(기본 ttl*3).
   */
  async getOrSetWithLock<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions & {
      lockTtl?: number;
      lockWaitMs?: number;
      pollIntervalMs?: number;
      staleTtl?: number;
    },
  ): Promise<T> {
    const ttl = options?.ttl ?? this.defaultTtl;
    const lockTtl = options?.lockTtl ?? 10;
    const lockWaitMs = options?.lockWaitMs ?? 5_000;
    const pollIntervalMs = options?.pollIntervalMs ?? 50;
    const staleTtl = options?.staleTtl ?? ttl * 3;

    // 1. 캐시 즉시 확인
    const cached = await this.get<T>(key, { prefix: options?.prefix });
    if (cached !== null) return cached;

    // Redis 다운 — 그냥 factory 호출 (단일 인스턴스 동작)
    if (!this.isConnected) {
      return factory();
    }

    const lockKey = `lock:${key}`;
    const staleKey = `stale:${key}`;
    const acquired = await this.setNx(lockKey, Date.now(), lockTtl, {
      prefix: options?.prefix,
    });

    if (acquired) {
      try {
        const value = await factory();
        await this.set(key, value, { prefix: options?.prefix, ttl });
        // stale fallback 별도 보존 (락 실패 워커가 사용)
        await this.set(staleKey, value, {
          prefix: options?.prefix,
          ttl: staleTtl,
        });
        return value;
      } finally {
        await this.delete(lockKey, { prefix: options?.prefix }).catch(() => undefined);
      }
    }

    // 2. 락 실패 → 짧은 폴링으로 다른 워커 결과 대기
    const deadline = Date.now() + lockWaitMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const v = await this.get<T>(key, { prefix: options?.prefix });
      if (v !== null) return v;
    }

    // 3. 타임아웃 — stale 캐시 fallback
    const stale = await this.get<T>(staleKey, { prefix: options?.prefix });
    if (stale !== null) {
      this.logger.warn(`Lock wait timeout for ${key} — returning stale cache.`);
      return stale;
    }

    // 4. 마지막 수단 — factory 직접 호출 (락 미획득이지만 데이터가 없음)
    this.logger.warn(`Lock wait timeout for ${key} — calling factory directly.`);
    return factory();
  }
}
