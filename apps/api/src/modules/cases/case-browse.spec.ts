import {
  clampListPaging,
  isBeyondFreeWindow,
  browseAccess,
  CASE_LIST_PAGE_SIZE_MAX,
  CASE_BROWSE_FREE_PAGES,
  CASE_BROWSE_FREE_CASES,
} from './case-browse';
import { SubscriptionTier } from '../../database/entities/user.entity';

/**
 * 목록 유료화의 경계를 고정한다.
 *
 * 여기서 검증하는 핵심은 "페이지 번호가 아니라 몇 번째 건인가로 막는다" 이다.
 * 페이지 번호로 막으면 limit 을 키우거나 줄이는 것만으로 그냥 넘어간다 —
 * 이 회귀는 화면에서 전혀 티가 나지 않고, 매출이 조용히 새는 형태로만 드러난다.
 */

const FREE = SubscriptionTier.FREE;
const PAID = SubscriptionTier.PROFESSIONAL;

describe('clampListPaging', () => {
  it('페이지 크기를 상한으로 자른다 — 이게 없으면 한 방에 전량이 나간다', () => {
    expect(clampListPaging(1, 10000).limit).toBe(CASE_LIST_PAGE_SIZE_MAX);
    expect(clampListPaging(1, 100).limit).toBe(CASE_LIST_PAGE_SIZE_MAX);
  });

  it('상한 이하는 그대로 둔다', () => {
    expect(clampListPaging(2, 5)).toEqual({ page: 2, limit: 5 });
  });

  it('쓰레기 값은 기본값으로 흡수한다', () => {
    expect(clampListPaging(0, 0)).toEqual({ page: 1, limit: CASE_LIST_PAGE_SIZE_MAX });
    expect(clampListPaging(-3, -1)).toEqual({ page: 1, limit: CASE_LIST_PAGE_SIZE_MAX });
    expect(clampListPaging('abc', undefined)).toEqual({
      page: 1,
      limit: CASE_LIST_PAGE_SIZE_MAX,
    });
  });
});

describe('isBeyondFreeWindow', () => {
  it(`무료 회원은 ${CASE_BROWSE_FREE_PAGES}페이지까지 넘긴다`, () => {
    expect(isBeyondFreeWindow(FREE, 1, 20)).toBe(false);
    expect(isBeyondFreeWindow(FREE, 3, 20)).toBe(false);
    expect(isBeyondFreeWindow(FREE, 4, 20)).toBe(true);
  });

  it('limit 을 줄여 잘게 넘겨도 같은 건수에서 멈춘다', () => {
    // limit=5 면 12페이지까지가 55~59번째 건, 13페이지가 60번째 건이다.
    expect(isBeyondFreeWindow(FREE, 12, 5)).toBe(false);
    expect(isBeyondFreeWindow(FREE, 13, 5)).toBe(true);
    // limit=1 이면 60번째 건이 61페이지다.
    expect(isBeyondFreeWindow(FREE, CASE_BROWSE_FREE_CASES, 1)).toBe(false);
    expect(isBeyondFreeWindow(FREE, CASE_BROWSE_FREE_CASES + 1, 1)).toBe(true);
  });

  it('유료 회원에게는 벽이 없다', () => {
    expect(isBeyondFreeWindow(PAID, 300, 20)).toBe(false);
    expect(isBeyondFreeWindow(SubscriptionTier.BASIC, 300, 20)).toBe(false);
    expect(isBeyondFreeWindow(SubscriptionTier.CLINIC, 300, 20)).toBe(false);
  });
});

describe('browseAccess', () => {
  it('무료 회원에게 벽의 위치를 알려 준다 — 부딪히기 전에 그리라고', () => {
    expect(browseAccess(FREE, 1, 20)).toEqual({
      maxPage: CASE_BROWSE_FREE_PAGES,
      maxCases: CASE_BROWSE_FREE_CASES,
      limited: true,
      nextPageLocked: false,
    });
  });

  it('마지막 무료 페이지에서 다음 페이지가 잠겼다고 알린다', () => {
    expect(browseAccess(FREE, CASE_BROWSE_FREE_PAGES, 20).nextPageLocked).toBe(true);
  });

  it('maxPage 는 limit 에 따라 달라진다 — 건수 한도가 진짜 한도이므로', () => {
    expect(browseAccess(FREE, 1, 5).maxPage).toBe(CASE_BROWSE_FREE_CASES / 5);
    expect(browseAccess(FREE, 1, 20).maxPage).toBe(CASE_BROWSE_FREE_PAGES);
  });

  it('유료 회원에게는 한도를 표시하지 않는다', () => {
    expect(browseAccess(PAID, 50, 20)).toEqual({
      maxPage: null,
      maxCases: null,
      limited: false,
      nextPageLocked: false,
    });
  });
});
