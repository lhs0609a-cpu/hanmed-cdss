import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import {
  FeatureKey,
  FEATURE_LABELS,
  PLAN_FEATURES,
  tierHasFeature,
} from '../../database/entities/plan-features';
import { SubscriptionTier } from '../../database/entities/user.entity';

/**
 * 요금제 기능 게이트 — 서버 쪽.
 *
 * 화면의 FeatureGate 는 잠금 카드를 그릴 뿐이라 API 를 직접 부르면 통과한다.
 * 실제로 막는 것은 여기다.
 *
 * 402 를 쓴다. 401(로그인 안 됨)도 403(권한 없음)도 아니고 요금제가 모자란
 * 것이라, 프론트가 로그인 만료와 구분해서 업그레이드 안내를 띄울 수 있어야 한다.
 * 치험례 목록 유료화에서 쓴 것과 같은 규칙이다.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /** 이 기능이 열리는 가장 낮은 티어. 안내 문구에 쓴다. */
  private minTierFor(feature: FeatureKey): SubscriptionTier | null {
    const order: SubscriptionTier[] = [
      SubscriptionTier.FREE,
      SubscriptionTier.BASIC,
      SubscriptionTier.PROFESSIONAL,
      SubscriptionTier.CLINIC,
    ];
    return order.find((t) => PLAN_FEATURES[t]?.has(feature)) ?? null;
  }

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.getAllAndOverride<FeatureKey>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    // 선언이 없으면 이 가드는 아무것도 하지 않는다.
    if (!feature) return true;

    const req = context.switchToHttp().getRequest();
    // 티어를 모르면 가장 낮은 것으로 본다. 모르는 것을 유리하게 해석하면
    // 인증이 헐거운 경로 하나로 전체 게이트가 뚫린다.
    const tier: SubscriptionTier =
      req?.user?.subscriptionTier ?? SubscriptionTier.FREE;

    if (tierHasFeature(tier, feature)) return true;

    const label = FEATURE_LABELS[feature] ?? feature;
    const min = this.minTierFor(feature);
    const tierName: Record<SubscriptionTier, string> = {
      [SubscriptionTier.FREE]: 'Free',
      [SubscriptionTier.BASIC]: 'Basic',
      [SubscriptionTier.PROFESSIONAL]: 'Pro',
      [SubscriptionTier.CLINIC]: 'Clinic',
    };

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        // 전역 예외 필터가 statusCode·error·message 만 살리고 나머지 키는
        // 버린다. 그래서 식별자를 error 에 싣는다.
        error: 'FEATURE_NOT_IN_PLAN',
        message: min
          ? `${label}은(는) ${tierName[min]} 이상 요금제에서 사용할 수 있습니다.`
          : `${label}은(는) 현재 요금제에서 사용할 수 없습니다.`,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
