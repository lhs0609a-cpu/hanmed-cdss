from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from ...services.llm_service import LLMService
from ...services.rag_service import RAGService
from ...core.concurrency import CapacityExceeded
from ...core.pii import sanitize_user_input

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
    top_k: int = Field(default=3, ge=1, le=5)

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
    analysis: str
    modifications: Optional[str] = None
    cautions: Optional[str] = None
    note: Optional[str] = None
    warnings: Optional[List[str]] = None
    source: Optional[str] = None
    disclaimer: Optional[str] = None
    generated_at: Optional[str] = None
    model: Optional[str] = None
    grounded: Optional[bool] = None
    cache_hit: Optional[bool] = None

@router.post("/", response_model=RecommendationResponse)
async def get_prescription_recommendation(
    request: Request,
    rec_request: RecommendationRequest,
    x_user_id: Optional[str] = Header(default=None),
):
    """
    AI 기반 처방 추론 후보 (GPT-4o-mini → 4o → 더미 폴백)

    환자 정보와 증상을 분석하여 적합한 한약 처방 후보를 제시합니다.
    이 결과는 참고용이며 의료법상 진단·처방 행위가 아닙니다.
    """
    llm_service = LLMService()
    rag_service = RAGService(llm_service)

    # 입력 살균 — 라우터 레벨에서 1차 차단
    chief_complaint = sanitize_user_input(rec_request.chief_complaint, max_length=600)
    symptoms = [
        {**s.model_dump(), 'name': sanitize_user_input(s.name, max_length=80)}
        for s in rec_request.symptoms
    ]

    patient_info = {
        'age': rec_request.patient_age,
        'gender': rec_request.patient_gender,
        'constitution': rec_request.constitution,
        'chief_complaint': chief_complaint,
        'symptoms': symptoms,
        'current_medications': rec_request.current_medications,
    }

    try:
        result = await rag_service.get_recommendation(
            patient_info=patient_info,
            top_k=rec_request.top_k,
            user_id=x_user_id,
        )
    except CapacityExceeded as e:
        # 사용자에게 친화 메시지 + Retry-After 헤더
        retry_after = int(e.retry_after_seconds or 2)
        raise HTTPException(
            status_code=429,
            detail={
                "message": e.reason,
                "retryAfterSeconds": retry_after,
                "userMessage": "현재 요청이 많아 잠시 후 다시 시도해주세요.",
            },
            headers={"Retry-After": str(retry_after)},
        )
    except Exception as e:
        # 내부 예외는 사용자에게 그대로 노출하지 않는다 (500)
        raise HTTPException(
            status_code=500,
            detail={
                "message": "추천 생성 중 오류가 발생했습니다.",
                "userMessage": "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
            },
        ) from e

    # 응답 구성
    recommendations: List[FormulaRecommendation] = []
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
        analysis=result.get('analysis', ''),
        modifications=result.get('modifications'),
        cautions=result.get('cautions'),
        note=result.get('note'),
        warnings=result.get('warnings') or None,
        source=result.get('source'),
        disclaimer=result.get('disclaimer'),
        generated_at=result.get('generated_at'),
        model=result.get('model'),
        grounded=result.get('grounded'),
        cache_hit=result.get('cache_hit'),
    )
