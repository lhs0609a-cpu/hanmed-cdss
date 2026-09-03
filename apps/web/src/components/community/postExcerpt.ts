/**
 * 목록 카드에 보일 한 줄 미리보기.
 *
 * 왜 필요했나: 카드에 post.content 를 그대로 넣고 있었다. 본문이 마크다운이라
 * 임상정보 글은 미리보기가 이렇게 나왔다.
 *
 *   | 항목 | 내용 | |---|---| | 근거 수준 | 분류 미상 | | 학술지 | ...
 *
 * 글이 무엇에 관한 것인지 한 글자도 알려주지 않는다. 표와 제목 기호를 걷어내고
 * 사람이 읽는 문장만 남긴다. 에디터로 쓴 글은 HTML 로 저장되므로 태그도 함께
 * 걷는다 — 그쪽은 미리보기에 &lt;p&gt; 가 찍히던 자리다.
 *
 * 본문을 고치지 않고 읽는 쪽에서만 걷어낸다. PostContent 가 같은 이유로
 * 마크다운과 HTML 을 읽는 쪽에서 갈라 그리는 것과 같다.
 */

/** 이 표기들은 눈에 띄라고 넣은 것인데, 한 줄로 눌리면 잡음만 된다. */
export function postExcerpt(content: string, max = 160): string {
  let t = content

  // HTML 로 저장된 글 — 블록 태그는 띄어쓰기로, 나머지는 지운다.
  if (/<[a-z][^>]*>/i.test(t)) {
    t = t
      .replace(/<(br|\/p|\/li|\/h[1-6]|\/tr|\/div)[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  }

  // 첫 소제목 앞까지가 이 글의 도입부다.
  //
  // 문헌 소개글은 "한 줄 요약 → ## 요약 → ## 서지정보" 로 짜여 있어서,
  // 그냥 이어 붙이면 "…완치되었다 요약 배경 담궐두통의 재발로…" 처럼
  // 제목이 문장에 끼어든다. 도입부가 한 줄을 채울 만큼 있으면 그것만 쓴다.
  const lead = t.split(/^\s*#{2,6}\s+/m)[0]
  if (lead.replace(/\s+/g, '').length >= 40) t = lead

  t = t
    // 표는 통째로 버린다. 셀만 남기면 "근거 수준 분류 미상 학술지" 처럼
    // 말이 안 되는 줄이 된다.
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    // 구분선·제목 기호·인용 기호
    .replace(/^\s*(-{3,}|_{3,}|\*{3,})\s*$/gm, ' ')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*>\s?/gm, '')
    // 목록 글머리
    .replace(/^\s*[-*·]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // 링크는 글자만 남긴다
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // 강조 기호
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t
}

export default postExcerpt
