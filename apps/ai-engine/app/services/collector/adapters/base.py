"""
데이터 소스 어댑터 기본 인터페이스
"""

from abc import ABC, abstractmethod
from typing import List, Dict, AsyncIterator, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ArticleInfo:
    """논문 기본 정보"""
    article_id: str
    title: str
    authors: List[str] = field(default_factory=list)
    journal: str = ""
    year: Optional[int] = None
    doi: Optional[str] = None
    url: str = ""
    abstract: str = ""


@dataclass
class ArticleDetail:
    """논문 상세 정보"""
    article_id: str
    title: str
    authors: List[str] = field(default_factory=list)
    journal: str = ""
    year: Optional[int] = None
    doi: Optional[str] = None
    url: str = ""
    abstract: str = ""
    full_text: str = ""  # 전문 텍스트
    keywords: List[str] = field(default_factory=list)
    fetched_at: str = field(default_factory=lambda: datetime.now().isoformat())


class BaseSourceAdapter(ABC):
    """
    데이터 소스 어댑터 기본 클래스
    각 학술 DB에 맞는 어댑터가 이 클래스를 상속받아 구현
    """

    source_name: str = "unknown"
    base_url: str = ""

    def __init__(self):
        self.session = None

    @abstractmethod
    async def initialize(self) -> None:
        """어댑터 초기화 (세션 생성 등)"""
        pass

    @abstractmethod
    async def cleanup(self) -> None:
        """어댑터 정리 (세션 종료 등)"""
        pass

    @abstractmethod
    async def search(
        self,
        keywords: List[str],
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        max_results: int = 100
    ) -> AsyncIterator[ArticleInfo]:
        """
        키워드로 논문 검색

        Args:
            keywords: 검색 키워드 리스트
            date_from: 검색 시작일 (YYYY-MM-DD)
            date_to: 검색 종료일 (YYYY-MM-DD)
            max_results: 최대 결과 수

        Yields:
            ArticleInfo: 논문 기본 정보
        """
        pass

    @abstractmethod
    async def fetch_detail(self, article_id: str) -> Optional[ArticleDetail]:
        """
        논문 상세 정보 가져오기

        Args:
            article_id: 논문 ID

        Returns:
            ArticleDetail: 논문 상세 정보 (실패시 None)
        """
        pass

    def get_rate_limit(self) -> float:
        """
        요청 간 대기 시간 (초)
        기본값 5초, 각 어댑터에서 오버라이드 가능
        """
        return 5.0

    def get_search_keywords(self) -> List[str]:
        """
        기본 검색 키워드
        치험례 관련 키워드
        """
        return [
            "치험례",
            "증례보고",
            "임상례",
            "case report",
            "한방치료",
            "한약치료",
        ]
