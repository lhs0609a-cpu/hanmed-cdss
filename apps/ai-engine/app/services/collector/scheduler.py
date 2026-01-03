"""
치험례 수집 스케줄러
APScheduler를 사용한 자동 수집 관리
"""

import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from .adapters.base import BaseSourceAdapter, ArticleDetail
from .adapters.oasis_adapter import OASISAdapter
from .adapters.kci_adapter import KCIAdapter
from .adapters.pubmed_adapter import PubMedAdapter
from .extractors.case_extractor import CaseExtractor
from .processors.validator import CaseValidator
from .processors.normalizer import CaseNormalizer
from .processors.deduplicator import CaseDeduplicator
from .storage.case_storage import CaseStorage


class CollectorScheduler:
    """
    온라인 치험례 수집 스케줄러

    Features:
    - 자동 일일/주간 수집
    - 수동 트리거 지원
    - 자동 승인 (신뢰도 기반)
    - 수집 로깅
    """

    def __init__(
        self,
        enabled: bool = True,
        collection_interval_hours: int = 6,
        request_delay: float = 5.0,
        auto_approve_threshold: float = 0.9,
        data_dir: Optional[Path] = None,
    ):
        """
        초기화

        Args:
            enabled: 자동 수집 활성화 여부
            collection_interval_hours: 수집 주기 (시간 단위, 기본 6시간)
            request_delay: 요청 간 대기 시간 (초)
            auto_approve_threshold: 자동 승인 신뢰도 임계값
            data_dir: 데이터 디렉토리
        """
        self.enabled = enabled
        self.collection_interval_hours = collection_interval_hours
        self.request_delay = request_delay
        self.auto_approve_threshold = auto_approve_threshold

        # 컴포넌트 초기화
        self.storage = CaseStorage(data_dir)
        self.extractor = CaseExtractor()
        self.validator = CaseValidator()
        self.normalizer = CaseNormalizer()
        self.deduplicator: Optional[CaseDeduplicator] = None

        # 어댑터 등록
        self.adapters: Dict[str, BaseSourceAdapter] = {
            'oasis': OASISAdapter(),
            'kci': KCIAdapter(),
            'pubmed': PubMedAdapter(),
        }

        # 스케줄러
        self.scheduler: Optional[AsyncIOScheduler] = None

        # 실행 상태
        self.is_running = False
        self.last_run: Optional[datetime] = None
        self.last_result: Optional[Dict] = None

    async def initialize(self) -> None:
        """스케줄러 초기화"""
        # 중복 제거기 초기화 (기존 케이스 로드)
        existing_cases = self.storage.load_existing_cases()
        self.deduplicator = CaseDeduplicator(existing_cases)

        # 어댑터 초기화
        for adapter in self.adapters.values():
            await adapter.initialize()

        # 스케줄러 설정
        if self.enabled:
            self.scheduler = AsyncIOScheduler()

            # 주기적 수집 (기본 6시간마다)
            self.scheduler.add_job(
                self.run_collection,
                IntervalTrigger(hours=self.collection_interval_hours),
                id='periodic_collection',
                name='Periodic Clinical Case Collection',
                replace_existing=True,
            )

            self.scheduler.start()
            print(f"[Collector] Scheduler started. Collection every {self.collection_interval_hours} hours")

    async def cleanup(self) -> None:
        """정리"""
        if self.scheduler:
            self.scheduler.shutdown()

        for adapter in self.adapters.values():
            await adapter.cleanup()

    async def run_collection(
        self,
        sources: Optional[List[str]] = None,
        keywords: Optional[List[str]] = None,
        max_articles: int = 50,
    ) -> Dict[str, Any]:
        """
        수집 실행

        Args:
            sources: 수집할 소스 리스트 (None이면 전체)
            keywords: 검색 키워드 (None이면 기본값)
            max_articles: 최대 논문 수

        Returns:
            수집 결과 통계
        """
        if self.is_running:
            return {'error': 'Collection already in progress'}

        self.is_running = True
        start_time = datetime.now()

        result = {
            'collection_id': f"COL-{start_time.strftime('%Y%m%d-%H%M%S')}",
            'timestamp': start_time.isoformat(),
            'sources': sources or list(self.adapters.keys()),
            'status': 'running',
            'statistics': {
                'articles_searched': 0,
                'articles_fetched': 0,
                'cases_extracted': 0,
                'cases_valid': 0,
                'cases_duplicate': 0,
                'cases_added': 0,
                'cases_auto_approved': 0,
            },
            'errors': [],
        }

        try:
            # 사용할 어댑터 결정
            adapter_names = sources or list(self.adapters.keys())

            # 검색 키워드
            search_keywords = keywords or [
                "치험례", "증례보고", "임상례", "한방치료", "한약치료"
            ]

            all_new_cases = []

            for adapter_name in adapter_names:
                adapter = self.adapters.get(adapter_name)
                if not adapter:
                    result['errors'].append(f"Unknown adapter: {adapter_name}")
                    continue

                try:
                    # 검색 및 수집
                    cases_from_source = await self._collect_from_source(
                        adapter=adapter,
                        keywords=search_keywords,
                        max_articles=max_articles,
                        result=result,
                    )
                    all_new_cases.extend(cases_from_source)

                except Exception as e:
                    result['errors'].append(f"Error from {adapter_name}: {str(e)}")
                    print(f"[Collector] Error from {adapter_name}: {e}")

            # 중복 제거
            if all_new_cases and self.deduplicator:
                unique_cases, duplicate_cases = self.deduplicator.filter_duplicates(all_new_cases)

                result['statistics']['cases_duplicate'] = len(duplicate_cases)
                result['statistics']['cases_added'] = len(unique_cases)

                # 중복 케이스 아카이브
                if duplicate_cases:
                    self.storage.save_duplicates(duplicate_cases)

                # 유효한 케이스 저장
                if unique_cases:
                    # 자동 승인 가능한 케이스 분리
                    auto_approve = [
                        c for c in unique_cases
                        if c.get('confidence_score', 0) >= self.auto_approve_threshold
                    ]
                    pending = [
                        c for c in unique_cases
                        if c.get('confidence_score', 0) < self.auto_approve_threshold
                    ]

                    # 자동 승인
                    if auto_approve:
                        self.storage.approve_cases([c['id'] for c in auto_approve])
                        result['statistics']['cases_auto_approved'] = len(auto_approve)

                    # 나머지는 대기열에 추가
                    if pending:
                        self.storage.add_to_pending(pending)

            result['status'] = 'completed'

        except Exception as e:
            result['status'] = 'failed'
            result['errors'].append(str(e))
            print(f"[Collector] Collection failed: {e}")

        finally:
            self.is_running = False
            self.last_run = start_time
            self.last_result = result

            # 소요 시간
            duration = (datetime.now() - start_time).total_seconds()
            result['duration_seconds'] = round(duration, 2)

            # 로그 저장
            self.storage.log_collection(result)

        return result

    async def _collect_from_source(
        self,
        adapter: BaseSourceAdapter,
        keywords: List[str],
        max_articles: int,
        result: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """단일 소스에서 수집"""
        cases = []
        articles_fetched = 0

        # 검색
        async for article_info in adapter.search(keywords, max_results=max_articles):
            result['statistics']['articles_searched'] += 1

            if articles_fetched >= max_articles:
                break

            try:
                # 상세 정보 가져오기
                detail = await adapter.fetch_detail(article_info.article_id)
                if not detail:
                    continue

                articles_fetched += 1
                result['statistics']['articles_fetched'] += 1

                # 치험례 추출
                article_dict = {
                    'url': detail.url,
                    'title': detail.title,
                    'authors': detail.authors,
                    'journal': detail.journal,
                    'year': detail.year,
                    'doi': detail.doi,
                    'source': adapter.source_name,
                }

                extracted = self.extractor.extract_cases(detail.full_text, article_dict)
                result['statistics']['cases_extracted'] += len(extracted)

                # 검증 및 정규화
                for case in extracted:
                    case_dict = case.to_dict()

                    # 정규화
                    case_dict = self.normalizer.normalize(case_dict)

                    # 검증
                    validation = self.validator.validate(case_dict)
                    if validation.is_valid:
                        result['statistics']['cases_valid'] += 1
                        cases.append(case_dict)

                # Rate limiting
                await asyncio.sleep(self.request_delay)

            except Exception as e:
                print(f"[Collector] Error processing article {article_info.article_id}: {e}")
                continue

        return cases

    def get_status(self) -> Dict[str, Any]:
        """현재 상태 조회"""
        return {
            'enabled': self.enabled,
            'is_running': self.is_running,
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'last_result': self.last_result,
            'next_run': self._get_next_run_time(),
            'registered_sources': list(self.adapters.keys()),
            'storage_stats': self.storage.get_stats(),
        }

    def _get_next_run_time(self) -> Optional[str]:
        """다음 실행 시간"""
        if not self.scheduler:
            return None

        job = self.scheduler.get_job('periodic_collection')
        if job and job.next_run_time:
            return job.next_run_time.isoformat()

        return None


# 싱글톤 인스턴스
collector_scheduler = CollectorScheduler()
