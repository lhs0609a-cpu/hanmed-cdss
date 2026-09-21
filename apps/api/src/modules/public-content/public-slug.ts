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

/** 공개 대상 고전 의안 7종. 새 책이 들어오면 여기 추가해야 공개된다. */
export const CLASSICAL_BOOKS: { hanja: string; korean: string }[] = [
  { hanja: '臨證指南醫案', korean: '임증지남의안' },
  { hanja: '王旭高臨證醫案', korean: '왕욱고임증의안' },
  { hanja: '也是山人醫案', korean: '야시산인의안' },
  { hanja: '吳鞠通醫案', korean: '오국통의안' },
  { hanja: '花韻樓醫案', korean: '화운루의안' },
  { hanja: '柳選四家醫案', korean: '유선사가의안' },
  { hanja: '得心集醫案', korean: '득심집의안' },
];

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

/**
 * 처방 주소. 이름을 그대로 쓰되 경로를 깨뜨리는 문자만 막는다.
 * 슬래시·물음표·공백이 들어간 이름은 공개하지 않는다 — 억지로 치환하면
 * 서로 다른 처방이 같은 주소를 갖게 된다.
 */
export function formulaSlug(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 64) return null;
  return /^[가-힣A-Za-z0-9()]+$/.test(trimmed) ? trimmed : null;
}
