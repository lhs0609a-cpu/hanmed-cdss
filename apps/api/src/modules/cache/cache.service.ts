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
}
