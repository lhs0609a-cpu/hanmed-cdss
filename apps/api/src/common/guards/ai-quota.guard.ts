import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { TossPaymentsService } from '../../modules/toss-payments/toss-payments.service';
import { UsageType } from '../../database/entities/usage-tracking.entity';
import { PLAN_LIMITS, SubscriptionTier } from '../../database/entities/user.entity';

/**
 * AI 월 사용량 한도.
 *
 * 플랜을 가르는 핵심 지표인데(50 / 200 / 1,000 / 5,000회) 아무 데서도 세지
 * 않고 있었다. trackUsage 는 락과 트랜잭션까지 갖춘 채로 구현돼 있었지만
 * 부르는 곳이 한 군데도 없는 죽은 코드였다. 결제 시스템이 사용량을 모르면
 * 요금제는 장식이다.
 *
 * 분당 속도제한(UserThrottlerGuard)과는 다른 것이다. 그쪽은 도배를 막고
 * 이쪽은 월 한도를 센다. 분당 5회만 걸려 있으면 무료 계정으로 하루 종일
 * 돌려 월 수천 회를 쓸 수 있다.
 *
 * 세는 시점은 요청을 받을 때다. 응답이 실패해도 호출은 나갔고 비용도 나갔다.
 * 성공했을 때만 세면 실패를 유도해 무한히 쓰는 길이 열린다.
 */
@Injectable()
export class AiQuotaGuard implements CanActivate {
  private readonly logger = new Logger(AiQuotaGuard.name);

  constructor(private readonly payments: TossPaymentsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req?.user?.id;
    // 인증이 없으면 이 가드가 할 일이 없다. 인증은 앞의 JwtAuthGuard 가 본다.
    if (!userId) return true;

    const allowed = await this.payments.trackUsage(userId, UsageType.AI_QUERY);
    if (allowed) return true;

    const tier: SubscriptionTier =
      req?.user?.subscriptionTier ?? SubscriptionTier.FREE;
    const limit = PLAN_LIMITS[tier];

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        // 전역 예외 필터가 statusCode·error·message 만 남기므로 식별자를
        // error 에 싣는다.
        error: 'AI_QUOTA_EXCEEDED',
        message:
          `이번 달 AI 사용량(${limit.toLocaleString()}회)을 모두 쓰셨습니다. ` +
          '다음 달에 초기화되며, 더 필요하시면 요금제를 올려 주세요.',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
