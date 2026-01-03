"""
OASIS (한의학학술정보포털) 어댑터
https://oasis.kiom.re.kr
"""

import asyncio
import aiohttp
from typing import List, Optional, AsyncIterator
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, quote

from .base import BaseSourceAdapter, ArticleInfo, ArticleDetail


class OASISAdapter(BaseSourceAdapter):
    """
    OASIS 한의학학술정보포털 크롤러
    한의학 학술 논문 전문 DB
    """

    source_name = "oasis"
    base_url = "https://oasis.kiom.re.kr"

    def __init__(self):
        super().__init__()
        self.session: Optional[aiohttp.ClientSession] = None
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        }

    async def initialize(self) -> None:
        """세션 초기화"""
        if self.session is None:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(
                headers=self.headers,
                timeout=timeout
            )

    async def cleanup(self) -> None:
        """세션 정리"""
        if self.session:
            await self.session.close()
            self.session = None

    async def search(
        self,
        keywords: List[str],
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        max_results: int = 100
    ) -> AsyncIterator[ArticleInfo]:
        """
        OASIS에서 논문 검색

        OASIS 검색 URL 패턴:
        https://oasis.kiom.re.kr/search/search.do?searchWord=치험례
        """
        if not self.session:
            await self.initialize()

        for keyword in keywords:
            try:
                # 검색 URL 구성
                search_url = f"{self.base_url}/search/search.do"
                params = {
                    'searchWord': keyword,
                    'searchType': 'all',
                    'pageSize': min(max_results, 50),
                    'pageNo': 1,
                }

                async with self.session.get(search_url, params=params) as response:
                    if response.status != 200:
                        print(f"[OASIS] Search failed for '{keyword}': {response.status}")
                        continue

                    html = await response.text()
                    soup = BeautifulSoup(html, 'lxml')

                    # 검색 결과 파싱
                    results = self._parse_search_results(soup)

                    for article in results:
                        yield article

                        # Rate limiting
                        await asyncio.sleep(0.5)

            except Exception as e:
                print(f"[OASIS] Error searching for '{keyword}': {e}")
                continue

    def _parse_search_results(self, soup: BeautifulSoup) -> List[ArticleInfo]:
        """검색 결과 HTML 파싱"""
        articles = []

        # OASIS 검색 결과는 보통 리스트 형태
        # 실제 HTML 구조에 따라 조정 필요
        result_items = soup.select('.search-result-item, .article-item, .list-item, li.result')

        for item in result_items:
            try:
                # 제목 추출
                title_elem = item.select_one('.title, h3, h4, a.article-title')
                if not title_elem:
                    continue

                title = title_elem.get_text(strip=True)

                # 링크 추출
                link_elem = item.select_one('a[href]')
                url = ""
                article_id = ""
                if link_elem:
                    href = link_elem.get('href', '')
                    url = urljoin(self.base_url, href)
                    # ID 추출 시도
                    id_match = re.search(r'[?&]id=([^&]+)', href)
                    if id_match:
                        article_id = id_match.group(1)
                    else:
                        article_id = re.sub(r'[^\w]', '_', href)[-50:]

                # 저자 추출
                author_elem = item.select_one('.author, .authors, .writer')
                authors = []
                if author_elem:
                    author_text = author_elem.get_text(strip=True)
                    authors = [a.strip() for a in re.split(r'[,;]', author_text) if a.strip()]

                # 저널 추출
                journal_elem = item.select_one('.journal, .source, .publication')
                journal = journal_elem.get_text(strip=True) if journal_elem else ""

                # 연도 추출
                year = None
                year_elem = item.select_one('.year, .date, .pub-date')
                if year_elem:
                    year_text = year_elem.get_text(strip=True)
                    year_match = re.search(r'(19|20)\d{2}', year_text)
                    if year_match:
                        year = int(year_match.group(0))

                # 초록 추출
                abstract_elem = item.select_one('.abstract, .summary, .description')
                abstract = abstract_elem.get_text(strip=True) if abstract_elem else ""

                if title and article_id:
                    articles.append(ArticleInfo(
                        article_id=article_id,
                        title=title,
                        authors=authors,
                        journal=journal,
                        year=year,
                        url=url,
                        abstract=abstract[:500],
                    ))

            except Exception as e:
                print(f"[OASIS] Error parsing result item: {e}")
                continue

        return articles

    async def fetch_detail(self, article_id: str) -> Optional[ArticleDetail]:
        """논문 상세 페이지에서 전문 가져오기"""
        if not self.session:
            await self.initialize()

        try:
            # 상세 페이지 URL (실제 URL 패턴에 맞게 조정 필요)
            detail_url = f"{self.base_url}/view/view.do?id={article_id}"

            async with self.session.get(detail_url) as response:
                if response.status != 200:
                    print(f"[OASIS] Failed to fetch detail for {article_id}: {response.status}")
                    return None

                html = await response.text()
                soup = BeautifulSoup(html, 'lxml')

                return self._parse_article_detail(soup, article_id, detail_url)

        except Exception as e:
            print(f"[OASIS] Error fetching detail for {article_id}: {e}")
            return None

    def _parse_article_detail(
        self,
        soup: BeautifulSoup,
        article_id: str,
        url: str
    ) -> Optional[ArticleDetail]:
        """상세 페이지 파싱"""
        try:
            # 제목
            title_elem = soup.select_one('.article-title, h1.title, .view-title')
            title = title_elem.get_text(strip=True) if title_elem else ""

            # 저자
            author_elem = soup.select_one('.authors, .author-list, .writer')
            authors = []
            if author_elem:
                author_text = author_elem.get_text(strip=True)
                authors = [a.strip() for a in re.split(r'[,;]', author_text) if a.strip()]

            # 저널
            journal_elem = soup.select_one('.journal-name, .source, .publication-info')
            journal = journal_elem.get_text(strip=True) if journal_elem else ""

            # 연도
            year = None
            date_elem = soup.select_one('.pub-date, .date, .year')
            if date_elem:
                date_text = date_elem.get_text(strip=True)
                year_match = re.search(r'(19|20)\d{2}', date_text)
                if year_match:
                    year = int(year_match.group(0))

            # DOI
            doi = None
            doi_elem = soup.select_one('[class*="doi"], a[href*="doi.org"]')
            if doi_elem:
                doi_text = doi_elem.get_text(strip=True)
                doi_match = re.search(r'10\.\d+/[^\s]+', doi_text)
                if doi_match:
                    doi = doi_match.group(0)

            # 초록
            abstract_elem = soup.select_one('.abstract, .summary, [class*="abstract"]')
            abstract = abstract_elem.get_text(strip=True) if abstract_elem else ""

            # 본문 (전문)
            content_elem = soup.select_one('.article-content, .full-text, .content, .body')
            full_text = ""
            if content_elem:
                # HTML 태그 제거하고 텍스트만 추출
                full_text = content_elem.get_text(separator='\n', strip=True)

            # 전문이 없으면 페이지 전체에서 추출 시도
            if not full_text:
                # 불필요한 요소 제거
                for tag in soup.select('script, style, nav, header, footer, .sidebar'):
                    tag.decompose()
                full_text = soup.get_text(separator='\n', strip=True)

            # 키워드
            keywords = []
            keyword_elem = soup.select_one('.keywords, [class*="keyword"]')
            if keyword_elem:
                keyword_text = keyword_elem.get_text(strip=True)
                keywords = [k.strip() for k in re.split(r'[,;]', keyword_text) if k.strip()]

            return ArticleDetail(
                article_id=article_id,
                title=title,
                authors=authors,
                journal=journal,
                year=year,
                doi=doi,
                url=url,
                abstract=abstract,
                full_text=full_text[:50000],  # 최대 50KB
                keywords=keywords,
            )

        except Exception as e:
            print(f"[OASIS] Error parsing article detail: {e}")
            return None

    def get_rate_limit(self) -> float:
        """OASIS는 5초 간격"""
        return 5.0
