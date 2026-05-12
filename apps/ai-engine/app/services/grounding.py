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

# 임산부 금기 본초 — 동의보감·중약대사전·KFDA 임산부 사용제한 기준
# 사하·축수·파혈·통경·독성 본초 위주. 한자 표기는 _aliases 매핑으로 함께 처리.
PREGNANCY_CONTRAINDICATED_HERBS = {
    "반하", "부자", "마황", "대황", "망초", "견우자", "파두",
    "원화", "감수", "대극", "상륙", "사간", "천오", "초오",
    "도인", "홍화", "삼릉", "아출", "자충", "수질", "맹충",
    "우슬",  # 통경·하행 작용 — 임신 중 유산 위험
    "의이인",  # 다량 시 자궁 수축 가능성 — '다량' 조건은 임상 판단에 위임
}

# 노인(65세+) 신중투여 — 강한 사하제로 탈수·전해질 이상 위험
ELDERLY_CAUTION_HERBS = {
    "대황", "망초", "파두", "견우자",
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
            # 임산부 금기 본초의 한자 표기 — 한자/한글 어느 쪽으로 와도 차단
            "半夏": "반하", "附子": "부자", "麻黃": "마황", "大黃": "대황",
            "芒硝": "망초", "牽牛子": "견우자", "巴豆": "파두", "芫花": "원화",
            "甘遂": "감수", "大戟": "대극", "商陸": "상륙", "射干": "사간",
            "川烏": "천오", "草烏": "초오", "桃仁": "도인", "紅花": "홍화",
            "三稜": "삼릉", "莪朮": "아출", "蟅蟲": "자충", "水蛭": "수질",
            "虻蟲": "맹충", "牛膝": "우슬", "薏苡仁": "의이인",
        }
        self.pregnancy_contraindicated = set(PREGNANCY_CONTRAINDICATED_HERBS)
        self.elderly_caution = set(ELDERLY_CAUTION_HERBS)

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

    @staticmethod
    def _is_pregnant(patient_info: dict | None) -> bool:
        """patient_info 구조에서 임신 상태 추론 — 명시 필드 + 키워드 fallback."""
        if not isinstance(patient_info, dict):
            return False
        if bool(patient_info.get("pregnancy")) or bool(patient_info.get("is_pregnant")):
            return True
        # chief_complaint / symptoms 에 '임신/임산부' 키워드가 들어오면 안전측으로 True
        cc = str(patient_info.get("chief_complaint") or "")
        if "임신" in cc or "임산부" in cc or "pregnan" in cc.lower():
            return True
        for s in patient_info.get("symptoms") or []:
            name = s.get("name", "") if isinstance(s, dict) else str(s)
            if "임신" in name or "임산부" in name:
                return True
        return False

    @staticmethod
    def _is_elderly(patient_info: dict | None, threshold: int = 65) -> bool:
        if not isinstance(patient_info, dict):
            return False
        age = patient_info.get("age")
        try:
            return age is not None and int(age) >= threshold
        except (TypeError, ValueError):
            return False

    def ground_recommendations(
        self,
        payload: dict,
        patient_info: dict | None = None,
    ) -> GroundingResult:
        """LLM 추천 결과 dict 를 검증한다.

        Schema (일부 필드 옵션):
          {
            "recommendations": [
              {"formula_name": str, "herbs": [{"name": str, "amount": str, "role": str}], ...}
            ]
          }

        patient_info 가 임산부/고령자 정보를 포함하면 금기 본초가 들어간 처방을
        결과에서 제거(blocked)하거나 강한 경고로 마킹한다.
        """
        warnings: list[str] = []
        if not isinstance(payload, dict):
            return GroundingResult(safe={}, warnings=["응답 형식이 잘못되었습니다."])

        is_pregnant = self._is_pregnant(patient_info)
        is_elderly = self._is_elderly(patient_info)

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

            # === 임산부/노인 금기 필터 ===
            herb_names_in_rec = {h["name"] for h in grounded_herbs}
            pregnancy_hits = sorted(herb_names_in_rec & self.pregnancy_contraindicated)
            elderly_hits = sorted(herb_names_in_rec & self.elderly_caution)

            if is_pregnant and pregnancy_hits:
                # 환자안전상 추천 자체에서 제외 — 환각·오용 차단
                warnings.append(
                    f"임산부 금기 본초({', '.join(pregnancy_hits)}) 포함으로 처방 '{formula_name}' 가 결과에서 제외되었습니다."
                )
                continue

            safety_flags: list[str] = []
            if is_elderly and elderly_hits:
                # 노인은 차단 대신 강한 경고 — 임상 판단 여지 보존
                safety_flags.append(
                    f"고령자(≥65세)에서 강한 사하제({', '.join(elderly_hits)})는 탈수·전해질 이상 위험. 용량·복용기간 신중."
                )
            if is_pregnant:
                # 임산부 환자의 경우 통과한 처방에도 일반 경고 부착
                safety_flags.append("임신 중에는 본 처방도 한의사의 직접 진찰 하에서만 사용하십시오.")

            # LLM 출전(고전 인용) 누락 시 confidence -0.2 패널티
            source_text = str(rec.get("source") or "").strip()
            has_citation = any(
                k in source_text
                for k in ("동의보감", "상한론", "금궤요략", "방약합편", "의학입문", "본초강목", "PMID", "DOI")
            )
            base_conf = float(rec.get("confidence_score", 0.6))
            if not has_citation:
                base_conf = max(0.0, base_conf - 0.2)

            safe_rec = {
                **rec,
                "formula_name": formula_name,
                "herbs": grounded_herbs,
                "verified": True,
                # 출처 표기 보장 — 누락 시 기본값으로 '참고용'
                "source": source_text or "온고지신 처방 DB (화이트리스트 검증) — 고전 출전 미인용",
                "has_classical_citation": has_citation,
                # 신뢰도 cap — LLM 자가 보고 0.85 이상은 0.85 로 캡 (의료기기 미인증 단계)
                "confidence_score": min(base_conf, 0.85),
                "safety_flags": safety_flags,
            }
            safe_recs.append(safe_rec)

        safe_payload = {
            **payload,
            "recommendations": safe_recs,
            "warnings": [*payload.get("warnings", []), *warnings],
            "grounded": True,
            # 모든 응답에 강제 부착되는 면책 — UI/PDF/감사로그에서 분리 노출하기 쉽도록 별도 필드
            "safety_disclaimer": (
                "본 결과는 임상 보조 정보이며, 최종 진단·처방은 한의사 판단입니다. "
                "의료기기 인증 신청 진행 중."
            ),
            "patient_safety": {
                "is_pregnant": is_pregnant,
                "is_elderly": is_elderly,
            },
        }
        return GroundingResult(safe=safe_payload, warnings=warnings)


_grounding: GroundingService | None = None


def get_grounding_service() -> GroundingService:
    global _grounding
    if _grounding is None:
        _grounding = GroundingService()
    return _grounding
