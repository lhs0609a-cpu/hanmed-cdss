"""
LLM 호출 동시성 / Rate-limit 제어.

500명 한의사가 오전 9-12시에 몰릴 때를 가정한다.
- 전역 semaphore 로 OpenAI 동시 호출을 N 으로 제한 (계정 RPM/TPM 보호).
- 사용자별 토큰 버킷으로 분당 호출 수 제한 (1인 광고/오용 차단).
- 큐 대기 시간이 길어지면 사용자에게 ‘잠시 후 다시 시도해주세요’ 응답 유도.

config 환경변수:
- LLM_MAX_CONCURRENCY (default 16)
- LLM_PER_USER_RPM (default 30)
- LLM_QUEUE_TIMEOUT_SECONDS (default 12)
"""

from __future__ import annotations

import asyncio
import os
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Optional

DEFAULT_MAX_CONCURRENCY = int(os.getenv("LLM_MAX_CONCURRENCY", "16"))
DEFAULT_PER_USER_RPM = int(os.getenv("LLM_PER_USER_RPM", "30"))
DEFAULT_QUEUE_TIMEOUT = float(os.getenv("LLM_QUEUE_TIMEOUT_SECONDS", "12"))


class CapacityExceeded(RuntimeError):
    """큐 대기 타임아웃 또는 사용자 RPM 초과."""

    def __init__(self, reason: str, retry_after_seconds: float | None = None) -> None:
        super().__init__(reason)
        self.reason = reason
        self.retry_after_seconds = retry_after_seconds


@dataclass
class _UserBucket:
    capacity: int
    tokens: float
    last_refill: float
    refill_per_sec: float = field(init=False)

    def __post_init__(self) -> None:
        # tokens regenerate evenly across 60 seconds
        self.refill_per_sec = self.capacity / 60.0

    def take(self) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_per_sec)
        self.last_refill = now
        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False

    def retry_after(self) -> float:
        deficit = 1.0 - self.tokens
        return max(0.5, deficit / self.refill_per_sec)


class LLMConcurrencyController:
    def __init__(
        self,
        *,
        max_concurrency: int = DEFAULT_MAX_CONCURRENCY,
        per_user_rpm: int = DEFAULT_PER_USER_RPM,
        queue_timeout_seconds: float = DEFAULT_QUEUE_TIMEOUT,
    ) -> None:
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._per_user_rpm = per_user_rpm
        self._queue_timeout_seconds = queue_timeout_seconds
        self._user_buckets: dict[str, _UserBucket] = {}
        self._user_lock = asyncio.Lock()
        self.max_concurrency = max_concurrency

    async def _check_user_rate(self, user_key: Optional[str]) -> None:
        if not user_key:
            return
        async with self._user_lock:
            bucket = self._user_buckets.get(user_key)
            if bucket is None:
                bucket = _UserBucket(
                    capacity=self._per_user_rpm,
                    tokens=float(self._per_user_rpm),
                    last_refill=time.monotonic(),
                )
                self._user_buckets[user_key] = bucket
            if not bucket.take():
                raise CapacityExceeded(
                    "분당 사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
                    retry_after_seconds=bucket.retry_after(),
                )

    @asynccontextmanager
    async def slot(self, *, user_key: Optional[str] = None):
        """LLM 호출 직전에 with 블록으로 감싸 사용한다."""
        await self._check_user_rate(user_key)
        try:
            await asyncio.wait_for(self._semaphore.acquire(), timeout=self._queue_timeout_seconds)
        except asyncio.TimeoutError as e:
            raise CapacityExceeded(
                "현재 요청이 많아 잠시 후 다시 시도해주세요.",
                retry_after_seconds=2.0,
            ) from e
        try:
            yield
        finally:
            self._semaphore.release()


# 전역 인스턴스 (앱 lifespan 보다 짧게 살리고 reload에 안전)
_controller: LLMConcurrencyController | None = None


def get_llm_controller() -> LLMConcurrencyController:
    global _controller
    if _controller is None:
        _controller = LLMConcurrencyController()
    return _controller
