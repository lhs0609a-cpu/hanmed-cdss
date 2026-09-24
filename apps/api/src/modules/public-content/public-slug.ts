/**
 * 공개 페이지 주소.
 *
 * 한글을 그대로 쓴다. 검색하는 사람이 "임증지남의안" 이라고 치는데 주소가
 * imjeung-jinam-uian 이면 주소와 질의가 한 글자도 겹치지 않는다. 브라우저는
 * 퍼센트 인코딩해 보내고 구글은 디코딩해서 보여준다.
 *
 * 고전 치험례의 sourceId 는 `jicheng-{한문서명}-{번호}` 꼴이다. 한문 서명을
 * 그대로 주소에 쓰면 한국어 검색과 안 맞아서 한글 독음으로 바꾼다. 번호는
 * 책 안에서만 유일하므로 책 이름 없이 번호만 쓰면 3,479건이 2,352개로
 * 뭉개진다 — 반드시 책과 함께 써야 한다.
 */

/**
 * 공개 대상 고전 의안. 새 책이 들어오면 여기 추가해야 공개된다.
 *
 * 이 목록이 곧 공개 조건이다. 예전에는 `sourceEdition`(어느 영인본에서 왔는지)
 * 이 채워져 있는지로 걸렀는데, 그 칸은 원 자료가 알려줄 때만 채워진다.
 * 책 열한 종 4,391건은 저자와 연도가 멀쩡히 있는데도 영인본 표기가 없다는
 * 이유만으로 잠겨 있었다 — 자료의 값어치가 아니라 원 자료의 기록 습관을
 * 기준으로 삼은 셈이다.
 *
 * 그래서 기준을 사람이 확인한 목록으로 옮긴다. 여기 적힌 저자와 연도는
 * 원 자료(jicheng_cases.json)가 들고 있던 값이다. 원 자료가 저자를 비워 둔
 * 책은 여기 없다 — 서명에서 저자를 짐작해 적어 넣지 않는다. 확인되면 그때
 * 한 줄 늘린다.
 */
export type ClassicalBook = {
  hanja: string;
  korean: string;
  /** 저자. 원 자료가 기록한 값만 적는다. */
  author: string;
  /** 편찬·간행 연도. 원 자료가 모르는 책은 null. */
  year: number | null;
};

export const CLASSICAL_BOOKS: ClassicalBook[] = [
  { hanja: '臨證指南醫案', korean: '임증지남의안', author: '葉桂', year: 1746 },
  { hanja: '王旭高臨證醫案', korean: '왕욱고임증의안', author: '王旭高', year: 1644 },
  { hanja: '也是山人醫案', korean: '야시산인의안', author: '也是山人', year: null },
  { hanja: '吳鞠通醫案', korean: '오국통의안', author: '吳塘', year: 1798 },
  { hanja: '花韻樓醫案', korean: '화운루의안', author: '顧蔓雲', year: 1850 },
  { hanja: '柳選四家醫案', korean: '유선사가의안', author: '柳寶詒', year: 1882 },
  { hanja: '得心集醫案', korean: '득심집의안', author: '謝星煥', year: 1861 },
  { hanja: '張聿青醫案', korean: '장율청의안', author: '張聿青', year: 1897 },
  { hanja: '丁甘仁醫案', korean: '정감인의안', author: '丁甘仁', year: 1927 },
  { hanja: '邵蘭蓀醫案', korean: '소란손의안', author: '邵蘭蓀', year: 1937 },
  { hanja: '葉氏醫案存真', korean: '엽씨의안존진', author: '葉桂', year: 1836 },
  { hanja: '劍慧草堂醫案', korean: '검혜초당의안', author: '臥雲山人', year: null },
  { hanja: '松心醫案筆記', korean: '송심의안필기', author: '繆遵義', year: 1797 },
];

/**
 * 공개 대상 sourceId 를 한 줄로 가려내는 정규식.
 *
 * 질의에서 걸러야 한다. 읽어 온 뒤 자바스크립트로 책을 확인하면 total 은
 * 7,920 을 말하는데 실제로 받는 것은 5,000 이 되고, 한 쪽에 20건을 달라
 * 했는데 13건이 온다. total 을 믿고 쪽을 넘기는 쪽은 끝까지 채우지 못해
 * 멈추지 않는다 — 처방 이름에서 이미 겪은 일이다.
 */
