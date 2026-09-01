import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from '../../database/entities/plan-features';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * 이 엔드포인트를 쓰려면 어떤 요금제 기능이 있어야 하는지 선언한다.
 *
 * 왜 필요했나: 기능 매트릭스에 23개가 정의돼 있는데 서버에서 실제로 막는 것은
 * 하나뿐이었다. 나머지는 화면에서만 잠갔고, 화면 잠금은 API 를 직접 부르면
 * 그냥 통과한다. 잠금 카드는 권유이지 방어가 아니다.
 *
 * 사용:
 *   @Post('voice-chart')
 *   @UseGuards(AuthGuard('jwt'), FeatureGuard)
 *   @RequireFeature(FeatureKey.VOICE_CHART)
 *
 * 컨트롤러 전체에 걸 수도 있다. 그때는 그 컨트롤러의 모든 라우트가 같은
 * 기능을 요구한다.
 */
export const RequireFeature = (feature: FeatureKey) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);
