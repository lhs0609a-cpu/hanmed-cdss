"""
KCI (한국학술지인용색인) 어댑터
https://www.kci.go.kr
"""

import asyncio
import aiohttp
from typing import List, Optional, AsyncIterator
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, quote

from .base import BaseSourceAdapter, ArticleInfo, ArticleDetail


class KCIAdapter(BaseSourceAdapter):
    """
    KCI 한국학술지인용색인 크롤러
    국내 학술지 논문 통합 검색
    """

    source_name = "kci"
    base_url = "https://www.kci.go.kr"

    def __init__(self):
        super().__init__()
        self.session: Optional[aiohttp.ClientSession] = None
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }

    async def initialize(self) -> None:
        """세션 초기화"""
        if self.session is None:
            timeout = aiohttp.ClientTimeout(total=30)
            connector = aiohttp.TCPConnector(ssl=False)
            self.session = aiohttp.ClientSession(
                headers=self.headers,
                timeout=timeout,
                connector=connector
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
        KCI에서 논문 검색

        KCI 검색 URL 패턴:
        https://www.kci.go.kr/kciportal/po/search/poArtiSearList.kci?queryText=치험례
        """
        if not self.session:
            await self.initialize()

        for keyword in keywords:
            try:
                # 검색 URL 구성
                search_url = f"{self.base_url}/kciportal/po/search/poArtiSearList.kci"
                params = {
                    'searchType': 'basic',
                    'queryText': keyword,
                    'pageNo': 1,
                    'pageSize': min(max_results, 50),
                }

                print(f"[KCI] Searching for '{keyword}'...")

                async with self.session.get(search_url, params=params) as response:
                    if response.status != 200:
                        print(f"[KCI] Search failed for '{keyword}': {response.status}")
                        continue

                    html = await response.text()
                    soup = BeautifulSoup(html, 'lxml')

                    # 검색 결과 파싱
                    results = self._parse_search_results(soup)
                    print(f"[KCI] Found {len(results)} articles for '{keyword}'")

                    for article in results[:max_results]:
                        yield article

                        # Rate limiting
                        await asyncio.sleep(1.0)

            except Exception as e:
                print(f"[KCI] Error searching for '{keyword}': {e}")
                continue

    def _parse_search_results(self, soup: BeautifulSoup) -> List[ArticleInfo]:
        """검색 결과 HTML 파싱"""
        articles = []

        # KCI 검색 결과 리스트
        result_items = soup.select('ul.list li, .list_search li, .resultList li')

        if not result_items:
            # 대체 선택자 시도
            result_items = soup.select('div[class*="result"] li, .search-result li')

        for item in result_items:
            try:
                # 제목 추출 - .subject 클래스 또는 첫 번째 링크
                title_elem = item.select_one('.subject a, .title a, h3 a, h4 a')
                if not title_elem:
                    title_elem = item.select_one('a[href*="ciSereArtiView"]')

                if not title_elem:
                    continue

                title = title_elem.get_text(strip=True)
                if not title or len(title) < 5:
                    continue

                # 링크에서 article_id 추출
                href = title_elem.get('href', '')
                url = urljoin(self.base_url, href)

                # artiId 파라미터에서 ID 추출
                article_id = ""
                id_match = re.search(r'artiId=([A-Z0-9]+)', href)
                if id_match:
                    article_id = id_match.group(1)
                else:
                    # URL 해시로 대체
                    article_id = f"kci_{hash(href) & 0xffffffff:08x}"

                # 저자 추출
                authors = []
                author_elems = item.select('.author a, .writer a, a[href*="poCretDetail"]')
                for ae in author_elems:
                    author_name = ae.get_text(strip=True)
                    if author_name and len(author_name) < 20:
                        authors.append(author_name)

                # 저널 정보 추출
                journal = ""
                journal_elem = item.select_one('.journal, .source, a[href*="ciSereInfoView"]')
                if journal_elem:
                    journal = journal_elem.get_text(strip=True)

                # 연도 추출
                year = None
                text_content = item.get_text()
                year_match = re.search(r'(19|20)\d{2}', text_content)
                if year_match:
                    year = int(year_match.group(0))

                # 초록 (있으면)
                abstract = ""
                abstract_elem = item.select_one('.abstract, .summary')
                if abstract_elem:
                    abstract = abstract_elem.get_text(strip=True)[:500]

                if title and article_id:
                    articles.append(ArticleInfo(
                        article_id=article_id,
                        title=title,
                        authors=authors[:5],  # 최대 5명
                        journal=journal,
                        year=year,
                        url=url,
                        abstract=abstract,
                    ))

            except Exception as e:
                print(f"[KCI] Error parsing result item: {e}")
                continue

        return articles

    async def fetch_detail(self, article_id: str) -> Optional[ArticleDetail]:
        """논문 상세 페이지에서 전문 가져오기"""
        if not self.session:
            await self.initialize()

        try:
            # 상세 페이지 URL
            detail_url = f"{self.base_url}/kciportal/ci/sereArticleSearch/ciSereArtiView.kci"
            params = {
                'sereArticleSearchBean.artiId': article_id
            }

            print(f"[KCI] Fetching detail for {article_id}...")

            async with self.session.get(detail_url, params=params) as response:
                if response.status != 200:
                    print(f"[KCI] Failed to fetch detail for {article_id}: {response.status}")
                    return None

                html = await response.text()
                soup = BeautifulSoup(html, 'lxml')

                return self._parse_article_detail(soup, article_id, str(response.url))

        except Exception as e:
            print(f"[KCI] Error fetching detail for {article_id}: {e}")
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
            title = ""
            title_elem = soup.select_one('.artclInfoTop h1, .article-title, .title, h1')
            if title_elem:
                title = title_elem.get_text(strip=True)

            # 저자
            authors = []
            author_elems = soup.select('.author a, .authors a, a[href*="poCretDetail"]')
            for ae in author_elems:
                name = ae.get_text(strip=True)
                if name and 1 < len(name) < 20:
                    authors.append(name)

            # 저널
            journal = ""
            journal_elem = soup.select_one('.journal-name, .journalInfo, a[href*="ciSereInfoView"]')
            if journal_elem:
                journal = journal_elem.get_text(strip=True)

            # 연도
            year = None
            date_elem = soup.select_one('.pub-date, .date, .year')
            if date_elem:
                year_match = re.search(r'(19|20)\d{2}', date_elem.get_text())
                if year_match:
                    year = int(year_match.group(0))

            # 텍스트에서 연도 추출
            if not year:
                page_text = soup.get_text()
                year_match = re.search(r'(19|20)\d{2}', page_text[:2000])
                if year_match:
                    year = int(year_match.group(0))

            # DOI
            doi = None
            doi_elem = soup.select_one('a[href*="doi.org"], .doi')
            if doi_elem:
                doi_text = doi_elem.get('href', '') or doi_elem.get_text()
                doi_match = re.search(r'10\.\d+/[^\s]+', doi_text)
                if doi_match:
                    doi = doi_match.group(0)

            # 초록
            abstract = ""
            abstract_elem = soup.select_one('.abstract, .abstractTxt, [class*="abstract"]')
            if abstract_elem:
                abstract = abstract_elem.get_text(strip=True)

            # 본문 - KCI는 보통 초록만 제공, 전문은 원문 링크로
            full_text = abstract

            # 추가 내용 추출 시도
            content_elem = soup.select_one('.article-content, .content, .body')
            if content_elem:
                additional = content_elem.get_text(separator='\n', strip=True)
                if len(additional) > len(full_text):
                    full_text = additional

            # 키워드
            keywords = []
            keyword_elem = soup.select_one('.keywords, [class*="keyword"]')
            if keyword_elem:
                keyword_text = keyword_elem.get_text(strip=True)
                keywords = [k.strip() for k in re.split(r'[,;·]', keyword_text) if k.strip()]

            if not title:
                return None

            return ArticleDetail(
                article_id=article_id,
                title=title,
                authors=authors[:10],
                journal=journal,
                year=year,
                doi=doi,
                url=url,
                abstract=abstract,
                full_text=full_text[:50000],
                keywords=keywords,
            )

        except Exception as e:
            print(f"[KCI] Error parsing article detail: {e}")
            return None

    def get_rate_limit(self) -> float:
        """KCI는 3초 간격"""
        return 3.0
