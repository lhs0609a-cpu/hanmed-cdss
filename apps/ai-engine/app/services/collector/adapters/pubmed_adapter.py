"""
PubMed E-utilities 어댑터
한의학/한방 관련 증례보고 검색
"""

import asyncio
import aiohttp
from typing import List, Optional, AsyncIterator
from bs4 import BeautifulSoup
import re

from .base import BaseSourceAdapter, ArticleInfo, ArticleDetail


class PubMedAdapter(BaseSourceAdapter):
    """
    PubMed E-utilities API를 사용한 논문 검색
    한의학/전통의학 관련 증례보고 수집
    """

    source_name = "pubmed"
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    # 한의학 관련 검색 쿼리
    DEFAULT_SEARCH_TERMS = [
        "(korean medicine OR traditional korean medicine) AND case report",
        "(herbal medicine korea) AND case report",
        "(acupuncture korea) AND case study",
        "(oriental medicine) AND clinical case",
    ]

    def __init__(self, api_key: Optional[str] = None):
        super().__init__()
        self.session: Optional[aiohttp.ClientSession] = None
        self.api_key = api_key  # NCBI API key (선택사항, rate limit 완화)

    async def initialize(self) -> None:
        """세션 초기화"""
        if self.session is None:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)

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
        PubMed에서 논문 검색

        Args:
            keywords: 검색 키워드 (한국어 키워드는 영어로 변환됨)
            date_from: 시작 날짜 (YYYY/MM/DD)
            date_to: 종료 날짜 (YYYY/MM/DD)
            max_results: 최대 결과 수
        """
        if not self.session:
            await self.initialize()

        # 키워드를 PubMed 쿼리로 변환
        search_queries = self._build_search_queries(keywords)

        seen_pmids = set()

        for query in search_queries:
            try:
                # ESearch로 PMID 목록 가져오기
                pmids = await self._esearch(query, max_results // len(search_queries))

                # 중복 제거
                new_pmids = [p for p in pmids if p not in seen_pmids]
                seen_pmids.update(new_pmids)

                if not new_pmids:
                    continue

                print(f"[PubMed] Found {len(new_pmids)} articles for query")

                # EFetch로 상세 정보 가져오기
                articles = await self._efetch_articles(new_pmids)

                for article in articles:
                    yield article
                    await asyncio.sleep(0.5)  # Rate limiting

            except Exception as e:
                print(f"[PubMed] Error searching: {e}")
                continue

    def _build_search_queries(self, keywords: List[str]) -> List[str]:
        """검색 쿼리 구성"""
        queries = []

        # 한국어 키워드를 영어로 매핑
        keyword_mapping = {
            "치험례": "case report",
            "증례": "case report",
            "임상례": "clinical case",
            "한방치료": "korean medicine treatment",
            "한약치료": "herbal medicine",
            "침치료": "acupuncture treatment",
            "한의학": "korean medicine",
        }

        for keyword in keywords:
            # 한국어 키워드 변환
            if keyword in keyword_mapping:
                eng_keyword = keyword_mapping[keyword]
                queries.append(f"({eng_keyword}) AND (korea OR korean)")
            else:
                # 영어 키워드 그대로 사용
                queries.append(f"({keyword}) AND case report")

        # 기본 쿼리 추가
        if not queries:
            queries = self.DEFAULT_SEARCH_TERMS[:2]

        return queries

    async def _esearch(self, query: str, max_results: int) -> List[str]:
        """ESearch API로 PMID 목록 검색"""
        url = f"{self.base_url}/esearch.fcgi"
        params = {
            "db": "pubmed",
            "term": query,
            "retmax": min(max_results, 200),
            "retmode": "xml",
            "sort": "date",
        }

        if self.api_key:
            params["api_key"] = self.api_key

        async with self.session.get(url, params=params) as response:
            if response.status != 200:
                return []

            xml = await response.text()
            soup = BeautifulSoup(xml, "xml")

            return [id_tag.text for id_tag in soup.find_all("Id")]

    async def _efetch_articles(self, pmids: List[str]) -> List[ArticleInfo]:
        """EFetch API로 논문 상세 정보 가져오기"""
        if not pmids:
            return []

        url = f"{self.base_url}/efetch.fcgi"
        params = {
            "db": "pubmed",
            "id": ",".join(pmids),
            "retmode": "xml",
            "rettype": "abstract",
        }

        if self.api_key:
            params["api_key"] = self.api_key

        async with self.session.get(url, params=params) as response:
            if response.status != 200:
                return []

            xml = await response.text()
            return self._parse_pubmed_xml(xml)

    def _parse_pubmed_xml(self, xml: str) -> List[ArticleInfo]:
        """PubMed XML 파싱"""
        articles = []
        soup = BeautifulSoup(xml, "xml")

        for article in soup.find_all("PubmedArticle"):
            try:
                # PMID
                pmid_elem = article.find("PMID")
                if not pmid_elem:
                    continue
                pmid = pmid_elem.text

                # 제목
                title_elem = article.find("ArticleTitle")
                title = title_elem.text if title_elem else ""

                # 저자
                authors = []
                for author in article.find_all("Author"):
                    lastname = author.find("LastName")
                    forename = author.find("ForeName")
                    if lastname:
                        name = lastname.text
                        if forename:
                            name = f"{forename.text} {name}"
                        authors.append(name)

                # 저널
                journal_elem = article.find("Title")
                journal = journal_elem.text if journal_elem else ""

                # 연도
                year = None
                year_elem = article.find("Year")
                if year_elem:
                    try:
                        year = int(year_elem.text)
                    except ValueError:
                        pass

                # 초록
                abstract_elem = article.find("AbstractText")
                abstract = abstract_elem.text if abstract_elem else ""

                # DOI
                doi = None
                for id_elem in article.find_all("ArticleId"):
                    if id_elem.get("IdType") == "doi":
                        doi = id_elem.text
                        break

                # URL
                url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"

                articles.append(ArticleInfo(
                    article_id=f"PMID:{pmid}",
                    title=title,
                    authors=authors[:10],
                    journal=journal,
                    year=year,
                    url=url,
                    abstract=abstract[:1000],
                ))

            except Exception as e:
                print(f"[PubMed] Error parsing article: {e}")
                continue

        return articles

    async def fetch_detail(self, article_id: str) -> Optional[ArticleDetail]:
        """논문 상세 정보 가져오기"""
        if not self.session:
            await self.initialize()

        # article_id에서 PMID 추출
        pmid = article_id.replace("PMID:", "")

        try:
            url = f"{self.base_url}/efetch.fcgi"
            params = {
                "db": "pubmed",
                "id": pmid,
                "retmode": "xml",
                "rettype": "full",
            }

            if self.api_key:
                params["api_key"] = self.api_key

            async with self.session.get(url, params=params) as response:
                if response.status != 200:
                    return None

                xml = await response.text()
                return self._parse_detail_xml(xml, pmid)

        except Exception as e:
            print(f"[PubMed] Error fetching detail for {pmid}: {e}")
            return None

    def _parse_detail_xml(self, xml: str, pmid: str) -> Optional[ArticleDetail]:
        """상세 정보 XML 파싱"""
        soup = BeautifulSoup(xml, "xml")
        article = soup.find("PubmedArticle")

        if not article:
            return None

        try:
            # 제목
            title_elem = article.find("ArticleTitle")
            title = title_elem.text if title_elem else ""

            # 저자
            authors = []
            for author in article.find_all("Author"):
                lastname = author.find("LastName")
                forename = author.find("ForeName")
                if lastname:
                    name = lastname.text
                    if forename:
                        name = f"{forename.text} {name}"
                    authors.append(name)

            # 저널
            journal_elem = article.find("Title")
            journal = journal_elem.text if journal_elem else ""

            # 연도
            year = None
            year_elem = article.find("Year")
            if year_elem:
                try:
                    year = int(year_elem.text)
                except ValueError:
                    pass

            # DOI
            doi = None
            for id_elem in article.find_all("ArticleId"):
                if id_elem.get("IdType") == "doi":
                    doi = id_elem.text
                    break

            # 초록 (전체)
            abstract_parts = []
            for abs_elem in article.find_all("AbstractText"):
                label = abs_elem.get("Label", "")
                text = abs_elem.text or ""
                if label:
                    abstract_parts.append(f"{label}: {text}")
                else:
                    abstract_parts.append(text)
            abstract = "\n".join(abstract_parts)

            # 키워드
            keywords = []
            for kw in article.find_all("Keyword"):
                if kw.text:
                    keywords.append(kw.text)

            # MeSH terms
            for mesh in article.find_all("DescriptorName"):
                if mesh.text:
                    keywords.append(mesh.text)

            url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"

            return ArticleDetail(
                article_id=f"PMID:{pmid}",
                title=title,
                authors=authors[:20],
                journal=journal,
                year=year,
                doi=doi,
                url=url,
                abstract=abstract,
                full_text=abstract,  # PubMed는 보통 초록만 제공
                keywords=keywords[:20],
            )

        except Exception as e:
            print(f"[PubMed] Error parsing detail: {e}")
            return None

    def get_rate_limit(self) -> float:
        """PubMed는 API key 없이 초당 3요청, key 있으면 10요청"""
        return 0.5 if self.api_key else 1.0
