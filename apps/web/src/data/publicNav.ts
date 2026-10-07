/**
 * 공개 자료로 들어가는 입구.
 *
 * 홈 푸터와 공개 쪽 푸터가 같은 목록을 본다. 예전에는 LandingPage.tsx 안에만
 * 있었고, 그래서 홈을 벗어나는 순간 이 입구가 통째로 사라졌다 — 검색으로
 * 치험례 한 건에 들어온 사람에게 남은 링크는 가입과 로그인 둘뿐이었다.
 *
 * 프리렌더도 같은 목록을 들고 있다(scripts/page-builders.mjs 의 PUBLIC_NAV).
 * 빌드 스크립트는 TS 를 바로 읽지 못해 한 벌이 더 있는 것이고, 둘이 갈라지면
 * 크롤러가 받는 쪽과 사람이 보는 쪽이 달라진다 — 고칠 때는 같이 고친다.
 */
export const PUBLIC_NAV: readonly (readonly [string, string])[] = [
  ['/cases', '고전 의안'],
  ['/formulas', '처방 사전'],
  ['/herbs', '본초 사전'],
  ['/references', '한의학 문헌'],
  ['/journals', '학술지별 문헌'],
  ['/topics', '주제별 문헌'],
  ['/guides', '한의사 가이드'],
  ['/nonpay', '한방 비급여 가격'],
  ['/sick-codes', '한의과 상병코드'],
] as const