export const CASE_SOURCE_ID_PATTERN = `^jicheng-(${CLASSICAL_BOOKS.map(
  (b) => b.hanja,
).join('|')})-[0-9]+$`;

const BY_HANJA = new Map(CLASSICAL_BOOKS.map((b) => [b.hanja, b]));
const BY_KOREAN = new Map(CLASSICAL_BOOKS.map((b) => [b.korean, b]));

/** sourceId → 공개 주소 조각. 모르는 책이면 null — 공개하지 않는다. */
export function caseSlug(sourceId: string): string | null {
  const parts = sourceId.split('-');
  if (parts.length !== 3 || parts[0] !== 'jicheng') return null;
  const book = BY_HANJA.get(parts[1]);
  if (!book || !/^\d+$/.test(parts[2])) return null;
  return `${book.korean}-${parts[2]}`;
}

/** 공개 주소 조각 → sourceId. 조작된 주소로 다른 기록을 긁지 못하게 한다. */
export function parseCaseSlug(slug: string): string | null {
  const at = slug.lastIndexOf('-');
  if (at <= 0) return null;
  const book = BY_KOREAN.get(slug.slice(0, at));
  const number = slug.slice(at + 1);
  if (!book || !/^\d{1,9}$/.test(number)) return null;
  return `jicheng-${book.hanja}-${number}`;
}

/** 책 한글 이름 — 화면 제목과 출처 표기에 쓴다. */
export function bookKorean(sourceId: string): string | null {
  return BY_HANJA.get(sourceId.split('-')[1])?.korean ?? null;
}

/** 책 서지 — 영인본 표기가 없는 책의 출처 줄을 이걸로 채운다. */
export function bookOf(sourceId: string): ClassicalBook | null {
  return BY_HANJA.get(sourceId.split('-')[1]) ?? null;
}

/**
 * 화면에 적을 출처 한 줄.
 *
 * 영인본 표기가 있으면 그것이 가장 정확하다 — 어느 판본을 읽었는지까지
 * 말해 준다. 없으면 저자와 연도로 적는다. 둘 다 없이 "출처: —" 로 비워
 * 두면 문헌 기록이 아니라 출처 불명의 글이 된다.
 */
export function sourceLine(
  sourceId: string,
  sourceEdition: string | null,
): string | null {
  if (sourceEdition) return sourceEdition;
  const book = bookOf(sourceId);
  if (!book) return null;
  return book.year ? `${book.author}, ${book.year}` : book.author;
}

/**
 * 주소에 그대로 쓸 수 있는 처방 이름의 조건.
 *
 * 정규식을 문자열로 둔 것은 같은 규칙을 SQL 에서도 써야 하기 때문이다.
 * 질의는 규칙을 모른 채 세고 나중에 자바스크립트로 걸러 내면, total 은
 * 404 라고 하는데 실제로 받는 것은 386 이 된다. 그 숫자를 믿는 쪽은
 * 끝나지 않는 쪽 넘기기를 돌고, 보는 사람은 콘텐츠가 빠졌다고 읽는다.
 *
 * 이 규칙에서 빠지는 것은 name 칼럼에 한글 독음 대신 한자가 들어간 행들이다
 * (白虎湯 등 18건). 모두 한글 이름을 가진 같은 처방이 따로 있으므로,
 * 빠뜨리는 콘텐츠는 없다.
 */
export const FORMULA_NAME_PATTERN = '^[가-힣A-Za-z0-9()]+$';
export const FORMULA_NAME_MAX_LENGTH = 64;

/**
 * 처방 주소. 이름을 그대로 쓰되 경로를 깨뜨리는 문자만 막는다.
 * 슬래시·물음표·공백이 들어간 이름은 공개하지 않는다 — 억지로 치환하면
 * 서로 다른 처방이 같은 주소를 갖게 된다.
 */
export function formulaSlug(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > FORMULA_NAME_MAX_LENGTH) return null;
  return new RegExp(FORMULA_NAME_PATTERN).test(trimmed) ? trimmed : null;
}

/**
 * 본초 주소. 표준 약재명을 그대로 쓴다 — "당귀 효능" 으로 검색하는 사람과
 * 주소가 같은 글자를 공유한다.
 *
 * 636종 중 규칙에서 빠지는 것은 이름에 공백·쉼표가 든 한 건뿐이다.
 * 억지로 치환하지 않는다 — 서로 다른 약재가 같은 주소를 갖게 된다.
 */
