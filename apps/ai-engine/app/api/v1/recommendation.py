from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from ...services.vector_service import VectorService
from ...services.llm_service import LLMService
from ...services.rag_service import RAGService

router = APIRouter()

class SymptomInput(BaseModel):
    name: str
    severity: Optional[int] = Field(None, ge=1, le=10)
    duration: Optional[str] = None

class RecommendationRequest(BaseModel):
    patient_age: Optional[int] = Field(None, description="환자 나이")
    patient_gender: Optional[str] = Field(None, description="성별 (male/female)")
    constitution: Optional[str] = Field(None, description="체질")
    chief_complaint: str = Field(..., description="주소증")
    symptoms: List[SymptomInput] = Field(default=[], description="증상 목록")
    current_medications: Optional[List[str]] = Field(None, description="현재 복용 중인 양약")
    top_k: int = Field(default=5, ge=1, le=20)

class HerbInfo(BaseModel):
    name: str
    amount: str
    role: str  # 군/신/좌/사

class FormulaRecommendation(BaseModel):
    formula_name: str
    confidence_score: float
    herbs: List[HerbInfo]
    rationale: str

class RecommendationResponse(BaseModel):
    recommendations: List[FormulaRecommendation]
    similar_cases: List[Dict[str, Any]]
    analysis: str
    note: Optional[str] = None

@router.post("/", response_model=RecommendationResponse)
async def get_prescription_recommendation(
    request: Request,
    rec_request: RecommendationRequest,
):
    """
    AI 기반 처방 추천

    환자 정보와 증상을 분석하여 적합한 한약 처방을 추천합니다.
    유사 치험례를 검색하고 LLM을 통해 최적의 처방을 제안합니다.
    """
    # 서비스 초기화
    vector_service = getattr(request.app.state, 'vector_service', None)

    if not vector_service:
        vector_service = VectorService()

    llm_service = LLMService()
    rag_service = RAGService(vector_service, llm_service)

    # 환자 정보 구성
    patient_info = {
        'age': rec_request.patient_age,
        'gender': rec_request.patient_gender,
        'constitution': rec_request.constitution,
        'chief_complaint': rec_request.chief_complaint,
        'symptoms': [s.model_dump() for s in rec_request.symptoms],
        'current_medications': rec_request.current_medications,
    }

    try:
        # RAG 추천 실행
        result = await rag_service.get_recommendation(
            patient_info=patient_info,
            top_k=rec_request.top_k,
        )

        # 응답 구성
        recommendations = []
        for rec in result.get('recommendations', []):
            herbs = [
                HerbInfo(
                    name=h.get('name', ''),
                    amount=h.get('amount', ''),
                    role=h.get('role', ''),
                )
                for h in rec.get('herbs', [])
            ]
            recommendations.append(FormulaRecommendation(
                formula_name=rec.get('formula_name', ''),
                confidence_score=rec.get('confidence_score', 0),
                herbs=herbs,
                rationale=rec.get('rationale', ''),
            ))

        return RecommendationResponse(
            recommendations=recommendations,
            similar_cases=result.get('similar_cases', []),
            analysis=result.get('analysis', ''),
            note=result.get('note'),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추천 생성 중 오류: {str(e)}")
