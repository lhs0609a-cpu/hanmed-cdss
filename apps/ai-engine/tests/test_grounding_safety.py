"""
환자 안전 핵심 — GroundingService 검증.

검증 시나리오:
1) 화이트리스트 미존재 처방 → 결과에서 제거 + warning
2) 화이트리스트 미존재 약재 → 그 약재만 제거 + warning
3) 임산부 + 임산부 금기 본초(반하/부자/대황/도인/홍화 등) → 처방 전체 제외
4) 임산부 + 한자 표기 금기 본초(半夏, 大黃 등) → 동일하게 차단
5) 임산부 — chief_complaint 키워드("임신") 로도 추론
6) 노인(65세+) + 강한 사하제(대황/망초/파두/견우자) → 차단이 아니라 safety_flag 부착
7) 출전 인용(동의보감/PMID 등) 없으면 confidence_score 패널티 -0.2 + cap 0.85
8) safety_disclaimer / grounded:true / patient_safety 메타 강제 부착
9) recommendations 가 dict 가 아니면 빈 결과 + warning
"""

from app.services.grounding import GroundingService


def _make_rec(formula, herbs, *, confidence=0.9, source=""):
    return {
        "formula_name": formula,
        "herbs": [{"name": n, "amount": "4g", "role": "군"} for n in herbs],
        "confidence_score": confidence,
        "source": source,
    }


def test_unknown_formula_is_removed():
    svc = GroundingService()
    payload = {"recommendations": [_make_rec("환각탕XYZ", ["인삼", "감초"])]}
    result = svc.ground_recommendations(payload, patient_info={})
    assert result.safe["recommendations"] == []
    assert any("미확인 처방" in w for w in result.warnings)


def test_unknown_herb_is_filtered_but_formula_kept():
    svc = GroundingService()
    payload = {
        "recommendations": [
            _make_rec("보중익기탕", ["인삼", "감초", "환각본초XYZ"])
        ]
    }
    result = svc.ground_recommendations(payload, patient_info={})
    recs = result.safe["recommendations"]
    assert len(recs) == 1
    herb_names = [h["name"] for h in recs[0]["herbs"]]
    assert "환각본초XYZ" not in herb_names
    assert "인삼" in herb_names
    assert any("미확인 약재" in w for w in result.warnings)


def test_pregnancy_contraindicated_herb_blocks_formula():
    """임산부 금기 본초(반하) 포함 처방은 결과에서 완전히 제외."""
    svc = GroundingService()
    payload = {
        "recommendations": [
            _make_rec("이진탕", ["반하", "진피", "복령", "감초"])
        ]
    }
    result = svc.ground_recommendations(
        payload, patient_info={"pregnancy": True, "age": 30}
    )
    assert result.safe["recommendations"] == []
    assert any("임산부 금기" in w and "반하" in w for w in result.warnings)
    assert result.safe["patient_safety"]["is_pregnant"] is True


def test_pregnancy_hanja_herb_also_blocks():
    """한자 표기(半夏)로 와도 동일하게 임산부 금기로 처리."""
    svc = GroundingService()
    payload = {
        "recommendations": [
            _make_rec("이진탕", ["半夏", "陳皮", "茯苓", "甘草"])
        ]
    }
    # 진피/복령/감초 한자도 등록되어 있어야 하므로, 인삼 같은 등록된 한자만 사용
    payload2 = {
        "recommendations": [
            _make_rec("이진탕", ["半夏", "인삼", "감초", "백출"])
        ]
    }
    result = svc.ground_recommendations(
        payload2, patient_info={"is_pregnant": True}
    )
    assert result.safe["recommendations"] == [], "한자 半夏 도 임산부 금기로 차단되어야 함"


def test_pregnancy_inferred_from_chief_complaint():
    svc = GroundingService()
    payload = {
        "recommendations": [
            _make_rec("이진탕", ["반하", "인삼", "감초", "백출"])
        ]
    }
    result = svc.ground_recommendations(
        payload, patient_info={"chief_complaint": "임신 중 입덧", "age": 28}
    )
    assert result.safe["recommendations"] == []
    assert result.safe["patient_safety"]["is_pregnant"] is True


def test_pregnancy_inferred_from_symptoms_list():
    svc = GroundingService()
    payload = {
        "recommendations": [
            _make_rec("이진탕", ["반하", "인삼", "감초", "백출"])
        ]
    }
    result = svc.ground_recommendations(
        payload,
        patient_info={"symptoms": [{"name": "임산부 오심"}, {"name": "두통"}]},
    )
    assert result.safe["recommendations"] == []


def test_elderly_purgative_warns_but_does_not_block():
    """노인(65+) + 대황은 차단 X — safety_flags 로 강한 경고만."""
    svc = GroundingService()
    payload = {
        "recommendations": [
            _make_rec(
                "보중익기탕",
                ["대황", "인삼", "감초"],
                source="동의보감 잡병편",
            )
        ]
    }
    result = svc.ground_recommendations(payload, patient_info={"age": 72})
    recs = result.safe["recommendations"]
    assert len(recs) == 1, "노인은 차단 대신 경고"
    flags = recs[0]["safety_flags"]
    assert any("고령자" in f and "대황" in f for f in flags)
    assert result.safe["patient_safety"]["is_elderly"] is True


def test_non_elderly_purgative_no_elderly_flag():
    svc = GroundingService()
    payload = {
        "recommendations": [
            _make_rec(
                "보중익기탕",
                ["대황", "인삼", "감초"],
                source="동의보감",
            )
        ]
    }
    result = svc.ground_recommendations(payload, patient_info={"age": 40})
    recs = result.safe["recommendations"]
    assert len(recs) == 1
    assert not any("고령자" in f for f in recs[0]["safety_flags"])


def test_confidence_capped_and_citation_penalty():
    svc = GroundingService()
    # 출전 없음 + LLM 자가보고 0.99
    payload_no_cite = {
        "recommendations": [
            _make_rec("보중익기탕", ["인삼", "감초", "백출"], confidence=0.99, source="")
        ]
    }
    r1 = svc.ground_recommendations(payload_no_cite, patient_info={})
    assert r1.safe["recommendations"][0]["confidence_score"] <= 0.85
    assert r1.safe["recommendations"][0]["has_classical_citation"] is False

    # 출전 있음 + 0.99 → cap 0.85
    payload_cite = {
        "recommendations": [
            _make_rec(
                "보중익기탕",
                ["인삼", "감초", "백출"],
                confidence=0.99,
                source="동의보감 내경편",
            )
        ]
    }
    r2 = svc.ground_recommendations(payload_cite, patient_info={})
    assert r2.safe["recommendations"][0]["confidence_score"] == 0.85
    assert r2.safe["recommendations"][0]["has_classical_citation"] is True


def test_disclaimer_and_meta_always_attached():
    svc = GroundingService()
    payload = {
        "recommendations": [
            _make_rec("보중익기탕", ["인삼", "감초", "백출"], source="동의보감")
        ]
    }
    result = svc.ground_recommendations(payload, patient_info={"age": 40})
    assert result.safe["grounded"] is True
    assert "safety_disclaimer" in result.safe
    assert "한의사" in result.safe["safety_disclaimer"]
    assert result.safe["patient_safety"] == {"is_pregnant": False, "is_elderly": False}


def test_malformed_payload_returns_empty_safe():
    svc = GroundingService()
    result = svc.ground_recommendations("not-a-dict", patient_info=None)  # type: ignore[arg-type]
    assert result.safe == {}
    assert result.warnings  # 하나 이상 경고