export const HERB_NAME_PATTERN = '^[가-힣A-Za-z0-9()]+$';
export const HERB_NAME_MAX_LENGTH = 64;

export function herbSlug(standardName: string): string | null {
  const trimmed = standardName.trim();
  if (!trimmed || trimmed.length > HERB_NAME_MAX_LENGTH) return null;
  return new RegExp(HERB_NAME_PATTERN).test(trimmed) ? trimmed : null;
}

/**
 * 논문 주소. 제목이 아니라 출처와 원 식별자를 쓴다.
 *
 * 한글 제목을 주소에 넣고 싶은 유혹이 있다 — 의안과 처방은 그렇게 했다.
 * 논문은 다르다. 제목이 100자를 넘고, 같은 제목이 학술지와 초록집에 따로
 * 올라오며, 오탈자 수정으로 제목이 바뀐다. 주소가 바뀌면 색인이 처음부터
 * 다시 쌓인다. PMID 와 KCI 논문 ID 는 원 출처가 영구 보장하는 식별자다.
 *
 * 검색어와의 접점은 주소가 아니라 제목 태그가 맡는다 — 구글이 실제로
 * 맞춰 보는 것은 <title> 과 본문이다.
 */
export const REFERENCE_SOURCES = ['pubmed', 'kci'] as const;
export type PublicReferenceSource = (typeof REFERENCE_SOURCES)[number];

const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export function referenceSlug(
  source: string,
  externalId: string,
): string | null {
  if (!(REFERENCE_SOURCES as readonly string[]).includes(source)) return null;
  if (!EXTERNAL_ID_PATTERN.test(externalId)) return null;
  return `${source}-${externalId}`;
}

/** 공개 주소 조각 → {source, externalId}. 조작된 주소를 막는다. */
export function parseReferenceSlug(
  slug: string,
): { source: PublicReferenceSource; externalId: string } | null {
  const at = slug.indexOf('-');
  if (at <= 0) return null;
  const source = slug.slice(0, at);
  const externalId = slug.slice(at + 1);
  if (!(REFERENCE_SOURCES as readonly string[]).includes(source)) return null;
  if (!EXTERNAL_ID_PATTERN.test(externalId)) return null;
  return { source: source as PublicReferenceSource, externalId };
}

/**
 * 학술지 주소.
 *
 * 왜 학술지인가 — 한의사는 "대한한방내과학회지" 를 통째로 검색한다. 논문 한
 * 편씩만 두면 그 검색어에 닿을 쪽이 없다. 학술지 이름은 KCI·PubMed 가 준
 * 문자열을 그대로 쓴다. 우리가 지어내는 이름이 아니다.
 *
 * 처방·본초와 달리 공백을 막지 않는다 — 영문 학술지 이름은 공백이 본래
 * 일부라서, 막으면 절반이 주소를 못 갖는다. 대신 앞뒤 공백이 붙은 이름은
 * 거른다. 그대로 두면 "Phytotherapy Research" 와 " Phytotherapy Research"
 * 가 서로 다른 두 쪽이 되어 같은 목록을 두 번 만든다.
 *
 * 쌍점(:)은 막는다. PubMed 의 긴 학술지명에 흔히 들어 있는데("Phytomedicine :
 * international journal of ..."), 프리렌더가 주소마다 폴더를 만들기 때문에
 * 윈도에서 폴더 이름에 쓸 수 없는 글자가 섞이면 빌드가 그 자리에서 선다.
 * 실제로 세웠다 — 그 학술지는 허브를 갖지 않을 뿐, 논문 쪽은 그대로 있다.
 */
export const JOURNAL_NAME_PATTERN =
  "^[가-힣A-Za-z0-9()&.,'-][가-힣A-Za-z0-9()&.,' -]*$";
export const JOURNAL_NAME_MAX_LENGTH = 120;

/** 허브를 만들 최소 편수. 두세 편짜리 목록은 읽을 것이 없다. */
export const JOURNAL_MIN_PAPERS = 5;

export function journalSlug(journal: string): string | null {
  if (journal !== journal.trim()) return null;
  if (!journal || journal.length > JOURNAL_NAME_MAX_LENGTH) return null;
  // 마침표로 끝나는 이름도 윈도에서 폴더가 되지 못한다("Medicine." 꼴).
  if (journal.endsWith('.')) return null;
  return new RegExp(JOURNAL_NAME_PATTERN).test(journal) ? journal : null;
}
