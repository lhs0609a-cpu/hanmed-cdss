import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../cache/cache.service';

const PATIENT_SESSION_PREFIX = 'patients:session';
const PATIENT_SESSION_TTL_SECONDS = 60 * 60 * 8; // 진료 1세션 한도: 8시간

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);
  private readonly memoryFallback = new Map<string, any>();

  constructor(private readonly cacheService: CacheService) {}

  private isCacheReady() {
    return this.cacheService.isAvailable();
  }

  async createSession(patientData: any) {
    const sessionId = `sess_${crypto.randomUUID()}`;
    const payload = {
      ...patientData,
      sessionId,
      createdAt: new Date().toISOString(),
    };

    if (this.isCacheReady()) {
      await this.cacheService.set(sessionId, payload, {
        prefix: PATIENT_SESSION_PREFIX,
        ttl: PATIENT_SESSION_TTL_SECONDS,
      });
    } else {
      this.logger.warn('Redis unavailable; falling back to in-memory patient session.');
      this.memoryFallback.set(sessionId, payload);
    }

    return payload;
  }

  async getSession(sessionId: string) {
    if (this.isCacheReady()) {
      return this.cacheService.get<any>(sessionId, { prefix: PATIENT_SESSION_PREFIX });
    }
    return this.memoryFallback.get(sessionId) ?? null;
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
      this.memoryFallback.set(sessionId, merged);
    }

    return merged;
  }

  async deleteSession(sessionId: string) {
    if (this.isCacheReady()) {
      return this.cacheService.delete(sessionId, { prefix: PATIENT_SESSION_PREFIX });
    }
    return this.memoryFallback.delete(sessionId);
  }
}
