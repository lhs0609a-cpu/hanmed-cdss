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

/**
 * 같은 입구에 "거기에 무엇이 있는가" 를 붙인 것.
 *
 * 링크 이름만 있는 목록은 사람에게도 로봇에게도 아무 말을 하지 않는다.
 * 2026-10-22 에 Yeti 로 홈을 받아 보니 본문이 178자였고, 네이버 색인에
 * 잡힌 우리 주소는 홈 하나였다 — 색인은 됐는데 노출될 내용이 없었다.
 *
 * key 는 프리렌더가 굽는 `data/public-counts.json` 의 열쇠와 같아야 한다.
 * 수는 빌드 때 실제로 센 것이고, 없으면 수 없이 그린다.
 *
 * 프리렌더도 같은 목록을 들고 있다(scripts/page-builders.mjs). 고칠 때는
 * 같이 고친다 — 갈라지면 크롤러가 받는 쪽과 사람이 보는 쪽이 달라진다.
 */
export interface PublicDataEntry {
  key: string
  href: string
  label: string
  desc: string
}

export const PUBLIC_DATA: readonly PublicDataEntry[] = [
  { key: 'cases', href: '/cases', label: '고전 의안', desc: '조선·청대 의안의 주소증·변증·처방·경과를 원문과 함께 봅니다' },
  { key: 'formulas', href: '/formulas', label: '처방 사전', desc: '출전과 주치, 구성 본초, 그 처방을 다룬 문헌으로 이어집니다' },
  { key: 'herbs', href: '/herbs', label: '본초 사전', desc: '대한민국약전 기준 기원·성미·귀경과 배합례입니다' },
  { key: 'references', href: '/references', label: '한의학 문헌', desc: 'KCI·PubMed 에서 모은 한의학 논문입니다' },
  { key: 'journals', href: '/journals', label: '학술지별 문헌', desc: '학술지 단위로 모아 봅니다' },
  { key: 'topics', href: '/topics', label: '주제별 문헌', desc: '상병·처방·시술 주제로 묶어 봅니다' },
  { key: 'guides', href: '/guides', label: '한의사 가이드', desc: '첩약 급여·개원 절차·청구·비급여를 1차 출처와 확인일을 달아 정리했습니다' },
  { key: 'nonpay', href: '/nonpay', label: '한방 비급여 가격', desc: '심평원 공개 신고값을 항목·지역별로 봅니다' },
  { key: 'sick', href: '/sick-codes', label: '한의과 상병코드', desc: '청구에 쓸 코드를 분류와 세부로 갈라 찾습니다' },
] as const
