"""
LLM 호출 메트릭 트래커 — GPT-4o-mini 폴백 사용량 측정
- 호출 횟수, 토큰 사용량, 실패율, 추정 비용
- 일별 집계 + 누적
- JSON 파일에 영구 저장 (data/collector/llm_metrics.json)
"""

import json
from datetime import datetime, date
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Optional


# gpt-4o-mini 단가 (2025-01 기준, USD per 1M tokens)
PRICE_PER_M_INPUT = 0.15
PRICE_PER_M_OUTPUT = 0.60


class LLMMetrics:
    """LLM 호출 메트릭 누적 집계 (스레드 안전)"""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        if data_dir is None:
            data_dir = Path(__file__).resolve().parents[3] / "data" / "collector"
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.metrics_file = self.data_dir / "llm_metrics.json"
        self._lock = Lock()
        self._cache: Optional[Dict[str, Any]] = None

    def _load(self) -> Dict[str, Any]:
        if self._cache is not None:
            return self._cache
        if self.metrics_file.exists():
            try:
                with open(self.metrics_file, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
            except Exception:
                self._cache = self._empty()
        else:
            self._cache = self._empty()
        return self._cache

    @staticmethod
    def _empty() -> Dict[str, Any]:
        return {
            "totals": {
                "calls": 0,
                "successes": 0,
                "failures": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
                "estimated_cost_usd": 0.0,
                "cases_extracted": 0,
            },
            "daily": {},
            "last_failure": None,
            "last_updated": None,
        }

    def _save(self) -> None:
        if self._cache is None:
            return
        tmp = self.metrics_file.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self._cache, f, ensure_ascii=False, indent=2)
        tmp.replace(self.metrics_file)

    @staticmethod
    def _today_key() -> str:
        return date.today().isoformat()

    def record_call(
        self,
        success: bool,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        cases_extracted: int = 0,
        error: Optional[str] = None,
        model: str = "gpt-4o-mini",
    ) -> None:
        """LLM 호출 1건 기록"""
        with self._lock:
            data = self._load()
            t = data["totals"]
            day_key = self._today_key()
            day = data["daily"].setdefault(
                day_key,
                {
                    "calls": 0,
                    "successes": 0,
                    "failures": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "estimated_cost_usd": 0.0,
                    "cases_extracted": 0,
                },
            )

            cost = (
                prompt_tokens / 1_000_000 * PRICE_PER_M_INPUT
                + completion_tokens / 1_000_000 * PRICE_PER_M_OUTPUT
            )
            total_tokens = prompt_tokens + completion_tokens

            for bucket in (t, day):
                bucket["calls"] += 1
                bucket["prompt_tokens"] += prompt_tokens
                bucket["completion_tokens"] += completion_tokens
                bucket["total_tokens"] += total_tokens
                bucket["estimated_cost_usd"] = round(
                    bucket["estimated_cost_usd"] + cost, 6
                )
                bucket["cases_extracted"] += cases_extracted
                if success:
                    bucket["successes"] += 1
                else:
                    bucket["failures"] += 1

            if not success and error:
                data["last_failure"] = {
                    "timestamp": datetime.now().isoformat(),
                    "error": error[:500],
                    "model": model,
                }
            data["last_updated"] = datetime.now().isoformat()

            # 일별 데이터 90일치만 유지
            if len(data["daily"]) > 90:
                keys = sorted(data["daily"].keys())
                for k in keys[: len(keys) - 90]:
                    data["daily"].pop(k, None)

            self._save()

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            data = self._load()
            t = data["totals"]
            failure_rate = (
                t["failures"] / t["calls"] if t["calls"] else 0.0
            )
            avg_tokens = (
                t["total_tokens"] / t["calls"] if t["calls"] else 0.0
            )
            return {
                "totals": {
                    **t,
                    "failure_rate": round(failure_rate, 4),
                    "avg_tokens_per_call": round(avg_tokens, 1),
                },
                "today": data["daily"].get(self._today_key(), {}),
                "last_failure": data["last_failure"],
                "last_updated": data["last_updated"],
                "daily_history_days": len(data["daily"]),
            }

    def get_daily_history(self, days: int = 30) -> Dict[str, Any]:
        with self._lock:
            data = self._load()
            keys = sorted(data["daily"].keys(), reverse=True)[:days]
            return {k: data["daily"][k] for k in sorted(keys)}


# 싱글톤
llm_metrics = LLMMetrics()
