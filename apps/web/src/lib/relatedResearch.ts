/**
 * 처방·본초에 걸리는 논문 찾기.
 *
 * "작약감초탕 논문" 은 한의사가 실제로 치는 말인데, 그 검색어에 닿을 쪽이
 * 없었다. 처방 쪽은 출전과 주치만 말하고, 논문 쪽은 4만 건이 목록 페이징
 * 뒤에 숨어 있었다. 둘을 이어 붙이면 처방 쪽이 두꺼워지고, 동시에 4만 개
 * 논문 쪽으로 걸어 들어갈 길이 생긴다 — 지금은 스무 건씩 넘기는 목록
 * 말고는 닿을 방법이 없어서 깊은 쪽은 크롤러가 오지 않는다.
 *
 * 짝짓기는 빌드 때 한 번만 한다. 같은 일을 DB 에 시키면 LIKE '%이름%' 가
 * 4만 행을 훑어 24초가 걸렸다 — 인증 없는 경로에 둘 수 있는 질의가 아니다.
 * 프리렌더는 어차피 논문 전부를 손에 들고 있으므로 거기서 맞춘다.
 */

export type RelatedPaper = {
  slug: string
  title: string
  evidenceType: string
  publishedYear: number | null
  journal: string | null
}

/** 한 쪽에 싣는 최대 편수. 더 보고 싶으면 문헌 쪽으로 간다. */
export const RELATED_LIMIT = 8

/**
 * 근거가 무거운 것부터 보여준다.
 *
 * 체계적 고찰 한 편과 동물실험 한 편을 발표연도만으로 줄 세우면 목록이
 * 거짓말을 한다. 한의사가 맨 위 세 줄만 보고 판단해도 틀리지 않게 한다.
 */
const EVIDENCE_RANK: Record<string, number> = {
  systematic_review: 0,
  guideline: 1,
  rct: 2,
  observational: 3,
  case_report: 4,
  review: 5,
  unknown: 6,
}

type PaperLike = {
  slug: string
  source: string
  title: string
  titleKo?: string | null
  summaryKo?: string | null
  evidenceType: string
  publishedYear: number | null
  journal: string | null
}

const toRelated = (paper: PaperLike): RelatedPaper => ({
  slug: paper.slug,
  title: paper.titleKo ?? paper.title,
  evidenceType: paper.evidenceType,
  publishedYear: paper.publishedYear,
  journal: paper.journal,
})

const byWeight = (a: PaperLike, b: PaperLike) => {
  const rank =
    (EVIDENCE_RANK[a.evidenceType] ?? 9) - (EVIDENCE_RANK[b.evidenceType] ?? 9)
  if (rank !== 0) return rank
  return (b.publishedYear ?? 0) - (a.publishedYear ?? 0)
}

/**
 * 처방 이름이 주소에 쓸 수 있고 논문 제목에서 찾아도 되는 모양인가.
 *
 * 두 글자 이름은 쓰지 않는다. 처방명은 대개 세 글자를 넘고(보중익기탕),
 * 두 글자짜리는 일상어와 겹쳐 엉뚱한 논문을 끌어온다.
 */
export const isSearchableFormulaName = (name: string) =>
  /^[가-힣]{3,}$/.test(name.trim())

/**
 * 본초는 이름이 아니라 학명으로 찾는다.
 *
 * 한글 약재명을 제목에서 찾으면 동음이의어가 쏟아진다 — 실제로 재 보니
 * 대조(大棗)가 "대조군" 3,634편, 남성(南星)이 "남성" 1,125편, 건강(乾薑)이
 * "건강" 725편, 주사(朱砂)가 "주사" 248편을 끌어왔다. 그대로 실으면 대조
 * 쪽이 대조군 논문 목록이 된다.
 *
 * 학명은 겹치지 않는다. 명명자와 이명이 줄줄이 붙어 있으므로 속명과
 * 종소명 두 낱말만 뗀다.
 */
export function scientificBinomial(scientificName: string | null): string | null {
  if (!scientificName) return null
  const match = scientificName.replace(/\s+/g, ' ').trim().match(/^[A-Z][a-z]+ [a-z]+/)
  // 속명만 쓰면 같은 속의 다른 약재까지 한 묶음이 된다. 종소명까지 있어야 한다.
  return match ? match[0] : null
}

/**
 * 처방 이름이 제목에 나오는 논문. 출처가 한국어로 준 제목만 본다.
 *
 * 기계가 만든 한국어는 쓰지 않는다. 처방명을 틀리기 때문이다 — 실제로
 * PMID 34713840 은 Xiao Yao San(소요산) 연구인데 우리 요약이 그것을
 * "작약감초탕" 이라고 적어 두었다. 그 요약을 믿고 짝을 지으면 작약감초탕
 * 쪽에 소요산 논문이 근거처럼 실린다.
 *
 * 그래서 두 가지를 뺀다.
 *   - summaryKo: 전부 기계가 쓴 것이다.
 *   - PubMed 의 titleKo: 원자료에 한국어 제목이 없으므로 기계번역이다
 *     (10,508건). KCI 의 titleKo 18,815건만 출처가 준 한국어 원제다.
 *
 * 덜 걸리는 쪽을 골랐다. 처방 쪽에 실리는 목록은 한의사가 근거로 읽는
 * 자리이고, 틀린 한 줄이 맞는 열 줄보다 비싸다.
 */
export function papersForFormula(name: string, papers: PaperLike[]): RelatedPaper[] {
  if (!isSearchableFormulaName(name)) return []
  const needle = name.trim()
  return papers
    .filter((p) => p.source === 'kci' && (p.titleKo ?? '').includes(needle))
    .sort(byWeight)
    .slice(0, RELATED_LIMIT)
    .map(toRelated)
}

/**
 * 학명이 제목에 나오는 논문. 원제는 영문이라 대소문자를 가리지 않는다.
 *
 * 처방과 달리 기계번역을 걱정하지 않아도 된다 — 학명은 번역되지 않고
 * 원제에 그대로 실린다.
 */
export function papersForHerb(
  scientificName: string | null,
  papers: PaperLike[],
): RelatedPaper[] {
  const binomial = scientificBinomial(scientificName)
  if (!binomial) return []
  const needle = binomial.toLowerCase()
  return papers
    .filter((p) => p.title.toLowerCase().includes(needle))
    .sort(byWeight)
    .slice(0, RELATED_LIMIT)
    .map(toRelated)
}
