import {
  Injectable,
  ExecutionContext,
} from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerOptions,
  ThrottlerGenerateKeyFunction,
  ThrottlerGetTrackerFunction,
  ThrottlerException,
} from '@nestjs/throttler';
import { SubscriptionTier } from '../../../database/entities/user.entity';

/**
 * 사용자 기반(userId) Throttler.
 *
 * 기본 ThrottlerGuard 는 IP 기반이라 NAT 뒤 한의원(공인 IP 1개에 직원 N명)이 묶여
 * 한 명이 한도를 채우면 전체가 막힌다. 인증 사용자가 있으면 userId 로 추적.
 *
 * AI 엔드포인트는 구독 등급에 따라 분당 한도를 동적 조정한다.
 */

const AI_ROUTE_PREFIXES = ['/ai/', '/api/v1/ai/'];

const AI_PER_MINUTE_LIMIT: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 5,
  [SubscriptionTier.BASIC]: 10,
  [SubscriptionTier.PROFESSIONAL]: 30,
  [SubscriptionTier.CLINIC]: 60,
};

const AI_THROTTLER_NAME = 'ai-per-minute';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  /**
   * 인증 사용자가 있으면 userId, 없으면 IP 로 추적.
   * 같은 한의원 직원들이 한 공인 IP 를 공유해도 서로 영향 안 받음.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req?.user?.id;
    if (userId) return `user:${userId}`;
    // ip 가 없을 수 있음(웹훅 등) — 그 경우 'anon'
    return `ip:${req?.ip ?? 'anon'}`;
  }

  /**
   * AI 엔드포인트에 한해 사용자 구독 등급별 동적 한도 적용.
   * 그 외 라우트는 app.module 의 short/medium/long 기본 설정을 따른다.
   */
  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: ThrottlerOptions,
    getTracker: ThrottlerGetTrackerFunction,
    generateKey: ThrottlerGenerateKeyFunction,
  ): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const path: string = req?.originalUrl ?? req?.url ?? '';
    const isAiRoute = AI_ROUTE_PREFIXES.some((p) => path.includes(p));

    // AI 라우트가 아니면 'ai-per-minute' 스로틀러는 무시 (그 외 스로틀러는 정상 동작).
    if (throttler.name === AI_THROTTLER_NAME && !isAiRoute) {
      return true;
    }

    // AI 라우트 전용 스로틀러일 때만 동적 한도 적용
    let effectiveLimit = limit;
    if (throttler.name === AI_THROTTLER_NAME && isAiRoute) {
      const tier: SubscriptionTier | undefined = req?.user?.subscriptionTier;
      if (tier && AI_PER_MINUTE_LIMIT[tier] !== undefined) {
        effectiveLimit = AI_PER_MINUTE_LIMIT[tier];
      } else {
        // 미인증 또는 알 수 없는 등급 — FREE 한도 적용
        effectiveLimit = AI_PER_MINUTE_LIMIT[SubscriptionTier.FREE];
      }
    }

    return super.handleRequest(
      context,
      effectiveLimit,
      ttl,
      throttler,
      getTracker,
      generateKey,
    );
  }
}

export { AI_THROTTLER_NAME, AI_PER_MINUTE_LIMIT };
export { ThrottlerException };
