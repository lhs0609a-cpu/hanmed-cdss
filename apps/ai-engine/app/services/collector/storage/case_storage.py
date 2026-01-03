"""
치험례 저장 관리
JSON 파일 기반 영구 저장
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
from threading import Lock


class CaseStorage:
    """
    치험례 저장 관리
    - pending_cases.json: 검토 대기 케이스
    - all_cases_combined.json: 승인된 케이스 (기존 데이터와 통합)
    - collection_logs.json: 수집 로그
    """

    def __init__(self, data_dir: Optional[Path] = None):
        """
        초기화

        Args:
            data_dir: 데이터 디렉토리 경로
        """
        if data_dir is None:
            # 실제 프로그램 데이터 경로 사용 (apps/ai-engine/data/)
            # case_storage.py -> storage -> collector -> services -> app -> ai-engine -> data
            data_dir = Path(__file__).parent.parent.parent.parent.parent / "data"

        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # 수집기 전용 디렉토리 (로그, 대기열 등)
        self.collector_dir = self.data_dir / "collector"
        self.collector_dir.mkdir(parents=True, exist_ok=True)

        # 파일 경로 - 승인된 케이스는 메인 데이터 파일에 직접 추가
        self.combined_file = self.data_dir / "all_cases_combined.json"
        self.pending_file = self.collector_dir / "pending_cases.json"
        self.logs_file = self.collector_dir / "collection_logs.json"
        self.duplicates_file = self.collector_dir / "duplicates_archive.json"

        # 파일 잠금
        self._lock = Lock()

    def load_existing_cases(self) -> List[Dict[str, Any]]:
        """기존 케이스 로드"""
        if not self.combined_file.exists():
            return []

        with open(self.combined_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def load_pending_cases(self) -> List[Dict[str, Any]]:
        """대기 중인 케이스 로드"""
        if not self.pending_file.exists():
            return []

        with open(self.pending_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save_pending_cases(self, cases: List[Dict[str, Any]]) -> None:
        """대기 케이스 저장"""
        with self._lock:
            with open(self.pending_file, 'w', encoding='utf-8') as f:
                json.dump(cases, f, ensure_ascii=False, indent=2)

    def add_to_pending(self, cases: List[Dict[str, Any]]) -> int:
        """
        대기 목록에 케이스 추가

        Args:
            cases: 추가할 케이스 리스트

        Returns:
            추가된 케이스 수
        """
        with self._lock:
            existing = self.load_pending_cases()
            existing.extend(cases)

            with open(self.pending_file, 'w', encoding='utf-8') as f:
                json.dump(existing, f, ensure_ascii=False, indent=2)

            return len(cases)

    def approve_cases(self, case_ids: List[str]) -> int:
        """
        케이스 승인 (pending → combined)

        Args:
            case_ids: 승인할 케이스 ID 리스트

        Returns:
            승인된 케이스 수
        """
        with self._lock:
            pending = self.load_pending_cases()
            combined = self.load_existing_cases()

            approved = []
            remaining = []

            for case in pending:
                if case.get('id') in case_ids:
                    case['approved_at'] = datetime.now().isoformat()
                    approved.append(case)
                else:
                    remaining.append(case)

            # 통합 파일에 추가
            combined.extend(approved)

            # 저장
            with open(self.combined_file, 'w', encoding='utf-8') as f:
                json.dump(combined, f, ensure_ascii=False, indent=2)

            with open(self.pending_file, 'w', encoding='utf-8') as f:
                json.dump(remaining, f, ensure_ascii=False, indent=2)

            return len(approved)

    def auto_approve_high_confidence(self, threshold: float = 0.9) -> int:
        """
        신뢰도 높은 케이스 자동 승인

        Args:
            threshold: 자동 승인 임계값

        Returns:
            승인된 케이스 수
        """
        pending = self.load_pending_cases()

        auto_approve_ids = [
            case['id'] for case in pending
            if case.get('confidence_score', 0) >= threshold
        ]

        if auto_approve_ids:
            return self.approve_cases(auto_approve_ids)

        return 0

    def reject_cases(self, case_ids: List[str], reason: str = "") -> int:
        """
        케이스 거부

        Args:
            case_ids: 거부할 케이스 ID 리스트
            reason: 거부 사유

        Returns:
            거부된 케이스 수
        """
        with self._lock:
            pending = self.load_pending_cases()

            rejected = []
            remaining = []

            for case in pending:
                if case.get('id') in case_ids:
                    case['rejected_at'] = datetime.now().isoformat()
                    case['rejection_reason'] = reason
                    rejected.append(case)
                else:
                    remaining.append(case)

            # 대기 목록 업데이트
            with open(self.pending_file, 'w', encoding='utf-8') as f:
                json.dump(remaining, f, ensure_ascii=False, indent=2)

            return len(rejected)

    def save_duplicates(self, duplicates: List[Dict[str, Any]]) -> None:
        """중복 케이스 아카이브"""
        with self._lock:
            existing = []
            if self.duplicates_file.exists():
                with open(self.duplicates_file, 'r', encoding='utf-8') as f:
                    existing = json.load(f)

            existing.extend(duplicates)

            # 최대 1000개만 보관
            if len(existing) > 1000:
                existing = existing[-1000:]

            with open(self.duplicates_file, 'w', encoding='utf-8') as f:
                json.dump(existing, f, ensure_ascii=False, indent=2)

    def log_collection(self, log_entry: Dict[str, Any]) -> None:
        """수집 로그 저장"""
        with self._lock:
            logs = []
            if self.logs_file.exists():
                with open(self.logs_file, 'r', encoding='utf-8') as f:
                    logs = json.load(f)

            logs.append(log_entry)

            # 최대 500개 로그 보관
            if len(logs) > 500:
                logs = logs[-500:]

            with open(self.logs_file, 'w', encoding='utf-8') as f:
                json.dump(logs, f, ensure_ascii=False, indent=2)

    def get_collection_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """최근 수집 로그 조회"""
        if not self.logs_file.exists():
            return []

        with open(self.logs_file, 'r', encoding='utf-8') as f:
            logs = json.load(f)

        return logs[-limit:]

    def get_stats(self) -> Dict[str, Any]:
        """저장소 통계"""
        combined = self.load_existing_cases()
        pending = self.load_pending_cases()

        # 온라인 수집 케이스 수
        online_cases = [c for c in combined if c.get('data_source') == 'online_collection']

        return {
            'total_cases': len(combined),
            'pending_cases': len(pending),
            'online_collected_cases': len(online_cases),
            'combined_file_size_mb': self.combined_file.stat().st_size / (1024 * 1024) if self.combined_file.exists() else 0,
        }
