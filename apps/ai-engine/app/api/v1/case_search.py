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

    페이지네이션과 필터링을 지원하는 치험례 목록을 반환합니다.
    """
    import json
    from pathlib import Path

    # 통합 데이터 파일 우선 사용
    data_file = Path(__file__).parent.parent.parent.parent / "data" / "all_cases_combined.json"
    if not data_file.exists():
        data_file = Path(__file__).parent.parent.parent.parent / "data" / "extracted_cases.json"

    if not data_file.exists():
        return {
            "cases": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0
        }

    with open(data_file, 'r', encoding='utf-8') as f:
        all_cases = json.load(f)

    # 실제 치험례 우선 정렬
    all_cases.sort(key=lambda x: (not x.get('is_real_case', False), x.get('id', '')))

    # 필터링
    filtered_cases = all_cases

    # 검색어 필터
    if search:
        search_lower = search.lower()
        filtered_cases = [
            c for c in filtered_cases
            if search_lower in c.get('chief_complaint', '').lower()
            or search_lower in c.get('formula_name', '').lower()
            or search_lower in c.get('diagnosis', '').lower()
            or search_lower in c.get('title', '').lower()
            or any(search_lower in s.lower() for s in c.get('symptoms', []))
        ]

    # 체질 필터
    if constitution:
        filtered_cases = [
            c for c in filtered_cases
            if c.get('patient_constitution') == constitution
        ]

    # 결과 필터
    if outcome:
        positive_keywords = ['완치', '호전', '개선', '낫', '효과', '소실', '회복', '정상']
        negative_keywords = ['무효', '효과없', '변화없']

        def get_outcome(result_text):
            if not result_text:
                return None
            result_lower = result_text.lower()
            if any(kw in result_lower for kw in positive_keywords):
                if '완치' in result_lower or '완전' in result_lower:
                    return '완치'
                return '호전'
            if any(kw in result_lower for kw in negative_keywords):
                return '무효'
            return None

        filtered_cases = [
            c for c in filtered_cases
            if get_outcome(c.get('result', '')) == outcome
        ]

    # 총 개수
    total = len(filtered_cases)
    total_pages = (total + limit - 1) // limit

    # 페이지네이션
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_cases = filtered_cases[start_idx:end_idx]

    # 응답 형식 변환
    cases = []
    for i, c in enumerate(paginated_cases):
        # 결과 판정
        result_text = c.get('result', '')
        outcome_label = None
        if result_text:
            result_lower = result_text.lower()
            if any(kw in result_lower for kw in ['완치', '완전']):
                outcome_label = '완치'
            elif any(kw in result_lower for kw in positive_keywords):
                outcome_label = '호전'
            elif any(kw in result_lower for kw in negative_keywords):
                outcome_label = '무효'

        cases.append({
            "id": c.get('id', f'case-{start_idx + i + 1}'),
            "title": c.get('title', c.get('chief_complaint', '')),
            "chiefComplaint": c.get('chief_complaint', ''),
            "symptoms": c.get('symptoms', []),
            "formulaName": c.get('formula_name', ''),
            "formulaHanja": c.get('formula_hanja', ''),
            "constitution": c.get('patient_constitution', ''),
            "diagnosis": c.get('diagnosis', ''),
            "patientAge": c.get('patient_age'),
            "patientGender": c.get('patient_gender'),
            "outcome": outcome_label,
            "result": result_text[:200] if result_text else '',
            "dataSource": c.get('data_source', ''),
        })

    return {
        "cases": cases,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


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

    # 통합 데이터 파일 우선 사용
    data_file = Path(__file__).parent.parent.parent.parent / "data" / "all_cases_combined.json"
    if not data_file.exists():
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
    real_cases = sum(1 for c in cases if c.get('is_real_case'))
    indication_cases = total - real_cases
    with_constitution = sum(1 for c in cases if c.get('patient_constitution'))
    with_age = sum(1 for c in cases if c.get('patient_age'))
    with_gender = sum(1 for c in cases if c.get('patient_gender'))
    with_result = sum(1 for c in cases if c.get('result'))

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
        "real_clinical_cases": real_cases,
        "indication_based_cases": indication_cases,
        "indexed": True,
        "with_constitution": with_constitution,
        "with_age": with_age,
        "with_gender": with_gender,
        "with_result": with_result,
        "top_formulas": [
            {"formula": f, "count": c} for f, c in top_formulas
        ]
    }
