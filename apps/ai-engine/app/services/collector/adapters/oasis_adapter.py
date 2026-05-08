"""
OASIS (전통의학정보포털) 어댑터
https://oasis.kiom.re.kr

논문 검색 흐름:
- POST /oasis/paper/pbaseAction.jsp  (검색 실행)
- POST /oasis/paper/pdetailView.jsp?idx={IDX}  (상세 보기)

페이지는 eGov framework + plani 기반. 결과는 HTML 테이블 형태이며
각 결과는 `<a href="javascript:paperDetailView('IDX')">` 로 연결.
"""

import asyncio
import re
from typing import AsyncIterator, List, Optional
from urllib.parse import quote

import aiohttp
from bs4 import BeautifulSoup

from .base import ArticleDetail, ArticleInfo, BaseSourceAdapter
from ....core.logger import get_logger


logger = get_logger("collector.oasis")


class OASISAdapter(BaseSourceAdapter):
    source_name = "oasis"
    base_url = "https://oasis.kiom.re.kr"
    search_action = "/oasis/paper/pbaseAction.jsp"
    detail_action = "/oasis/paper/pdetailView.jsp"
    srch_menu_nix = "JI3a9m1H"

    def __init__(self) -> None:
        super().__init__()
        self.session: Optional[aiohttp.ClientSession] = None
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
            "Content-Type": "application/x-www-form-urlencoded",
        }

    async def initialize(self) -> None:
        if self.session is None:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(
                headers=self.headers, timeout=timeout
            )

    async def cleanup(self) -> None:
        if self.session:
            await self.session.close()
            self.session = None

    async def search(
        self,
        keywords: List[str],
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        max_results: int = 50,
    ) -> AsyncIterator[ArticleInfo]:
        if not self.session:
            await self.initialize()

        per_keyword = max(5, min(max_results, 30))
        seen: set[str] = set()

        for keyword in keywords:
            try:
                form = {
                    "search_word": keyword,
                    "orginSearch": keyword,
                    "searchType": "base",
                    "sort": "dateDESC",
                    "flag": "A",
                    "rowCount": str(per_keyword),
                    "gShowDetail": "false",
                    "reSearch": "once",
                    "totalSearchGubun": "1",
                    "pageIndex": "1",
                }
                url = f"{self.base_url}{self.search_action}?srch_menu_nix={self.srch_menu_nix}"
                async with self.session.post(url, data=form) as resp:
                    if resp.status != 200:
                        logger.warning(
                            "OASIS search failed for '%s': HTTP %s",
                            keyword,
                            resp.status,
                        )
                        continue
                    html = await resp.text(errors="ignore")

                items = self._parse_search_results(html, keyword)
                logger.info(
                    "OASIS keyword '%s': %d results", keyword, len(items)
                )
                for art in items:
                    if art.article_id in seen:
                        continue
                    seen.add(art.article_id)
                    yield art
                    await asyncio.sleep(0.5)

                if len(seen) >= max_results:
                    return
            except Exception as e:
                logger.exception("OASIS error on '%s': %s", keyword, e)
                continue

    def _parse_search_results(self, html: str, keyword: str) -> List[ArticleInfo]:
        """
        결과 행 추출:
        - 각 결과는 `<a href="javascript:paperDetailView('IDX')" title="...">제목</a>` 패턴
        - 그 직후 `<small>저자, 저널, 연도</small>` 또는 `<input name="hIdx" value="IDX">`
        """
        results: List[ArticleInfo] = []

        # idx + title 페어 추출 (정규식 — 한글 인코딩 문제 회피용)
        pattern = re.compile(
            r"paperDetailView\(['\"]([0-9]+)['\"]\)[^>]*"
            r"(?:title=\"([^\"]*)\")?[^>]*>\s*<strong>(.*?)</strong>",
            re.DOTALL,
        )
        for m in pattern.finditer(html):
            idx = m.group(1)
            title = (m.group(2) or m.group(3) or "").strip()
            # title 에 "...상세보기" 라벨이 붙어 있으면 제거
            title = re.sub(r"\s*상세보기\s*$", "", title)
            title = re.sub(r"<[^>]+>", "", title).strip()
            if not idx or not title:
                continue

            # 직후 <small>에서 저자/저널/연도 추출
            tail_start = m.end()
            tail = html[tail_start : tail_start + 800]
            small_match = re.search(r"<small>(.*?)</small>", tail, re.DOTALL)
            authors: List[str] = []
            journal = ""
            year: Optional[int] = None
            if small_match:
                small_html = small_match.group(1)
                small_text = re.sub(r"<[^>]+>", " ", small_html)
                small_text = re.sub(r"\s+", " ", small_text).strip()
                # 흔한 패턴: "저자1, 저자2 외 N 편  저널명  연도"
                year_match = re.search(r"(19|20)\d{2}", small_text)
                if year_match:
                    year = int(year_match.group(0))
                # 첫 부분이 저자
                segs = re.split(r"\s{2,}|·|\|", small_text)
                if segs:
                    author_part = segs[0]
                    authors = [
                        a.strip()
                        for a in re.split(r"[,;]", author_part)
                        if a.strip()
                    ][:8]
                if len(segs) > 1:
                    journal = segs[1].strip()

            results.append(
                ArticleInfo(
                    article_id=f"OASIS:{idx}",
                    title=title[:300],
                    authors=authors,
                    journal=journal[:200],
                    year=year,
                    url=f"{self.base_url}{self.detail_action}?idx={idx}&srch_menu_nix={self.srch_menu_nix}",
                    abstract="",
                )
            )

        return results

    async def fetch_detail(self, article_id: str) -> Optional[ArticleDetail]:
        if not self.session:
            await self.initialize()

        idx = article_id.replace("OASIS:", "")
        if not idx.isdigit():
            return None

        url = f"{self.base_url}{self.detail_action}?idx={idx}&srch_menu_nix={self.srch_menu_nix}"
        try:
            async with self.session.post(url, data={}) as resp:
                if resp.status != 200:
                    logger.warning(
                        "OASIS detail fetch failed for %s: HTTP %s", idx, resp.status
                    )
                    return None
                html = await resp.text(errors="ignore")
        except Exception as e:
            logger.exception("OASIS detail error for %s: %s", idx, e)
            return None

        return self._parse_detail(html, idx, url)

    def _parse_detail(
        self, html: str, idx: str, url: str
    ) -> Optional[ArticleDetail]:
        soup = BeautifulSoup(html, "lxml")

        # 메인 view 테이블에서 제목/메타/초록 추출
        view_table = soup.select_one("table.tstyle_view")
        title = ""
        if view_table:
            cap = view_table.select_one("caption")
            if cap and cap.get_text(strip=True):
                title = cap.get_text(strip=True)
            if not title:
                # 첫 번째 th/td 헤딩 시도
                head = view_table.select_one("th, h2, h3, .title")
                if head:
                    title = head.get_text(strip=True)
        if not title:
            t = soup.select_one("h2.title, .stitle, h2")
            if t:
                title = t.get_text(strip=True)

        # 모든 테이블 셀에서 라벨/값 매핑 추출
        meta = self._extract_meta(soup)

        authors_raw = meta.get("저자") or meta.get("저자명") or ""
        authors = [a.strip() for a in re.split(r"[,;·]", authors_raw) if a.strip()][:20]
        journal = meta.get("학술지명") or meta.get("학술지") or meta.get("저널") or ""
        year = None
        year_text = meta.get("발행연도") or meta.get("발행일") or meta.get("연도") or ""
        ym = re.search(r"(19|20)\d{2}", year_text)
        if ym:
            year = int(ym.group(0))

        keywords_raw = meta.get("키워드") or meta.get("Keywords") or ""
        keywords = [k.strip() for k in re.split(r"[,;]", keywords_raw) if k.strip()][:15]

        abstract = (
            meta.get("초록")
            or meta.get("Abstract")
            or meta.get("논문초록")
            or ""
        )

        # 본문 텍스트 (전문 없으면 abstract+meta 합산)
        full_text = abstract
        if not full_text:
            content = soup.select_one(".view_content, .pdetail, .tstyle_view")
            if content:
                full_text = content.get_text(separator="\n", strip=True)

        return ArticleDetail(
            article_id=f"OASIS:{idx}",
            title=title[:300],
            authors=authors,
            journal=journal[:200],
            year=year,
            doi=None,
            url=url,
            abstract=abstract[:5000],
            full_text=(full_text or "")[:50000],
            keywords=keywords,
        )

    def _extract_meta(self, soup: BeautifulSoup) -> dict[str, str]:
        meta: dict[str, str] = {}
        for tr in soup.select("table tr"):
            th = tr.select_one("th")
            td = tr.select_one("td")
            if not th or not td:
                continue
            key = th.get_text(strip=True)
            val = td.get_text(separator=" ", strip=True)
            if key:
                meta[key] = val
        return meta

    def get_rate_limit(self) -> float:
        return 3.0
