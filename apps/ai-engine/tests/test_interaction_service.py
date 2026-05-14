"""
양약-한약 상호작용 서비스 — CRITICAL 차단/경고 단위 테스트.
"""

import pytest

from app.services.interaction_service import (
    InteractionService,
    InteractionSeverity,
)


@pytest.fixture
def svc() -> InteractionService:
    return InteractionService()


async def test_critical_warfarin_danggui_detected(svc):
    """와파린 + 당귀 → CRITICAL — 출혈 위험으로 반드시 잡혀야 함."""
    result = await svc.check_interactions(herbs=["당귀"], medications=["와파린"])
    assert result.has_interactions is True
    assert result.total_count == 1
    assert len(result.by_severity["critical"]) == 1
    interaction = result.by_severity["critical"][0]
    assert interaction["severity"] == InteractionSeverity.CRITICAL.value
    assert "와파린" in interaction["drug_name"]
    assert "당귀" in interaction["herb_name"]
    assert result.overall_safety.startswith("위험")
    assert any("[긴급]" in r for r in result.recommendations)


async def test_critical_warfarin_dansam(svc):
    result = await svc.check_interactions(herbs=["단삼"], medications=["와파린"])
    assert len(result.by_severity["critical"]) == 1


async def test_warning_aspirin_ginkgo(svc):
    result = await svc.check_interactions(herbs=["은행잎"], medications=["아스피린"])
    assert len(result.by_severity["warning"]) == 1
    assert result.overall_safety.startswith("주의")
    assert any("모니터링" in r for r in result.recommendations)


async def test_no_interaction(svc):
    """알려진 상호작용 DB 에 없는 조합 — 안전 메시지."""
    result = await svc.check_interactions(herbs=["감초"], medications=["타이레놀"])
    assert result.has_interactions is False
    assert result.total_count == 0
    assert "알려진 상호작용이 발견되지 않았습니다" in " ".join(result.recommendations)


async def test_critical_takes_precedence_over_warning(svc):
    """CRITICAL + WARNING 동시 발견 시 overall_safety 는 위험."""
    result = await svc.check_interactions(
        herbs=["당귀", "은행잎"], medications=["와파린", "아스피린"]
    )
    assert len(result.by_severity["critical"]) >= 1
    assert len(result.by_severity["warning"]) >= 1
    assert result.overall_safety.startswith("위험")


async def test_case_insensitive_drug_match(svc):
    """약품명이 대문자/공백 섞여 와도 매칭되어야 함."""
    result = await svc.check_interactions(
        herbs=["당귀"], medications=[" 와파린 "]
    )
    assert result.has_interactions is True
    assert len(result.by_severity["critical"]) == 1


async def test_empty_input_safe(svc):
    result = await svc.check_interactions(herbs=[], medications=[])
    assert result.has_interactions is False
    assert result.total_count == 0
