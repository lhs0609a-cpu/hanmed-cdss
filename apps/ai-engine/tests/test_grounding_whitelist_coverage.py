"""
그라운딩 화이트리스트 커버리지 회귀 방지.

배경: app/data/grounding/{formulas,herbs}.json 이 없으면 grounding.py 는 코드에 박힌
폴백(처방 23·약재 34)만 써서, 정상 추천의 대부분을 "환각"으로 오판해 잘라냈다.
그 결과 후보가 1개만 사용자에게 도달하고 처방에서 약재가 임의로 빠졌다.

이 테스트는 다음을 보장한다:
  1) 생성된 화이트리스트 파일이 존재하고, 폴백보다 충분히 크다.
  2) 대표 처방/약재(보중익기탕 10味 등)가 통째로 통과한다(약재 누락 0).
  3) 여러 후보를 넣으면 여러 개가 통과한다(1개로 쪼그라들지 않는다).
  4) 그러면서도 환각·임산부 금기 필터는 여전히 작동한다.

파일이 사라지거나(폴백 회귀) 명단이 축소되면 여기서 실패한다.
갱신: python apps/ai-engine/scripts/build_grounding_whitelist.py
"""

import json
from pathlib import Path

from app.services.grounding import GroundingService

GROUNDING_DIR = Path(__file__).resolve().parents[1] / "app" / "data" / "grounding"


def _load(name: str) -> list[str]:
    path = GROUNDING_DIR / name
    assert path.exists(), f"{name} 이 없습니다 — build_grounding_whitelist.py 를 실행하세요"
    return json.loads(path.read_text(encoding="utf-8"))


def test_whitelist_files_exist_and_are_substantial():
    formulas = _load("formulas.json")
    herbs = _load("herbs.json")
    # 폴백(처방 23·약재 34)을 크게 웃돌아야 실데이터로 채워진 것
    assert len(formulas) >= 200, f"처방 화이트리스트가 너무 작다: {len(formulas)}"
    assert len(herbs) >= 150, f"약재 화이트리스트가 너무 작다: {len(herbs)}"


def test_representative_formula_passes_with_all_herbs():
    """보중익기탕 10味 전체가 약재 누락 없이 통과해야 한다."""
    svc = GroundingService()
    svc.reload()  # 파일에서 다시 로드
    herbs = ["인삼", "백출", "황기", "당귀", "감초", "창출", "생강", "진피", "승마", "시호"]
    payload = {
        "recommendations": [
            {
                "formula_name": "보중익기탕",
                "herbs": [{"name": n, "amount": "4g", "role": "군"} for n in herbs],
                "confidence_score": 0.8,
                "source": "동의보감",
            }
        ]
    }
    result = svc.ground_recommendations(payload, patient_info={"age": 45})
    recs = result.safe["recommendations"]
    assert len(recs) == 1
    assert len(recs[0]["herbs"]) == len(herbs), "약재가 임의로 제거되었다"
    dropped = [w for w in result.warnings if "미확인 약재" in w]
    assert not dropped, f"정상 약재가 잘렸다: {dropped}"


def test_multiple_candidates_survive():
    """여러 후보를 넣으면 여러 개가 통과해야 한다(1개로 쪼그라들지 않음)."""
    svc = GroundingService()
    svc.reload()
    payload = {
        "recommendations": [
            {
                "formula_name": "보중익기탕",
                "herbs": [{"name": "인삼"}, {"name": "황기"}, {"name": "백출"}],
                "source": "동의보감",
            },
            {
                "formula_name": "육군자탕",
                "herbs": [{"name": "인삼"}, {"name": "백출"}, {"name": "복령"}, {"name": "반하"}],
                "source": "동의보감",
            },
            {
                "formula_name": "삼출건비탕",
                "herbs": [{"name": "인삼"}, {"name": "백출"}, {"name": "복령"}],
                "source": "방약합편",
            },
        ]
    }
    result = svc.ground_recommendations(payload, patient_info={"age": 40})
    assert len(result.safe["recommendations"]) == 3


def test_hallucinated_formula_still_blocked():
    """화이트리스트가 커졌어도 존재하지 않는 처방은 여전히 차단."""
    svc = GroundingService()
    svc.reload()
    payload = {
        "recommendations": [
            {"formula_name": "환각보정탕XYZ", "herbs": [{"name": "인삼"}], "source": "동의보감"}
        ]
    }
    result = svc.ground_recommendations(payload, patient_info={})
    assert result.safe["recommendations"] == []
    assert any("미확인 처방" in w for w in result.warnings)


def test_pregnancy_contraindication_still_blocks():
    """임산부 금기 본초(반하) 포함 처방은 화이트리스트와 무관하게 차단."""
    svc = GroundingService()
    svc.reload()
    payload = {
        "recommendations": [
            {
                "formula_name": "육군자탕",
                "herbs": [{"name": "인삼"}, {"name": "반하"}],
                "source": "동의보감",
            }
        ]
    }
    result = svc.ground_recommendations(payload, patient_info={"pregnancy": True})
    assert result.safe["recommendations"] == []
    assert any("임산부 금기" in w for w in result.warnings)
