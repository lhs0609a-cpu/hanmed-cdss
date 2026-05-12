import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../cache/cache.service';

const PATIENT_SESSION_PREFIX = 'patients:session';
const PATIENT_SESSION_TTL_SECONDS = 60 * 60 * 8; // 진료 1세션 한도: 8시간
const MEMORY_FALLBACK_MAX = 1_000; // 메모리 폭주 방지 — 한의사 500명 환경에서 충분
const MEMORY_FALLBACK_TTL_MS = PATIENT_SESSION_TTL_SECONDS * 1000;

interface MemoryEntry {
  payload: any;
  expiresAt: number;
}

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  /**
   * Redis 장애 시 사용하는 단기 fallback.
   * Map 의 insertion-order 가 곧 LRU 순서 — get/set 때마다 키를 재삽입해서
   * 가장 최근 접근이 뒤로 가게 만든다. 한도 초과 시 가장 오래된 키부터 제거.
   */
  private readonly memoryFallback = new Map<string, MemoryEntry>();
  private memoryHits = 0;
  private memoryEvictions = 0;
  private lastMigratedAt = 0;

  constructor(private readonly cacheService: CacheService) {}

  private isCacheReady() {
    return this.cacheService.isAvailable();
  }

  /** TTL 만료 항목 제거 + LRU 사이즈 캡 적용 */
  private evictIfNeeded() {
    const now = Date.now();
    // expired sweep — 호출당 최대 64건만 검사해서 latency 보호
    let scanned = 0;
    for (const [k, v] of this.memoryFallback) {
      if (scanned++ > 64) break;
      if (v.expiresAt <= now) {
        this.memoryFallback.delete(k);
        this.memoryEvictions++;
      }
    }
    // size cap — 오래된 것부터 제거
    while (this.memoryFallback.size > MEMORY_FALLBACK_MAX) {
      const oldestKey = this.memoryFallback.keys().next().value;
      if (oldestKey === undefined) break;
      this.memoryFallback.delete(oldestKey);
      this.memoryEvictions++;
    }
  }

  /** LRU 갱신 — 키를 한 번 삭제하고 다시 set 해서 뒤로 보낸다 */
  private touch(key: string, entry: MemoryEntry) {
    this.memoryFallback.delete(key);
    this.memoryFallback.set(key, entry);
  }

  /**
   * Redis 가 복구되면 메모리에 쌓인 세션을 Redis 로 이전한다.
   * 호출당 최대 50개씩만 처리 — 갑작스러운 대량 이전이 Redis 를 흔들지 않게.
   * 동일 분 내 중복 이전 방지.
   */
  private async migrateMemoryToRedisIfPossible() {
    if (!this.isCacheReady() || this.memoryFallback.size === 0) return;
    const now = Date.now();
    if (now - this.lastMigratedAt < 60_000) return;
    this.lastMigratedAt = now;

    let moved = 0;
    for (const [key, entry] of [...this.memoryFallback]) {
      if (moved >= 50) break;
      if (entry.expiresAt <= now) {
        this.memoryFallback.delete(key);
        continue;
      }
      const ttl = Math.max(1, Math.floor((entry.expiresAt - now) / 1000));
      const ok = await this.cacheService.set(key, entry.payload, {
        prefix: PATIENT_SESSION_PREFIX,
        ttl,
      });
      if (ok) {
        this.memoryFallback.delete(key);
        moved++;
      }
    }
    if (moved > 0) {
      this.logger.log(
        `Redis 복구 — in-memory 세션 ${moved}건 이전 완료 (잔여: ${this.memoryFallback.size}).`,
      );
    }
  }

  async createSession(patientData: any) {
    const sessionId = `sess_${crypto.randomUUID()}`;
    const payload = {
      ...patientData,
      sessionId,
      createdAt: new Date().toISOString(),
    };

    if (this.isCacheReady()) {
      // 백그라운드로 메모리 잔여물을 Redis 로 이전
      void this.migrateMemoryToRedisIfPossible();
      await this.cacheService.set(sessionId, payload, {
        prefix: PATIENT_SESSION_PREFIX,
        ttl: PATIENT_SESSION_TTL_SECONDS,
      });
    } else {
      this.evictIfNeeded();
      this.logger.warn(
        `Redis 사용 불가 — in-memory 세션 사용 (현재 보관: ${this.memoryFallback.size}/${MEMORY_FALLBACK_MAX}, eviction: ${this.memoryEvictions})`,
      );
      this.memoryFallback.set(sessionId, {
        payload,
        expiresAt: Date.now() + MEMORY_FALLBACK_TTL_MS,
      });
    }

    return payload;
  }

  async getSession(sessionId: string) {
    if (this.isCacheReady()) {
      void this.migrateMemoryToRedisIfPossible();
      return this.cacheService.get<any>(sessionId, { prefix: PATIENT_SESSION_PREFIX });
    }
    const entry = this.memoryFallback.get(sessionId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memoryFallback.delete(sessionId);
      return null;
    }
    this.memoryHits++;
    this.touch(sessionId, entry);
    return entry.payload;
  }

  async updateSession(sessionId: string, data: any) {
    const existing = await this.getSession(sessionId);
    if (!existing) return null;
    const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };

    if (this.isCacheReady()) {
      await this.cacheService.set(sessionId, merged, {
        prefix: PATIENT_SESSION_PREFIX,
        ttl: PATIENT_SESSION_TTL_SECONDS,
      });
    } else {
      this.evictIfNeeded();
      this.memoryFallback.set(sessionId, {
        payload: merged,
        expiresAt: Date.now() + MEMORY_FALLBACK_TTL_MS,
      });
    }

    return merged;
  }

  async deleteSession(sessionId: string) {
    if (this.isCacheReady()) {
      return this.cacheService.delete(sessionId, { prefix: PATIENT_SESSION_PREFIX });
    }
    return this.memoryFallback.delete(sessionId);
  }

  /** 운영 모니터링용 — 헬스체크/메트릭 엔드포인트에서 사용 가능 */
  getMemoryFallbackStats() {
    return {
      size: this.memoryFallback.size,
      max: MEMORY_FALLBACK_MAX,
      hits: this.memoryHits,
      evictions: this.memoryEvictions,
      redisAvailable: this.isCacheReady(),
    };
  }
}
