"""
치험례 검색 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

from ...services.case_search_service import (
    case_search_service,
    CaseSearchRequest,
    PatientInfo,
    Symptom,
)

router = APIRouter(prefix="/cases", tags=["cases"])


# ============ Request/Response Models ============

class PatientInfoRequest(BaseModel):
    """환자 정보 요청"""
    age: Optional[int] = Field(None, ge=0, le=120, description="환자 나이")
    gender: Optional[str] = Field(None, description="성별 (M/F)")
    constitution: Optional[str] = Field(None, description="체질 (소음인/태음인/소양인/태양인)")


class SymptomRequest(BaseModel):
    """증상 요청"""
    name: str = Field(..., description="증상명")
    severity: Optional[int] = Field(None, ge=1, le=10, description="심각도 (1-10)")


class SearchOptionsRequest(BaseModel):
    """검색 옵션"""
    top_k: int = Field(10, ge=1, le=50, description="반환할 결과 수")
    min_confidence: float = Field(0, ge=0, le=100, description="최소 신뢰도 점수")
    data_source_filter: Optional[List[str]] = Field(None, description="데이터 소스 필터")


class CaseSearchRequestModel(BaseModel):
    """치험례 검색 요청"""
    patient_info: PatientInfoRequest = Field(default_factory=PatientInfoRequest)
    chief_complaint: str = Field(..., min_length=1, description="주소증")
    symptoms: List[SymptomRequest] = Field(default_factory=list, description="증상 목록")
    diagnosis: Optional[str] = Field(None, description="진단명/변증")
    formula: Optional[str] = Field(None, description="특정 처방으로 필터링")
    options: SearchOptionsRequest = Field(default_factory=SearchOptionsRequest)

    class Config:
        json_schema_extra = {
            "example": {
                "patient_info": {
                    "age": 65,
                    "gender": "M",
                    "constitution": "소음인"
                },
                "chief_complaint": "중풍",
                "symptoms": [
                    {"name": "반신마비", "severity": 8},
                    {"name": "언어장애", "severity": 6}
                ],
                "diagnosis": None,
                "formula": None,
                "options": {
                    "top_k": 10,
                    "min_confidence": 50
                }
            }
        }


class MatchScoreResponse(BaseModel):
    """매칭 점수"""
    total: float = Field(..., description="종합 점수 (0-100)")
    grade: str = Field(..., description="등급 (S/A/B/C/D)")
    grade_label: str = Field(..., description="등급 설명")
    vector_similarity: float = Field(..., description="벡터 유사도 점수")
    keyword_match: float = Field(..., description="키워드 매칭 점수")
    metadata_match: float = Field(..., description="메타데이터 매칭 점수")


class MatchReasonResponse(BaseModel):
    """매칭 근거"""
    type: str = Field(..., description="근거 유형")
    description: str = Field(..., description="근거 설명")
    contribution: float = Field(..., description="점수 기여도")


class MatchedCaseResponse(BaseModel):
    """매칭된 치험례"""
    case_id: str
    title: str
    formula_name: str
    formula_hanja: str
    chief_complaint: str
    symptoms: List[str]
    diagnosis: str
    patient_age: Optional[int]
    patient_gender: Optional[str]
    patient_constitution: Optional[str]
    treatment_formula: str
    data_source: str
    match_score: MatchScoreResponse
    match_reasons: List[MatchReasonResponse]


class SearchMetadataResponse(BaseModel):
    """검색 메타데이터"""
    processing_time_ms: float
    query_text: str
    vector_search_used: bool


class CaseSearchResponseModel(BaseModel):
    """치험례 검색 응답"""
    results: List[MatchedCaseResponse]
    total_found: int
    search_metadata: SearchMetadataResponse


# ============ API Endpoints ============

@router.post("/search", response_model=CaseSearchResponseModel)
async def search_cases(request: CaseSearchRequestModel):
    """
    치험례 검색

    환자 정보와 증상을 기반으로 유사한 치험례를 검색합니다.
    벡터 유사도 + 키워드 매칭 + 메타데이터 매칭을 종합한 하이브리드 점수로 순위를 매깁니다.
    """
    try:
        # 요청 변환
        search_request = CaseSearchRequest(
            patient_info=PatientInfo(
                age=request.patient_info.age,
                gender=request.patient_info.gender,
                constitution=request.patient_info.constitution,
            ),
            chief_complaint=request.chief_complaint,
            symptoms=[
                Symptom(name=s.name, severity=s.severity)
                for s in request.symptoms
            ],
            diagnosis=request.diagnosis,
            formula=request.formula,
            options={
                'top_k': request.options.top_k,
                'min_confidence': request.options.min_confidence,
            }
        )

        # 검색 실행
        response = await case_search_service.search(search_request)

        # 응답 변환
        return CaseSearchResponseModel(
            results=[
                MatchedCaseResponse(
                    case_id=r.case_id,
                    title=r.title,
                    formula_name=r.formula_name,
                    formula_hanja=r.formula_hanja,
                    chief_complaint=r.chief_complaint,
                    symptoms=r.symptoms,
                    diagnosis=r.diagnosis,
                    patient_age=r.patient_age,
                    patient_gender=r.patient_gender,
                    patient_constitution=r.patient_constitution,
                    treatment_formula=r.treatment_formula,
                    data_source=r.data_source,
                    match_score=MatchScoreResponse(**r.match_score),
                    match_reasons=[
                        MatchReasonResponse(**reason)
                        for reason in r.match_reasons
                    ]
                )
                for r in response.results
            ],
            total_found=response.total_found,
            search_metadata=SearchMetadataResponse(
                processing_time_ms=response.search_metadata['processing_time_ms'],
                query_text=response.search_metadata['query_text'],
                vector_search_used=response.search_metadata['vector_search_used'],
            )
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grades")
async def get_grade_info():
    """
    매칭 등급 정보 조회

    각 등급의 점수 범위, 설명, 색상 정보를 반환합니다.
    """
    from ...services.hybrid_scorer import GRADE_THRESHOLDS, HybridScorer, MatchGrade

    grades = []
    for grade in MatchGrade:
        min_score, max_score, label = GRADE_THRESHOLDS[grade]
        colors = HybridScorer.get_grade_color(grade)

        grades.append({
            "grade": grade.value,
            "min_score": min_score,
            "max_score": max_score,
            "label": label,
            "colors": colors
        })

    return {"grades": grades}


@router.get("/stats")
async def get_case_stats():
    """
    치험례 통계 조회

    인덱싱된 치험례의 통계 정보를 반환합니다.
    """
    import json
    from pathlib import Path

    data_file = Path(__file__).parent.parent.parent.parent / "data" / "extracted_cases.json"

    if not data_file.exists():
        return {
            "total_cases": 0,
            "indexed": False,
            "message": "치험례 데이터가 아직 추출되지 않았습니다."
        }

    with open(data_file, 'r', encoding='utf-8') as f:
        cases = json.load(f)

    # 통계 계산
    total = len(cases)
    with_constitution = sum(1 for c in cases if c.get('patient_constitution'))
    with_age = sum(1 for c in cases if c.get('patient_age'))
    with_gender = sum(1 for c in cases if c.get('patient_gender'))

    # 처방별 케이스 수
    formula_counts = {}
    for c in cases:
        formula = c.get('formula_name', 'Unknown')
        formula_counts[formula] = formula_counts.get(formula, 0) + 1

    top_formulas = sorted(
        formula_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]

    return {
        "total_cases": total,
        "indexed": True,
        "with_constitution": with_constitution,
        "with_age": with_age,
        "with_gender": with_gender,
        "top_formulas": [
            {"formula": f, "count": c} for f, c in top_formulas
        ]
    }
