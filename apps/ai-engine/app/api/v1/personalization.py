"""
개인화 학습 데이터 관리 엔드포인트.
- POST /personalization/record  : 처방 발행 시 한의사 패턴 학습
- DELETE /personalization/forget : 본인 학습 데이터 삭제 (개인정보보호법)
- GET /personalization/profile  : 현재 누적 통계 조회
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ...services.personalization import get_personalization_service

router = APIRouter()


class RecordPrescriptionRequest(BaseModel):
    formula_name: str = Field(..., min_length=1, max_length=80)
    herbs: Optional[List[str]] = None
    pattern: Optional[str] = Field(None, max_length=80)


@router.post("/record")
async def record_prescription(
    body: RecordPrescriptionRequest,
    x_user_id: Optional[str] = Header(default=None),
):
    if not x_user_id:
        raise HTTPException(status_code=400, detail="x-user-id 헤더가 필요합니다.")
    svc = get_personalization_service()
    svc.record_prescription(
        x_user_id,
        formula_name=body.formula_name,
        herbs=body.herbs,
        pattern=body.pattern,
    )
    return {"ok": True}


@router.delete("/forget")
async def forget(x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=400, detail="x-user-id 헤더가 필요합니다.")
    get_personalization_service().forget(x_user_id)
    return {"ok": True, "message": "개인화 학습 데이터가 삭제되었습니다."}


@router.get("/profile")
async def profile(x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=400, detail="x-user-id 헤더가 필요합니다.")
    svc = get_personalization_service()
    return {
        "topFormulas": svc.get_top_formulas(x_user_id, n=10),
        "styleHint": svc.style_hint(x_user_id),
    }
