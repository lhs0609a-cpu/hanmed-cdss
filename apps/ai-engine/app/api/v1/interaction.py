from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict

from ...services.interaction_service import InteractionService

router = APIRouter()

class InteractionCheckRequest(BaseModel):
    herbs: List[str] = Field(..., description="처방에 포함된 한약재 목록")
    medications: List[str] = Field(..., description="환자가 복용 중인 양약 목록")

class InteractionDetail(BaseModel):
    drug_name: str
    herb_name: str
    severity: str
    mechanism: str
    recommendation: str

class InteractionCheckResponse(BaseModel):
    has_interactions: bool
    total_count: int
    by_severity: Dict[str, List[InteractionDetail]]
    overall_safety: str
    recommendations: List[str]

@router.post("/check", response_model=InteractionCheckResponse)
async def check_drug_herb_interactions(
    request: InteractionCheckRequest,
):
    """
    양약-한약 상호작용 검사

    처방하려는 한약재와 환자가 복용 중인 양약 간의
    잠재적 상호작용을 검사합니다.

    ## 심각도 분류
    - **critical**: 병용 금기. 심각한 부작용 우려
    - **warning**: 주의 필요. 모니터링 권고
    - **info**: 참고 정보. 임상적 유의성 낮음
    """
    if not request.herbs:
        raise HTTPException(status_code=400, detail="약재 목록이 비어있습니다.")

    if not request.medications:
        return InteractionCheckResponse(
            has_interactions=False,
            total_count=0,
            by_severity={"critical": [], "warning": [], "info": []},
            overall_safety="복용 중인 양약이 없어 상호작용 검사가 필요하지 않습니다.",
            recommendations=["복용 중인 양약이 없습니다."],
        )

    interaction_service = InteractionService()

    try:
        result = await interaction_service.check_interactions(
            herbs=request.herbs,
            medications=request.medications,
        )

        return InteractionCheckResponse(
            has_interactions=result.has_interactions,
            total_count=result.total_count,
            by_severity=result.by_severity,
            overall_safety=result.overall_safety,
            recommendations=result.recommendations,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상호작용 검사 중 오류: {str(e)}")

@router.get("/known-drugs")
async def get_known_drugs():
    """
    상호작용 DB에 등록된 양약 목록 조회
    """
    known_drugs = set()
    for (drug, herb) in InteractionService.KNOWN_INTERACTIONS.keys():
        known_drugs.add(drug)

    return {
        "count": len(known_drugs),
        "drugs": sorted(list(known_drugs)),
    }

@router.get("/known-herbs")
async def get_known_herbs():
    """
    상호작용 DB에 등록된 한약재 목록 조회
    """
    known_herbs = set()
    for (drug, herb) in InteractionService.KNOWN_INTERACTIONS.keys():
        known_herbs.add(herb)

    return {
        "count": len(known_herbs),
        "herbs": sorted(list(known_herbs)),
    }
