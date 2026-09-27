/**
 * 한의사·한의대생이 검색해서 들어오는 글.
 *
 * 사이트의 근거 쪽 65,852개는 이미 답을 아는 사람이 찾아오는 자리다.
 * "작약감초탕" 을 아는 사람만 작약감초탕 쪽에 닿는다. "첩약 급여 대상
 * 질환" 을 검색하는 사람이 들어올 입구가 없어서 만든다.
 *
 * ── 이 구조가 왜 이렇게 생겼나 ──────────────────────────────────────
 *
 * 본문에 임상 주장을 쓰지 않는다. 쓸 수 있는 것은 두 종류뿐이다.
 *
 *   1. 제도·절차의 사실 — 반드시 1차 출처 링크와 확인한 날짜를 함께 적는다.
 *      수가·급여기준·개설 요건·입시 전형은 해마다 바뀐다. 날짜 없는 숫자는
 *      읽는 사람이 그대로 청구했다가 삭감되는 경로가 된다.
 *
 *   2. 우리가 가진 근거로 가는 길 — 처방·본초·의안·문헌 쪽으로 연결한다.
 *      "이 질환에는 OO탕을 쓴다" 라고 글이 말하지 않는다. 그 처방을 다룬
 *      문헌이 몇 편 있는지 보여주고 그리로 보낸다.
 *
 * 그래서 sections 는 문장을 담고, sources 와 links 가 그 문장이 선 자리를
 * 밝힌다. sources 가 빈 글은 만들지 않는다.
 */

/** 글이 서 있는 1차 출처. 없으면 그 문단을 쓰지 않는다. */
export interface GuideSource {
  label: string
  url: string
  /**
   * 우리가 이 출처를 마지막으로 확인한 날(YYYY-MM-DD).
   *
   * 발행일이 아니라 확인일이다. 고시는 조용히 바뀌므로 "우리가 언제
   * 봤는지" 가 읽는 사람에게 필요한 정보다.
   */
  checkedOn: string
}

/** 우리 근거 쪽으로 가는 길. 본문이 주장하는 대신 여기로 보낸다. */
export interface GuideLink {
  kind: 'formula' | 'herb' | 'case' | 'reference' | 'journal' | 'guide'
  /** 주소 조각. 예: 독활기생탕 → /formulas/독활기생탕 */
  slug: string
  label: string
  note?: string
}

export interface GuideSection {
  heading: string
  /** 문단들. 한 항목이 한 문단이다. */
  body: string[]
  /** 이 문단이 기대는 출처. 제도·숫자를 말하는 절에는 반드시 있어야 한다. */
  sources?: GuideSource[]
  links?: GuideLink[]
  /**
   * 읽는 사람이 손해를 볼 수 있는 지점. 눈에 띄게 그린다.
   * 예: 시범사업 대상이 아닌 질환을 대상인 줄 알고 청구하는 것.
   */
  caution?: string
}

export type GuideAudience =
  | '한의대생'
  | '개원준비'
  | '개원의'
  | '공보의'
  | '임상'

export interface Guide {
  slug: string
  title: string
  /** 검색 결과에 뜨는 한 줄. 제목을 되풀이하지 않는다. */
  description: string
  audience: GuideAudience
  /** 목록에서 묶는 이름. 예: 첩약 건강보험 */
  cluster: string
  /** 이 글을 마지막으로 손본 날. 사이트맵의 lastmod 가 된다. */
  updatedOn: string
  sections: GuideSection[]
  /** 글 전체가 기대는 출처. 절마다 붙는 것과 별개로 맨 아래 모아 보인다. */
  sources: GuideSource[]
}
