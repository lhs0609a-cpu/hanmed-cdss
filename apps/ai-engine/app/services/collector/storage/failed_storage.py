"""
추출 실패 케이스 재처리 큐
- 규칙 기반·LLM 폴백 모두 실패한 논문을 별도 저장
- 재시도 횟수 추적, 최대 재시도 후 dead-letter
"""

import json
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional


class FailedExtractionStorage:
    """실패한 추출 작업의 영속 큐 (JSON 파일)"""

    MAX_RETRIES = 3

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        if data_dir is None:
            data_dir = Path(__file__).resolve().parents[4] / "data" / "collector"
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.queue_file = self.data_dir / "failed_extractions.json"
        self.dead_file = self.data_dir / "failed_extractions_dead.json"
        self._lock = Lock()

    @staticmethod
    def _make_key(article_info: Dict[str, Any]) -> str:
        return (
            article_info.get("url")
            or article_info.get("doi")
            or article_info.get("article_id")
            or article_info.get("title", "")[:120]
        )

    def _load(self, file: Path) -> List[Dict[str, Any]]:
        if not file.exists():
            return []
        try:
            with open(file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save(self, file: Path, data: List[Dict[str, Any]]) -> None:
        tmp = file.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        tmp.replace(file)

    def add_failure(
        self,
        article_info: Dict[str, Any],
        article_text: str,
        reason: str,
    ) -> None:
        """실패 항목 추가 (이미 존재하면 retry_count + 1)"""
        with self._lock:
            queue = self._load(self.queue_file)
            key = self._make_key(article_info)
            now = datetime.now().isoformat()

            for item in queue:
                if item.get("key") == key:
                    item["retry_count"] = item.get("retry_count", 0) + 1
                    item["last_attempted_at"] = now
                    item["last_reason"] = reason[:300]
                    if item["retry_count"] >= self.MAX_RETRIES:
                        # dead-letter 로 이동
                        queue.remove(item)
                        dead = self._load(self.dead_file)
                        item["dead_at"] = now
                        dead.append(item)
                        # dead-letter 도 1000건만 유지
                        if len(dead) > 1000:
                            dead = dead[-1000:]
                        self._save(self.dead_file, dead)
                    self._save(self.queue_file, queue)
                    return

            queue.append({
                "key": key,
                "article_info": article_info,
                "article_text_excerpt": (article_text or "")[:4000],
                "first_failed_at": now,
                "last_attempted_at": now,
                "retry_count": 1,
                "last_reason": reason[:300],
            })
            # 큐 크기 제한 (오래된 항목 제거)
            if len(queue) > 500:
                queue = queue[-500:]
            self._save(self.queue_file, queue)

    def list_pending(
        self,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        with self._lock:
            queue = self._load(self.queue_file)
            total = len(queue)
            return {
                "items": queue[offset : offset + limit],
                "total": total,
                "limit": limit,
                "offset": offset,
            }

    def list_dead(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            dead = self._load(self.dead_file)
            return dead[-limit:]

    def get_retry_candidates(self) -> List[Dict[str, Any]]:
        """재시도 대상 (retry_count < MAX_RETRIES)"""
        with self._lock:
            queue = self._load(self.queue_file)
            return [
                item for item in queue
                if item.get("retry_count", 0) < self.MAX_RETRIES
            ]

    def remove_success(self, key: str) -> None:
        """재시도 성공 시 큐에서 제거"""
        with self._lock:
            queue = self._load(self.queue_file)
            new_queue = [item for item in queue if item.get("key") != key]
            if len(new_queue) != len(queue):
                self._save(self.queue_file, new_queue)

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            queue = self._load(self.queue_file)
            dead = self._load(self.dead_file)
            return {
                "pending_count": len(queue),
                "dead_letter_count": len(dead),
                "max_retries": self.MAX_RETRIES,
            }
