"""
치험례 검색 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Query
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


@router.get("/list")
async def list_cases(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    search: Optional[str] = Query(None, description="검색어 (증상, 처방명, 변증)"),
    constitution: Optional[str] = Query(None, description="체질 필터"),
    outcome: Optional[str] = Query(None, description="결과 필터 (완치/호전/무효)"),
):
    """
    치험례 목록 조회 — 로컬 JSON 데이터 (all_cases_combined.json) 기반 페이지네이션/필터링.
    외부 데이터베이스 의존 없음.
    """
    try:
        rows = case_search_service._load_local_cases()

        # 필터링
        filtered = rows
        if search:
            q = search.lower()
            filtered = [
                r for r in filtered
                if q in (r.get("chief_complaint") or "").lower()
                or q in (r.get("formula_name") or "").lower()
                or q in (r.get("diagnosis") or "").lower()
                or q in (r.get("differentiation") or "").lower()
                or q in (r.get("title") or "").lower()
                or q in (r.get("full_text") or "").lower()
            ]
        if constitution:
            filtered = [
                r for r in filtered
                if (r.get("patient_constitution") or "") == constitution
            ]
        if outcome:
            filtered = [
                r for r in filtered
                if outcome in (r.get("result") or "")
            ]

        total = len(filtered)
        total_pages = (total + limit - 1) // limit if total > 0 else 0

        offset = (page - 1) * limit
        page_rows = filtered[offset: offset + limit]

        # 응답 포맷 변환
        cases = []
        for row in page_rows:
            # 성별 변환
            gender_raw = (row.get("patient_gender") or "").lower()
            if gender_raw == "male":
                gender = "M"
            elif gender_raw == "female":
                gender = "F"
            else:
                gender = ""

            symptoms = row.get("symptoms") or []
            if not isinstance(symptoms, list):
                symptoms = []

            cases.append({
                "id": str(row.get("id", "")),
                "title": (row.get("title") or row.get("chief_complaint") or "")[:100],
                "chiefComplaint": row.get("chief_complaint") or "",
                "symptoms": [s for s in symptoms if isinstance(s, str)][:10],
                "formulaName": row.get("formula_name") or "",
                "formulaHanja": row.get("formula_hanja") or "",
                "constitution": row.get("patient_constitution") or "",
                "diagnosis": row.get("diagnosis") or row.get("differentiation") or "",
                "patientAge": row.get("patient_age"),
                "patientGender": gender,
                "outcome": None,
                "result": row.get("result") or "",
                "originalText": row.get("full_text") or "",
                "dataSource": row.get("data_source") or row.get("source_file") or "local",
            })

        return {
            "cases": cases,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching cases: {str(e)}")


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
    치험례 통계 조회 — 로컬 JSON 데이터 기반 (외부 DB 의존 없음)
    """
    try:
        rows = case_search_service._load_local_cases()
        total = len(rows)

        with_constitution = sum(1 for r in rows if r.get("patient_constitution"))
        with_age = sum(1 for r in rows if r.get("patient_age") is not None)
        with_gender = sum(1 for r in rows if r.get("patient_gender"))
        with_result = sum(1 for r in rows if r.get("result"))
        real_count = sum(1 for r in rows if r.get("is_real_case"))

        # 처방명 빈도 상위
        formula_counts: Dict[str, int] = {}
        for r in rows:
            name = r.get("formula_name") or ""
            if name:
                formula_counts[name] = formula_counts.get(name, 0) + 1
        top_formulas = sorted(
            [{"name": k, "count": v} for k, v in formula_counts.items()],
            key=lambda x: x["count"],
            reverse=True,
        )[:10]

        return {
            "total_cases": total,
            "real_clinical_cases": real_count,
            "indication_based_cases": total - real_count,
            "indexed": True,
            "with_constitution": with_constitution,
            "with_age": with_age,
            "with_gender": with_gender,
            "with_result": with_result,
            "top_formulas": top_formulas,
            "data_source": "local",
        }

    except Exception as e:
        return {
            "total_cases": 0,
            "indexed": False,
            "message": f"Error: {str(e)}",
        }
