"""
LLM 출력의 처방·약재 그라운딩 검증.

목표:
- LLM 이 환각으로 만들어낸 비존재 처방/약재가 한의사 화면에 노출되는 것을 막는다.
- 화이트리스트(KOREAN PHARMACOPOEIA + 식약처 NEDRUG + 자체 처방 DB)에 없는 항목은
  결과에서 제거하거나 "출처 미확인" 마킹.

데이터:
- 화이트리스트는 외부 JSON 으로 분리 (`app/data/grounding/*.json`).
- 파일이 없으면 내장 fallback 으로 동작 (대표 처방·약재).
- 운영에서 식약처 데이터 동기화 잡으로 갱신.

API:
- ground_recommendations(payload) → 검증된 payload + warnings 리스트
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "grounding"

# Fallback (데이터 파일 없을 때) — 운영에서는 외부 동기화 잡으로 보강
FALLBACK_FORMULAS = {
    "이중탕", "보중익기탕", "육군자탕", "사군자탕", "사물탕", "팔물탕", "십전대보탕",
    "귀비탕", "육미지황탕", "팔미지황탕", "좌귀음", "우귀음",
    "소요산", "시호소간탕", "혈부축어탕", "도핵승기탕", "갈근탕", "마황탕",
    "계지탕", "반하후박탕", "오령산", "평위산", "이진탕",
}
FALLBACK_HERBS = {
    "인삼", "백출", "복령", "감초", "황기", "당귀", "천궁", "작약", "숙지황",
    "건강", "반하", "진피", "후박", "시호", "황금", "치자", "산조인", "원지",
    "용안육", "산약", "산수유", "택사", "목단피", "부자", "육계", "두충", "구기자",
    "맥문동", "오미자", "황련", "대황", "갈근", "마황", "계지", "지황",
}


@dataclass
class GroundingResult:
    safe: dict
    warnings: list[str] = field(default_factory=list)


class GroundingService:
    def __init__(self) -> None:
        self.formulas = self._load_set("formulas.json", FALLBACK_FORMULAS)
        self.herbs = self._load_set("herbs.json", FALLBACK_HERBS)
        # 한자→한글 보조 매핑 (한자 표기로 와도 매칭되도록)
        self._aliases = {
            "補中益氣湯": "보중익기탕", "六味地黃湯": "육미지황탕", "當歸": "당귀",
            "黃芪": "황기", "人蔘": "인삼", "甘草": "감초", "白朮": "백출",
        }

    def _load_set(self, filename: str, fallback: set[str]) -> set[str]:
        path = DATA_DIR / filename
        if not path.exists():
            logger.info("grounding: %s missing — using fallback set (%d items)", filename, len(fallback))
            return set(fallback)
        try:
            with path.open(encoding="utf-8") as f:
                items = json.load(f)
            return {str(x).strip() for x in items if str(x).strip()}
        except Exception as e:  # noqa: BLE001
            logger.warning("grounding: failed to load %s (%s) — fallback", filename, e)
            return set(fallback)

    def _normalize(self, name: str) -> str:
        if not name:
            return ""
        n = name.strip()
        return self._aliases.get(n, n)

    def is_known_formula(self, name: str) -> bool:
        return self._normalize(name) in self.formulas

    def is_known_herb(self, name: str) -> bool:
        return self._normalize(name) in self.herbs

    def reload(self) -> None:
        self.formulas = self._load_set("formulas.json", FALLBACK_FORMULAS)
        self.herbs = self._load_set("herbs.json", FALLBACK_HERBS)

    def ground_recommendations(self, payload: dict) -> GroundingResult:
        """LLM 추천 결과 dict 를 검증한다.

        Schema (일부 필드 옵션):
          {
            "recommendations": [
              {"formula_name": str, "herbs": [{"name": str, "amount": str, "role": str}], ...}
            ]
          }
        """
        warnings: list[str] = []
        if not isinstance(payload, dict):
            return GroundingResult(safe={}, warnings=["응답 형식이 잘못되었습니다."])

        recs = payload.get("recommendations") or []
        safe_recs: list[dict] = []
        for rec in recs:
            if not isinstance(rec, dict):
                continue
            formula_name = self._normalize(str(rec.get("formula_name", "")).strip())
            grounded_formula = self.is_known_formula(formula_name) if formula_name else False

            herbs = rec.get("herbs") or []
            grounded_herbs: list[dict] = []
            for h in herbs:
                if not isinstance(h, dict):
                    continue
                name = self._normalize(str(h.get("name", "")).strip())
                if not name:
                    continue
                if not self.is_known_herb(name):
                    warnings.append(
                        f"미확인 약재 '{h.get('name', '')}' 가 결과에서 제거되었습니다 (화이트리스트 미존재)."
                    )
                    continue
                grounded_herbs.append({**h, "name": name, "verified": True})

            # 처방명이 미확인이거나 약재가 0개면 결과에서 제외
            if not grounded_formula:
                warnings.append(
                    f"미확인 처방 '{rec.get('formula_name', '')}' 가 결과에서 제거되었습니다 (화이트리스트 미존재)."
                )
                continue
            if not grounded_herbs:
                warnings.append(
                    f"처방 '{formula_name}' 의 약재가 모두 미확인 — 결과에서 제거되었습니다."
                )
                continue

            safe_rec = {
                **rec,
                "formula_name": formula_name,
                "herbs": grounded_herbs,
                "verified": True,
                # 출처 표기 보장 — 누락 시 기본값으로 ‘참고용’
                "source": rec.get("source") or "온고지신 처방 DB (화이트리스트 검증)",
                # 신뢰도 cap — LLM 자가 보고 0.9 이상은 0.9 로 캡
                "confidence_score": min(float(rec.get("confidence_score", 0.6)), 0.9),
            }
            safe_recs.append(safe_rec)

        safe_payload = {
            **payload,
            "recommendations": safe_recs,
            "warnings": [*payload.get("warnings", []), *warnings],
            "grounded": True,
        }
        return GroundingResult(safe=safe_payload, warnings=warnings)


_grounding: GroundingService | None = None


def get_grounding_service() -> GroundingService:
    global _grounding
    if _grounding is None:
        _grounding = GroundingService()
    return _grounding
