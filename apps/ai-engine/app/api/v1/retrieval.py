from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter()

class SearchRequest(BaseModel):
    symptoms: List[str] = Field(..., description="검색할 증상 목록")
    constitution: Optional[str] = Field(None, description="체질 (태양인/태음인/소양인/소음인)")
    top_k: int = Field(default=10, ge=1, le=50, description="반환할 결과 수")

class CaseMatch(BaseModel):
    case_id: str
    similarity_score: float
    chief_complaint: str
    symptoms: str
    formula_name: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[CaseMatch]
    note: str

@router.post("/search", response_model=SearchResponse)
async def search_similar_cases(
    search_request: SearchRequest,
):
    """
    증상 기반 유사 치험례 검색 (더미 데이터)
    
    Note: 현재 벡터 DB가 비활성화되어 있어 더미 데이터를 반환합니다.
    실제 처방 추천은 /api/v1/recommend 엔드포인트를 사용하세요.
    """
    query = ", ".join(search_request.symptoms)
    
    return SearchResponse(
        query=query,
        total_results=2,
        results=[
            CaseMatch(
                case_id="SAMPLE-001",
                similarity_score=0.92,
                chief_complaint="소화불량, 복부 냉증",
                symptoms="식욕부진, 복부팽만, 수족냉증",
                formula_name="이중탕",
            ),
            CaseMatch(
                case_id="SAMPLE-002",
                similarity_score=0.87,
                chief_complaint="비위허한, 식체",
                symptoms="소화불량, 권태감, 설사",
                formula_name="육군자탕",
            ),
        ],
        note="벡터 DB 비활성화 - 더미 데이터입니다. /api/v1/recommend 엔드포인트로 GPT 기반 추천을 받으세요."
    )
