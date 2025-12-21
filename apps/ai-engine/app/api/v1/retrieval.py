from fastapi import APIRouter, Request, HTTPException
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

@router.post("/search", response_model=SearchResponse)
async def search_similar_cases(
    request: Request,
    search_request: SearchRequest,
):
    """
    증상 기반 유사 치험례 검색

    RAG 파이프라인을 사용하여 입력된 증상과 유사한 치험례를 검색합니다.
    """
    # 증상 텍스트 구성
    query = ", ".join(search_request.symptoms)

    # Vector 서비스 가져오기
    vector_service = getattr(request.app.state, 'vector_service', None)

    if not vector_service:
        # 더미 결과 반환
        return SearchResponse(
            query=query,
            total_results=2,
            results=[
                CaseMatch(
                    case_id="LEE-1995-0001",
                    similarity_score=0.95,
                    chief_complaint="소화불량, 복부 냉증",
                    symptoms="식욕부진, 복부팽만, 수족냉증",
                    formula_name="이중탕",
                ),
                CaseMatch(
                    case_id="LEE-1997-0342",
                    similarity_score=0.89,
                    chief_complaint="비위허한, 식체",
                    symptoms="소화불량, 권태감, 설사",
                    formula_name="육군자탕",
                ),
            ]
        )

    # 실제 검색 수행
    filter_dict = {"type": "symptoms"}
    if search_request.constitution:
        filter_dict["constitution"] = search_request.constitution

    try:
        results = await vector_service.search(
            query=query,
            filter_dict=filter_dict,
            top_k=search_request.top_k,
        )

        case_matches = []
        for match in results:
            meta = match.get('metadata', {})
            case_matches.append(CaseMatch(
                case_id=meta.get('case_id', 'N/A'),
                similarity_score=match.get('score', 0),
                chief_complaint=meta.get('chief_complaint', ''),
                symptoms=meta.get('symptoms', ''),
                formula_name=meta.get('formula_name'),
            ))

        return SearchResponse(
            query=query,
            total_results=len(case_matches),
            results=case_matches,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"검색 중 오류 발생: {str(e)}")
