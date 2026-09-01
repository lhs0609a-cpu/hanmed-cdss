import { ReactNode, useMemo } from 'react'
import DOMPurify from 'dompurify'

/**
 * 게시글 본문 렌더러.
 *
 * 원래 PostDetailPage 안에 '## ' 와 '- ' 만 처리하는 짧은 함수가 있었다.
 * 그래서 **굵게** 와 표가 기호 그대로 화면에 찍혔고, 붙여넣은 티가 났다.
 *
 * 라이브러리를 넣지 않고 직접 그리는 이유는 두 가지다.
 *  1. 필요한 문법이 좁다 — 제목·강조·목록·표·인용·링크·구분선이 전부다.
 *     react-markdown + remark-gfm 은 이 목적에 견줘 무겁고, 운영 번들까지 따라간다.
 *  2. dangerouslySetInnerHTML 을 쓰지 않는다. 전부 React 엘리먼트로 만들기
 *     때문에 본문이 무슨 글자를 담고 있든 텍스트 노드로 들어간다. 게시글은
 *     사용자가 쓰는 것이라 이 점이 중요하다.
 *
 * 표를 지원하는 이유: 첩약 본인부담률처럼 "한의원 30% / 한방병원 40% /
 * 종합병원 50%" 같은 것은 문장으로 늘어놓으면 읽히지 않는다. 진료 중에 훑는
 * 글이라 눈으로 짚이는 형태여야 한다.
 */

/** **굵게** 와 [글자](주소) 를 인라인으로 처리한다 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // 굵게와 링크를 한 번에 훑는다. 순서를 지키려면 하나의 정규식이어야 한다.
  const re = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-neutral-900">
          {m[2]}
        </strong>,
      )
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}-a${i}`}
          href={m[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline underline-offset-2 hover:text-blue-700 break-all"
        >
          {m[4]}
        </a>,
      )
    }
    last = m.index + m[0].length
    i += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes.length > 0 ? nodes : [text]
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l)
const isTableDivider = (l: string) => /^\s*\|[\s|:-]+\|\s*$/.test(l)
const cells = (l: string) =>
  l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

/**
 * HTML 로 저장된 글인가.
 *
 * 에디터를 리치 텍스트로 바꾸면서 저장 형식이 HTML 이 됐다. 그런데 이미 올라간
 * 시드 글 28편은 마크다운이다. 둘을 한 번에 변환하려다 깨뜨리는 것보다,
 * 읽는 쪽에서 나누는 편이 안전하다 — 변환은 되돌릴 수 없지만 분기는 언제든
 * 고칠 수 있다.
 *
 * 블록 태그가 있으면 HTML 로 본다. 마크다운 본문에 <br> 하나쯤 섞이는 일은
 * 있어도 <p>/<h2>/<ul> 로 문단이 짜여 있지는 않다.
 */
function looksLikeHtml(text: string): boolean {
  return /<(p|h[1-3]|ul|ol|blockquote|table|img|div)\b[^>]*>/i.test(text)
}

/**
 * 에디터가 만든 HTML 을 씻어서 그린다.
 *
 * 게시글은 사용자가 쓰는 것이라 script·onerror·javascript: 가 섞여 들어올 수
 * 있다. DOMPurify 로 걸러야 dangerouslySetInnerHTML 을 쓸 수 있다.
 * 허용 목록을 좁게 잡았다 — 에디터가 만들지 않는 태그는 받을 이유가 없다.
 */
function SafeHtml({ html }: { html: string }) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span',
          'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr',
          'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code', 'pre',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'style', 'colspan', 'rowspan'],
        // style 은 글꼴·글자색 때문에 남기되 위험한 값은 DOMPurify 가 거른다.
        ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|data:image\/)/i,
      }),
    [html],
  )
  return (
    <div
      className="ongo-post text-[15px] leading-[1.75] text-neutral-800"
      // 위에서 씻은 값만 들어간다.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}

export function PostContent({ text }: { text: string }) {
  if (looksLikeHtml(text)) return <SafeHtml html={text} />
  return <MarkdownContent text={text} />
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 표 — 헤더 + 구분선 + 본문 행
    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const header = cells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(cells(lines[i]))
        i += 1
      }
      out.push(
        // 좁은 화면에서 표가 본문을 밀어내지 않도록 가로 스크롤을 가둔다.
        <div key={`t${i}`} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-neutral-300">
                {header.map((h, k) => (
                  <th key={k} className="px-3 py-2 text-left font-semibold text-neutral-800">
                    {inline(h, `th${i}-${k}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-neutral-100">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 align-top text-neutral-700">
                      {inline(c, `td${i}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // 구분선
    if (/^\s*(-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
      out.push(<hr key={`h${i}`} className="my-5 border-neutral-200" />)
      i += 1
      continue
    }

    // 제목
    const h = /^(#{2,4})\s+(.*)$/.exec(line)
    if (h) {
      const size = h[1].length === 2 ? 'text-[17px]' : 'text-[15px]'
      out.push(
        <h3 key={`hd${i}`} className={`${size} mt-6 mb-2 font-bold text-neutral-900`}>
          {inline(h[2], `hd${i}`)}
        </h3>,
      )
      i += 1
      continue
    }

    // 인용 — 심의사례 원문처럼 "그대로 옮긴 문장" 을 눈에 띄게 가둔다
    if (/^\s*>\s?/.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ''))
        i += 1
      }
      out.push(
        <blockquote
          key={`q${i}`}
          className="my-4 border-l-[3px] border-neutral-300 bg-neutral-50 py-2 pl-4 pr-3 text-[14px] leading-relaxed text-neutral-700"
        >
          {quoted.map((q, k) => (
            <p key={k}>{inline(q, `q${i}-${k}`)}</p>
          ))}
        </blockquote>,
      )
      continue
    }

    // 글머리 목록
    if (/^\s*[-*·]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*·]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*·]\s+/, ''))
        i += 1
      }
      out.push(
        <ul key={`u${i}`} className="my-3 space-y-1.5 pl-1">
          {items.map((it, k) => (
            <li key={k} className="flex gap-2 text-[15px] leading-relaxed text-neutral-700">
              <span className="mt-[9px] h-1 w-1 flex-shrink-0 rounded-full bg-neutral-400" />
              <span>{inline(it, `u${i}-${k}`)}</span>
            </li>
          ))}
        </ul>,
      )
      continue
    }

    // 번호 목록
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i += 1
      }
      out.push(
        <ol key={`o${i}`} className="my-3 space-y-1.5 pl-1">
          {items.map((it, k) => (
            <li key={k} className="flex gap-2.5 text-[15px] leading-relaxed text-neutral-700">
              <span className="mt-[1px] flex-shrink-0 font-semibold text-neutral-400">
                {k + 1}
              </span>
              <span>{inline(it, `o${i}-${k}`)}</span>
            </li>
          ))}
        </ol>,
      )
      continue
    }

    // 빈 줄은 문단 간격으로만 쓰고 <br> 을 쌓지 않는다.
    if (line.trim() === '') {
      i += 1
      continue
    }

    out.push(
      <p key={`p${i}`} className="my-2.5 text-[15px] leading-[1.75] text-neutral-800">
        {inline(line, `p${i}`)}
      </p>,
    )
    i += 1
  }

  return <div>{out}</div>
}

export default PostContent
