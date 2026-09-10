import {
  DEMO_FEATURES,
  DEMO_CASE_VIEW_LIMIT,
  FeatureKey,
  PLAN_FEATURES,
  canUseFeature,
  featuresFor,
} from '../../database/entities/plan-features';
import { SubscriptionTier } from '../../database/entities/user.entity';
import { browseAccess, isBeyondFreeWindow } from './case-browse';

const FREE = SubscriptionTier.FREE;
const CLINIC = SubscriptionTier.CLINIC;

/**
 * 체험(데모) 범위를 지키는 테스트.
 *
 * 여기서 지키려는 것은 두 가지다.
 *
 * 하나, 체험 계정은 계정 하나를 모든 방문자가 나눠 쓴다. 그런데 free 티어에
 * 환자 명부가 열려 있어서 체험해 본 사람이 넣은 환자 정보를 다음 방문자가
 * 그대로 봤다(환자 14명·진료기록 13건이 나흘에 걸쳐 쌓였다). 이 테스트는
 * 그 문이 다시 열리지 않게 한다.
 *
 * 둘, 체험이 free 와 같으면 가입할 이유가 없다. 체험은 좁아야 한다.
 */
describe('체험 계정 기능 범위', () => {
  it('환자 명부는 체험에서 절대 열리지 않는다 — 공유 계정이라 남의 기록이 보인다', () => {
    expect(DEMO_FEATURES.has(FeatureKey.PATIENT_MANAGEMENT)).toBe(false);
    expect(canUseFeature(FREE, FeatureKey.PATIENT_MANAGEMENT, true)).toBe(false);
    // 티어를 아무리 올려도 체험이면 닫혀 있다.
    expect(canUseFeature(CLINIC, FeatureKey.PATIENT_MANAGEMENT, true)).toBe(false);
  });

  it('체험은 free 보다 좁다 — 같으면 가입할 이유가 없다', () => {
    const free = PLAN_FEATURES[FREE];
    for (const key of DEMO_FEATURES) {
      // 체험이 여는 것은 모두 free 에도 있어야 한다. 가입하면 좁아지는 일은 없다.
      expect(free.has(key)).toBe(true);
    }
    expect(DEMO_FEATURES.size).toBeLessThan(free.size);
  });

  it('핵심 한 줄기는 열려 있다 — 증상에서 처방과 근거까지', () => {
    for (const key of [
      FeatureKey.SYMPTOM_SEARCH,
      FeatureKey.DIAGNOSIS,
      FeatureKey.PRESCRIPTION_RECOMMEND,
      FeatureKey.CASE_SEARCH,
    ]) {
      expect(canUseFeature(FREE, key, true)).toBe(true);
    }
  });

  it('적색신호는 함께 열린다 — 추천만 보여주고 안전 경고를 가리면 위험해진다', () => {
    expect(canUseFeature(FREE, FeatureKey.RED_FLAG, true)).toBe(true);
  });

  it('커뮤니티·침구·한약재·AI 챗봇은 잠긴다', () => {
    for (const key of [
      FeatureKey.COMMUNITY,
      FeatureKey.ACUPOINTS,
      FeatureKey.HERBS_PUBLIC,
      FeatureKey.AI_CHAT,
    ]) {
      expect(canUseFeature(FREE, key, true)).toBe(false);
    }
  });

  it('유료 기능은 당연히 잠긴다', () => {
    for (const key of [
      FeatureKey.CASE_BROWSE_UNLIMITED,
      FeatureKey.CASE_EXPORT,
      FeatureKey.STATS_BASIC,
      FeatureKey.INSURANCE_CLAIM,
    ]) {
      expect(canUseFeature(CLINIC, key, true)).toBe(false);
    }
  });

  it('체험이 아니면 티어 매트릭스를 그대로 쓴다', () => {
    expect(featuresFor(FREE, false)).toBe(PLAN_FEATURES[FREE]);
    expect(featuresFor(CLINIC, false)).toBe(PLAN_FEATURES[CLINIC]);
  });
});

describe('체험 계정 치험례 열람 한도', () => {
  it(`체험은 ${DEMO_CASE_VIEW_LIMIT}건까지만 넘길 수 있다`, () => {
    // 10건 페이지 기준: 1페이지는 되고 2페이지부터 벽이다.
    expect(isBeyondFreeWindow(FREE, 1, DEMO_CASE_VIEW_LIMIT, true)).toBe(false);
    expect(isBeyondFreeWindow(FREE, 2, DEMO_CASE_VIEW_LIMIT, true)).toBe(true);
  });

  it('체험 한도는 무료 회원 한도보다 좁다', () => {
    const demo = browseAccess(FREE, 1, 10, true);
    const free = browseAccess(FREE, 1, 10, false);
    expect(demo.maxCases).toBe(DEMO_CASE_VIEW_LIMIT);
    expect(demo.maxCases!).toBeLessThan(free.maxCases!);
    expect(demo.limited).toBe(true);
  });

  it('체험이면 티어가 높아도 무제한이 되지 않는다', () => {
    const access = browseAccess(CLINIC, 1, 10, true);
    expect(access.limited).toBe(true);
    expect(access.maxCases).toBe(DEMO_CASE_VIEW_LIMIT);
  });

  it('체험이 아니면 지금까지의 동작이 그대로다', () => {
    expect(browseAccess(CLINIC, 1, 10).limited).toBe(false);
    expect(browseAccess(FREE, 1, 10).limited).toBe(true);
  });
});
