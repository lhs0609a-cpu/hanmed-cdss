import { HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionTier } from '../../database/entities/user.entity';
import {
  FeatureKey,
  tierHasFeature,
  CASE_BROWSE_FREE_PAGES,
  CASE_BROWSE_FREE_CASES,
  CASE_LIST_PAGE_SIZE_MAX,
} from '../../database/entities/plan-features';

// 요금제와 직접 얽힌 숫자라 plan-features 가 단일 출처다. 여기서는 다시 내보내
// 이 모듈만 import 해도 되게 한다 — 정의가 두 곳에 생기는 것을 막는다.
export { CASE_BROWSE_FREE_PAGES, CASE_BROWSE_FREE_CASES, CASE_LIST_PAGE_SIZE_MAX };

/**
 * 치험례 목록 둘러보기 한도 — 무엇을 보여주고 어디서 지갑을 열게 하는지의 단일 출처.
 *
 * 과금 지점을 여기 둔 이유:
 *   6,000건이 쌓여 있다는 사실 자체가 이 제품의 값어치다. 그걸 숨기면 팔리지 않고,
 *   전부 열어 두면 팔 것이 없다. 그래서 총 건수와 총 페이지 수는 그대로 보여주고
 *   넘길 수 있는 범위만 잠근다 — "300페이지가 있는데 3페이지까지 봤다" 가
 *   가장 정직하고 가장 강한 전환 문구다.
 *
 * 검색은 잠그지 않는다. 찾으러 온 한의사를 막으면 제품이 죽는다. 잠그는 것은
 * 목적 없이 처음부터 끝까지 훑는 행위이고, 그게 곧 수집 행위이기도 하다.
 */

/** 목록 응답 meta 에 실어 프론트가 벽을 미리 그리게 한다 */
export interface CaseBrowseAccess {
  /** 이 사용자가 목록으로 넘길 수 있는 최대 페이지 (무제한이면 null) */
  maxPage: number | null;
  /** 이 사용자가 목록으로 도달할 수 있는 최대 건수 (무제한이면 null) */
  maxCases: number | null;
  /** 벽이 걸려 있는가 — 무료 티어면 true */
  limited: boolean;
  /** 다음 페이지가 벽 너머인가 — "다음" 버튼을 잠그는 근거 */
  nextPageLocked: boolean;
}

/** 요청 파라미터를 안전한 범위로 조인다. 음수·NaN·과대 limit 을 모두 흡수한다. */
export function clampListPaging(
  page: unknown,
  limit: unknown,
): { page: number; limit: number } {
  const p = Math.floor(Number(page));
  const l = Math.floor(Number(limit));
  return {
    page: Number.isFinite(p) && p >= 1 ? p : 1,
    limit:
      Number.isFinite(l) && l >= 1 ? Math.min(l, CASE_LIST_PAGE_SIZE_MAX) : CASE_LIST_PAGE_SIZE_MAX,
  };
}

function unlimited(tier: SubscriptionTier): boolean {
  return tierHasFeature(tier, FeatureKey.CASE_BROWSE_UNLIMITED);
}

/** 이 요청이 무료 한도 너머를 요구하는가 (0-based 오프셋 기준) */
export function isBeyondFreeWindow(
  tier: SubscriptionTier,
  page: number,
  limit: number,
): boolean {
  if (unlimited(tier)) return false;
  return (page - 1) * limit >= CASE_BROWSE_FREE_CASES;
}

/** 응답 meta 에 붙일 열람 범위 정보 */
export function browseAccess(
  tier: SubscriptionTier,
  page: number,
  limit: number,
): CaseBrowseAccess {
  if (unlimited(tier)) {
    return { maxPage: null, maxCases: null, limited: false, nextPageLocked: false };
  }
  return {
    maxPage: Math.max(Math.ceil(CASE_BROWSE_FREE_CASES / limit), 1),
    maxCases: CASE_BROWSE_FREE_CASES,
    limited: true,
    nextPageLocked: isBeyondFreeWindow(tier, page + 1, limit),
  };
}

/** 프론트가 이 벽을 식별하는 코드. 응답의 `error` 필드로 나간다. */
export const CASE_BROWSE_PAYWALL_CODE = 'CASE_BROWSE_PAYWALL';

/**
 * 402 Payment Required — 벽에 부딪혔을 때.
 *
 * 401/403 이 아니라 402 인 이유: 권한이 없는 게 아니라 요금제가 모자란 것이다.
 * 프론트가 로그인 만료(401)와 구분해서 업그레이드 화면을 띄울 수 있어야 한다.
 *
 * 식별자를 `error` 에 싣는 이유: 전역 예외 필터(AllExceptionsFilter)가 응답을
 * { statusCode, error, message, ... } 로 다시 짜면서 그 밖의 키는 버린다.
 * 여기에 freePages 같은 숫자를 넣어 봐야 클라이언트에 닿지 않는다 —
 * 숫자는 성공 응답의 meta.access 로 주고, 프론트도 같은 상수를 미러링한다.
 */
export class CaseBrowsePaywallException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: CASE_BROWSE_PAYWALL_CODE,
        message:
          `무료 회원은 치험례 목록을 ${CASE_BROWSE_FREE_PAGES}페이지(${CASE_BROWSE_FREE_CASES}건)까지 볼 수 있습니다.` +
          ` 전체 열람은 유료 요금제에서 가능합니다. 검색은 계속 무료로 쓰실 수 있습니다.`,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
