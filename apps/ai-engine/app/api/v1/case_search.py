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
    치험례 목록 조회

    Supabase에서 페이지네이션과 필터링을 지원하는 치험례 목록을 반환합니다.
    """
    import httpx
    from ...core.config import settings

    SUPABASE_URL = settings.SUPABASE_URL
    SUPABASE_KEY = settings.SUPABASE_KEY

    if not SUPABASE_KEY:
        # Fallback: 환경변수에서 직접 가져오기
        import os
        SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

    if not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase key not configured")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient() as client:
            # 총 개수 조회
            count_headers = {**headers, "Prefer": "count=exact"}
            count_params = {"select": "id", "limit": "1"}

            # 필터 조건 구성
            if search:
                count_params["or"] = f"(chiefComplaint.ilike.%{search}%,originalText.ilike.%{search}%)"
            if constitution:
                count_params["patientConstitution"] = f"eq.{constitution}"

            count_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/clinical_cases",
                headers=count_headers,
                params=count_params
            )

            total = 0
            content_range = count_response.headers.get("content-range", "")
            if "/" in content_range:
                total_str = content_range.split("/")[-1]
                if total_str != "*":
                    total = int(total_str)

            total_pages = (total + limit - 1) // limit if total > 0 else 0

            # 데이터 조회
            offset = (page - 1) * limit
            data_params = {
                "select": "id,sourceId,chiefComplaint,originalText,patientGender,patientAgeRange,patientConstitution,herbalFormulas,symptoms,patternDiagnosis,clinicalNotes,recordedYear,recorderName",
                "order": "createdAt.desc",
                "offset": str(offset),
                "limit": str(limit)
            }

            if search:
                data_params["or"] = f"(chiefComplaint.ilike.%{search}%,originalText.ilike.%{search}%)"
            if constitution:
                data_params["patientConstitution"] = f"eq.{constitution}"

            data_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/clinical_cases",
                headers=headers,
                params=data_params
            )

            if data_response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"Supabase error: {data_response.text}"
                )

            rows = data_response.json()

            # 응답 형식 변환
            cases = []
            for row in rows:
                # 처방명 추출
                formulas = row.get("herbalFormulas") or []
                formula_name = formulas[0].get("name", "") if formulas else ""

                # 증상 추출
                symptoms_data = row.get("symptoms") or []
                symptoms = []
                if isinstance(symptoms_data, list):
                    for s in symptoms_data:
                        if isinstance(s, dict):
                            symptoms.append(s.get("description", s.get("type", "")))
                        elif isinstance(s, str):
                            symptoms.append(s)

                # 성별 변환
                gender = row.get("patientGender", "")
                if gender == "male":
                    gender = "M"
                elif gender == "female":
                    gender = "F"

                # 나이 추출 (연령대에서)
                age_range = row.get("patientAgeRange", "")
                patient_age = None
                if age_range:
                    import re
                    match = re.search(r'(\d+)', age_range)
                    if match:
                        patient_age = int(match.group(1))

                cases.append({
                    "id": str(row.get("id", "")),
                    "title": row.get("chiefComplaint", "")[:100] if row.get("chiefComplaint") else "",
                    "chiefComplaint": row.get("chiefComplaint", "") or "",
                    "symptoms": symptoms[:5] if symptoms else [],
                    "formulaName": formula_name,
                    "formulaHanja": "",
                    "constitution": row.get("patientConstitution", "") or "",
                    "diagnosis": row.get("patternDiagnosis", "") or "",
                    "patientAge": patient_age,
                    "patientGender": gender,
                    "outcome": None,
                    "result": row.get("clinicalNotes", "")[:200] if row.get("clinicalNotes") else "",
                    "dataSource": row.get("sourceId", "supabase"),
                })

            return {
                "cases": cases,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": total_pages
            }

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"HTTP error: {str(e)}")
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
    치험례 통계 조회

    Supabase에서 치험례의 통계 정보를 반환합니다.
    """
    import httpx
    import os
    from ...core.config import settings

    SUPABASE_URL = settings.SUPABASE_URL
    SUPABASE_KEY = settings.SUPABASE_KEY or os.environ.get('SUPABASE_KEY', '')

    if not SUPABASE_KEY:
        return {
            "total_cases": 0,
            "indexed": False,
            "message": "Supabase key not configured"
        }

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "count=exact"
    }

    try:
        async with httpx.AsyncClient() as client:
            # 총 개수
            response = await client.get(
                f"{SUPABASE_URL}/rest/v1/clinical_cases",
                headers=headers,
                params={"select": "id", "limit": "1"}
            )

            total = 0
            content_range = response.headers.get("content-range", "")
            if "/" in content_range:
                total_str = content_range.split("/")[-1]
                if total_str != "*":
                    total = int(total_str)

            # 체질별 통계
            const_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/clinical_cases",
                headers=headers,
                params={"select": "patientConstitution", "patientConstitution": "not.is.null", "limit": "1"}
            )
            with_constitution = 0
            cr = const_response.headers.get("content-range", "")
            if "/" in cr:
                cs = cr.split("/")[-1]
                if cs != "*":
                    with_constitution = int(cs)

            return {
                "total_cases": total,
                "real_clinical_cases": total,
                "indication_based_cases": 0,
                "indexed": True,
                "with_constitution": with_constitution,
                "with_age": 0,
                "with_gender": 0,
                "with_result": 0,
                "top_formulas": [],
                "data_source": "supabase"
            }

    except Exception as e:
        return {
            "total_cases": 0,
            "indexed": False,
            "message": f"Error: {str(e)}"
        }
