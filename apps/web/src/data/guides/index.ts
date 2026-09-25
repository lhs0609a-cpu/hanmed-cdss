import type { Guide } from './types'
import { CHEOPYAK_GUIDES } from './cheopyak'

export type { Guide, GuideSection, GuideSource, GuideLink, GuideAudience } from './types'

/**
 * 검색해서 들어오는 글 전체.
 *
 * 묶음이 늘면 여기 한 줄을 더한다. 주제 지도는 docs/content-topics.md 에
 * 있다 — 여섯 묶음 약 830편이고, 어느 1차 출처를 보고 우리 어느 쪽으로
 * 연결할 것인지까지 적어 두었다.
 */
export const GUIDES: Guide[] = [...CHEOPYAK_GUIDES]

const BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]))

export const findGuide = (slug: string): Guide | null =>
  BY_SLUG.get(slug) ?? null

/** 묶음별로 모은 목록. 목록 화면과 프리렌더가 같은 것을 쓴다. */
export function guideClusters(): { cluster: string; guides: Guide[] }[] {
  const byCluster = new Map<string, Guide[]>()
  for (const g of GUIDES) {
    const list = byCluster.get(g.cluster) ?? []
    list.push(g)
    byCluster.set(g.cluster, list)
  }
  return [...byCluster.entries()].map(([cluster, guides]) => ({
    cluster,
    guides,
  }))
}

/**
 * 연결 링크를 실제 주소로 바꾼다.
 *
 * 화면과 프리렌더가 각자 주소를 만들면 언젠가 갈라진다. 한 곳에서만 만든다.
 */
export function guideLinkHref(link: {
  kind: string
  slug: string
  note?: string
}): string {
  // note 에 주소를 직접 적은 것은 목록 쪽처럼 슬러그가 없는 자리다.
  if (link.note?.startsWith('/')) return link.note
  const prefix: Record<string, string> = {
    formula: '/formulas',
    herb: '/herbs',
    case: '/cases',
    reference: '/references',
    journal: '/journals',
    guide: '/guides',
  }
  return `${prefix[link.kind] ?? '/guides'}/${encodeURIComponent(link.slug)}`
}
