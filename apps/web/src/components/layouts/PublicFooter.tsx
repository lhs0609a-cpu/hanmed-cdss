import { Link } from 'react-router-dom'
import { PUBLIC_NAV } from '@/data/publicNav'
import './public-footer.css'

/**
 * 공개 쪽(의안·처방·본초·문헌·주제·가이드·비급여·상병)의 푸터.
 *
 * 이 쪽들은 레이아웃 없이 RouteBoundary 하나로만 감싸여 있었다. 그래서
 * 푸터가 없었고, 검색으로 상세 쪽에 들어오면 내부 링크가 /register 와
 * /login 둘뿐이었다 — 사람은 돌아갈 데가 없고, 크롤러에게는 7만 쪽이
 * 전부 막다른 길이었다.
 *
 * 홈 푸터와 같은 목록(PUBLIC_NAV)을 쓴다. 프리렌더가 굽는 HTML 도 같은
 * 것을 담는다(page-builders.mjs 의 publicFooterHtml) — 크롤러가 받는 쪽과
 * 사람이 보는 쪽이 다르면 그것이 클로킹이다.
 */
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <nav aria-label="공개 자료">
        <strong>공개 자료</strong>
        {PUBLIC_NAV.map(([href, label]) => (
          <Link key={href} to={href}>
            {label}
          </Link>
        ))}
      </nav>
      <p>
        <Link to="/">온고지신 AI</Link> — 한의사를 위한 임상 워크스페이스.
      </p>
    </footer>
  )
}
