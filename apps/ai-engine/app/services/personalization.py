"""
한의사 개인화 — 본인 처방 패턴을 학습해 LLM 추론에 반영한다.

목표:
  - 한의사가 시간이 지날수록 추천 정확도가 ↑ 되어, 떠나면 손해가 커지는 락인 효과.
  - 임상 스타일(예: 동의보감 학파 vs 상한론 학파)을 자연스럽게 보존.

데이터:
  - 한의사 ID 별로 처방 빈도 + 약재 빈도 + 변증-처방 조합 빈도를 파일에 누적.
  - 운영에서는 DB(Postgres) 로 이전 권장. 본 모듈은 인터페이스 + 파일 fallback.

산출:
  - personalize_prompt(user_id, base_prompt) → 시스템 프롬프트에 사용자 스타일 hint 주입.
  - boost_recommendations(user_id, recs) → 본인 빈도가 높은 처방을 상위 정렬 + boost.

주의:
  - 한의사 본인 데이터로만 학습 — 다른 한의원 데이터 공유 금지.
  - 데이터는 본인 요청 시 즉시 삭제 가능 (개인정보보호법).
"""

from __future__ import annotations

import json
import logging
import threading
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "personalization"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class PersonalizationService:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cache: Dict[str, dict] = {}

    # --- 영속 ----------------------------------------------------------------

    def _path(self, user_id: str) -> Path:
        # user_id 가 경로 침투 못 하게 sanitize
        safe = "".join(c for c in user_id if c.isalnum() or c in ("-", "_"))[:128]
        if not safe:
            safe = "anon"
        return DATA_DIR / f"{safe}.json"

    def _load(self, user_id: str) -> dict:
        with self._lock:
            if user_id in self._cache:
                return self._cache[user_id]
            p = self._path(user_id)
            if not p.exists():
                profile = {
                    "user_id": user_id,
                    "formula_counts": {},
                    "herb_counts": {},
                    "pattern_to_formula": {},  # "기허": {"보중익기탕": 12, ...}
                    "total_prescriptions": 0,
                }
            else:
                try:
                    with p.open(encoding="utf-8") as f:
                        profile = json.load(f)
                except Exception as e:  # noqa: BLE001
                    logger.warning("personalization: profile load failed for %s: %s", user_id, e)
                    profile = {
                        "user_id": user_id,
                        "formula_counts": {},
                        "herb_counts": {},
                        "pattern_to_formula": {},
                        "total_prescriptions": 0,
                    }
            self._cache[user_id] = profile
            return profile

    def _save(self, user_id: str, profile: dict) -> None:
        with self._lock:
            self._cache[user_id] = profile
            try:
                with self._path(user_id).open("w", encoding="utf-8") as f:
                    json.dump(profile, f, ensure_ascii=False)
            except Exception as e:  # noqa: BLE001
                logger.warning("personalization: profile save failed for %s: %s", user_id, e)

    # --- 학습 ----------------------------------------------------------------

    def record_prescription(
        self,
        user_id: str,
        *,
        formula_name: str,
        herbs: Optional[List[str]] = None,
        pattern: Optional[str] = None,
    ) -> None:
        """한의사가 처방을 발행할 때 호출. 본인 차트 시스템에서 트리거."""
        if not user_id or not formula_name:
            return
        profile = self._load(user_id)
        profile["formula_counts"][formula_name] = (
            int(profile["formula_counts"].get(formula_name, 0)) + 1
        )
        for h in herbs or []:
            profile["herb_counts"][h] = int(profile["herb_counts"].get(h, 0)) + 1
        if pattern:
            sub = profile["pattern_to_formula"].setdefault(pattern, {})
            sub[formula_name] = int(sub.get(formula_name, 0)) + 1
        profile["total_prescriptions"] = int(profile.get("total_prescriptions", 0)) + 1
        self._save(user_id, profile)

    def forget(self, user_id: str) -> None:
        """본인 요청 시 학습 데이터 즉시 삭제."""
        with self._lock:
            self._cache.pop(user_id, None)
        try:
            self._path(user_id).unlink(missing_ok=True)
        except Exception as e:  # noqa: BLE001
            logger.warning("personalization: forget failed for %s: %s", user_id, e)

    # --- 추론 보조 -----------------------------------------------------------

    def get_top_formulas(self, user_id: str, n: int = 5) -> List[str]:
        profile = self._load(user_id)
        counter = Counter(profile.get("formula_counts", {}))
        return [name for name, _ in counter.most_common(n)]

    def get_top_for_pattern(self, user_id: str, pattern: str, n: int = 3) -> List[str]:
        profile = self._load(user_id)
        sub = (profile.get("pattern_to_formula") or {}).get(pattern, {})
        counter = Counter(sub)
        return [name for name, _ in counter.most_common(n)]

    def style_hint(self, user_id: str, *, pattern: Optional[str] = None) -> Optional[str]:
        """LLM 시스템 프롬프트에 추가할 사용자 스타일 hint."""
        if not user_id:
            return None
        profile = self._load(user_id)
        total = int(profile.get("total_prescriptions", 0))
        if total < 5:
            return None  # 표본 부족 — 일반 추천
        top = self.get_top_formulas(user_id, n=5)
        line1 = f"이 한의사는 누적 {total}건의 처방 이력이 있으며, 자주 처방하는 처방은 {', '.join(top)} 입니다."
        line2 = ""
        if pattern:
            top_for_p = self.get_top_for_pattern(user_id, pattern, n=3)
            if top_for_p:
                line2 = f"\n특히 '{pattern}' 변증에서는 {', '.join(top_for_p)} 를 자주 사용합니다."
        return (
            "## 사용자 임상 스타일 (참고)\n"
            f"{line1}{line2}\n"
            "위 스타일을 *우선 후보*로 고려하되, 환자 상태가 더 적합한 처방을 시사한다면 "
            "다른 처방을 추천하고 그 이유를 cautions 에 명시하세요."
        )

    def boost_recommendations(self, user_id: str, recommendations: List[dict]) -> List[dict]:
        """추론 결과의 confidence_score 를 본인 빈도에 맞춰 보정. 정렬도 본인 우선."""
        if not user_id or not recommendations:
            return recommendations
        profile = self._load(user_id)
        counts = profile.get("formula_counts", {}) or {}
        total = int(profile.get("total_prescriptions", 0))
        if total < 5:
            return recommendations
        max_count = max(counts.values()) if counts else 1

        boosted: List[dict] = []
        for rec in recommendations:
            name = (rec.get("formula_name") or "").strip()
            personal_count = int(counts.get(name, 0))
            # 자주 처방하는 처방은 최대 +0.1 까지 boost. 신뢰도 0.95 cap.
            boost = (personal_count / max_count) * 0.1 if max_count else 0
            new_conf = min(0.95, float(rec.get("confidence_score", 0.6)) + boost)
            boosted.append({**rec, "confidence_score": new_conf, "personal_count": personal_count})

        # 본인 빈도 + 신뢰도로 정렬
        boosted.sort(
            key=lambda r: (
                int(r.get("personal_count", 0)),
                float(r.get("confidence_score", 0)),
            ),
            reverse=True,
        )
        return boosted


_service: PersonalizationService | None = None


def get_personalization_service() -> PersonalizationService:
    global _service
    if _service is None:
        _service = PersonalizationService()
    return _service
