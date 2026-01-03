"""
치험례 수집기 관리 API
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional

from ...services.collector import collector_scheduler

router = APIRouter(prefix="/collector", tags=["collector"])


# ============ Request/Response Models ============

class CollectionRequest(BaseModel):
    """수집 요청"""
    sources: Optional[List[str]] = Field(None, description="수집 소스 (기본: 전체)")
    keywords: Optional[List[str]] = Field(None, description="검색 키워드 (기본: 치험례 관련)")
    max_articles: int = Field(50, ge=1, le=200, description="최대 논문 수")


class ApproveRequest(BaseModel):
    """케이스 승인 요청"""
    case_ids: List[str] = Field(..., description="승인할 케이스 ID 목록")


class RejectRequest(BaseModel):
    """케이스 거부 요청"""
    case_ids: List[str] = Field(..., description="거부할 케이스 ID 목록")
    reason: str = Field("", description="거부 사유")


# ============ API Endpoints ============

@router.get("/status")
async def get_collector_status():
    """
    수집기 상태 조회

    현재 수집 상태, 마지막 실행 결과, 다음 예정 시간 등을 반환합니다.
    """
    return collector_scheduler.get_status()


@router.post("/run")
async def trigger_collection(
    request: CollectionRequest,
    background_tasks: BackgroundTasks
):
    """
    수집 수동 실행

    백그라운드에서 수집을 실행하고 즉시 응답합니다.
    """
    if collector_scheduler.is_running:
        raise HTTPException(
            status_code=409,
            detail="Collection is already in progress"
        )

    # 백그라운드에서 실행
    background_tasks.add_task(
        collector_scheduler.run_collection,
        sources=request.sources,
        keywords=request.keywords,
        max_articles=request.max_articles,
    )

    return {
        "message": "Collection started",
        "sources": request.sources or list(collector_scheduler.adapters.keys()),
        "max_articles": request.max_articles,
    }


@router.get("/logs")
async def get_collection_logs(limit: int = 50):
    """
    수집 로그 조회

    최근 수집 로그를 반환합니다.
    """
    logs = collector_scheduler.storage.get_collection_logs(limit)
    return {"logs": logs, "count": len(logs)}


@router.get("/pending")
async def get_pending_cases(limit: int = 50, offset: int = 0):
    """
    대기 중인 케이스 목록

    검토 대기 중인 케이스 목록을 반환합니다.
    """
    pending = collector_scheduler.storage.load_pending_cases()

    # 페이지네이션
    total = len(pending)
    paginated = pending[offset:offset + limit]

    return {
        "cases": paginated,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/approve")
async def approve_cases(request: ApproveRequest):
    """
    케이스 승인

    대기 중인 케이스를 승인하여 통합 데이터에 추가합니다.
    """
    count = collector_scheduler.storage.approve_cases(request.case_ids)

    return {
        "message": f"{count} cases approved",
        "approved_count": count,
    }


@router.post("/reject")
async def reject_cases(request: RejectRequest):
    """
    케이스 거부

    대기 중인 케이스를 거부합니다.
    """
    count = collector_scheduler.storage.reject_cases(
        request.case_ids,
        request.reason
    )

    return {
        "message": f"{count} cases rejected",
        "rejected_count": count,
    }


@router.post("/auto-approve")
async def auto_approve_high_confidence(threshold: float = 0.9):
    """
    고신뢰도 케이스 자동 승인

    지정된 신뢰도 이상의 케이스를 자동으로 승인합니다.
    """
    count = collector_scheduler.storage.auto_approve_high_confidence(threshold)

    return {
        "message": f"{count} cases auto-approved",
        "approved_count": count,
        "threshold": threshold,
    }


@router.get("/stats")
async def get_storage_stats():
    """
    저장소 통계

    수집된 케이스 통계 정보를 반환합니다.
    """
    return collector_scheduler.storage.get_stats()
