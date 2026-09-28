/**
 * 한방 비급여 진료비 — 공개 주소와 표기.
 *
 * 심평원이 월 1회 공개하는 지역별 통계를 이미 받아서 DB 에 넣고 공개 API 까지
 * 열어 두었는데(`/public/nonpay-prices/*`), 색인되는 쪽이 한 장도 없었다.
 * 값을 가진 쪽이 검색에 없는 것은 자료를 안 가진 것과 같다.
 *
 * ── 왜 항목×지역 306쪽이 아니라 36쪽인가 ────────────────────────────
 *
 * 항목 17개에 지역 18개면 조합은 306개다. 그러나 조합 한 칸이 가진 고유한
 * 내용은 숫자 네 개뿐이고 나머지는 306쪽이 똑같이 나눠 갖는 껍데기다.
 * 그렇게 만든 쪽은 서로 유사문서가 되어 색인에서 함께 내려간다.
 *
 * 대신 한 쪽이 한 축을 통째로 들게 한다. 항목 쪽은 그 항목의 18개 지역을
 * 모두 표로 들고, 지역 쪽은 그 지역의 17개 항목을 모두 든다. "추나요법 비용
 * 서울" 로 찾아온 사람은 추나요법 쪽에서 서울 행을 보고, 옆 지역과 견줄
 * 수도 있다 — 조합 쪽보다 오히려 더 많이 준다.
 *
 * 주소는 한글을 그대로 쓴다. 처방·본초와 같은 이유다 — 검색하는 사람이
 * "추나요법" 이라고 치는데 주소가 chuna-therapy 면 한 글자도 겹치지 않는다.
 */

export interface NonPayItem {
  code: string
  name: string
  category: string
  min: number | null
  median: number | null
  average: number | null
  max: number | null
}

export interface NonPayRegionResult {
  region: string
  regionName: string
  appliedOn: string | null
  items: NonPayItem[]
}

export interface NonPayRegion {
  code: string
  name: string
}

/**
 * 항목 이름에서 주소로 쓸 수 있는 글자.
 *
 * 실제 항목에 나오는 것은 한글·영문(QSCCII)·숫자·괄호·쉼표·공백뿐이다.
 * 슬래시나 물음표가 든 이름이 들어오면 주소를 주지 않는다 — 억지로 치환하면
 * 서로 다른 항목이 같은 주소를 갖는다.
 */
const ITEM_PATTERN = /^[가-힣A-Za-z0-9()][가-힣A-Za-z0-9(), -]*$/
const ITEM_MAX_LENGTH = 120

/**
 * 항목 주소. 심평원은 대분류와 세부를 가운뎃점으로 잇는다
 * ("추나요법 · 단순추나"). 가운뎃점은 치기도 검색하기도 어려운 글자라
 * 붙임표로 바꾼다 — 그 한 글자 말고는 이름을 건드리지 않는다.
 */
export function nonpayItemSlug(name: string): string | null {
  const joined = name.replace(/\s*·\s*/g, '-').trim()
  if (!joined || joined.length > ITEM_MAX_LENGTH) return null
  // 마침표로 끝나는 이름은 윈도에서 폴더가 되지 못한다 — 프리렌더가 선다.
  if (joined.endsWith('.')) return null
  return ITEM_PATTERN.test(joined) ? joined : null
}

/** 지역 주소. 이름이 모두 짧은 한글이라 그대로 쓴다(전국·서울·충북…). */
export function nonpayRegionSlug(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 20) return null
  return /^[가-힣]+$/.test(trimmed) ? trimmed : null
}

export const nonpayItemHref = (slug: string) =>
  `/nonpay/${encodeURIComponent(slug)}`

export const nonpayRegionHref = (slug: string) =>
  `/nonpay/지역/${encodeURIComponent(slug)}`

/** 금액 표기. 값이 없으면 지어내지 않고 줄표를 둔다. */
export const won = (n: number | null): string =>
  n === null || n === undefined ? '—' : `${n.toLocaleString('ko-KR')}원`

/** 20260905 → 2026-09-05. 자료가 언제 기준인지는 금액만큼 중요하다. */
export function appliedOnLabel(appliedOn: string | null): string | null {
  if (!appliedOn || !/^\d{8}$/.test(appliedOn)) return null
  return `${appliedOn.slice(0, 4)}-${appliedOn.slice(4, 6)}-${appliedOn.slice(6, 8)}`
}

export const HIRA_NONPAY_URL = 'https://www.hira.or.kr/npay/index.do'

/**
 * 지역별 응답들을 항목 축으로 뒤집는다.
 *
 * 원 API 는 지역 하나를 물으면 그 지역의 항목 전부를 준다. 항목 쪽은 그
 * 반대가 필요하다 — 항목 하나에 지역 전부. 화면과 프리렌더가 각자 뒤집으면
 * 언젠가 갈라지므로 한 곳에서만 뒤집는다.
 */
export interface NonPayItemView {
  code: string
  name: string
  slug: string
  category: string
  rows: Array<{ regionCode: string; regionName: string; stat: NonPayItem }>
}

export function byItem(results: NonPayRegionResult[]): NonPayItemView[] {
  const views = new Map<string, NonPayItemView>()
  for (const result of results) {
    for (const item of result.items) {
      const slug = nonpayItemSlug(item.name)
      if (!slug) continue
      const view = views.get(item.code) ?? {
        code: item.code,
        name: item.name,
        slug,
        category: item.category,
        rows: [],
      }
      view.rows.push({
        regionCode: result.region,
        regionName: result.regionName,
        stat: item,
      })
      views.set(item.code, view)
    }
  }
  // 전국이 먼저, 그다음은 받은 순서 그대로. 심평원이 주는 지역 순서가
  // 곧 시도 코드 순서라 우리가 다시 정렬할 이유가 없다.
  return [...views.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}
