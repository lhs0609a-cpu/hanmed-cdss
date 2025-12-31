"""
처방 추천 API
증상, 진단, 체질 기반 처방 추천
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from collections import Counter
import json
from pathlib import Path

router = APIRouter(prefix="/formula-recommend", tags=["Formula Recommendation"])


# 데이터 로드
def load_cases():
    data_file = Path(__file__).parent.parent.parent.parent / "data" / "extracted_cases.json"
    if data_file.exists():
        with open(data_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


class FormulaRecommendRequest(BaseModel):
    """처방 추천 요청"""
    symptoms: List[str] = Field(default_factory=list, description="증상 목록")
    diagnosis: Optional[str] = Field(None, description="진단/변증")
    constitution: Optional[str] = Field(None, description="체질")
    age: Optional[int] = Field(None, description="나이")
    gender: Optional[str] = Field(None, description="성별 (M/F)")
    top_k: int = Field(10, ge=1, le=50, description="추천 개수")


class RecommendedFormula(BaseModel):
    """추천 처방"""
    formula_name: str
    score: float
    case_count: int
    matching_symptoms: List[str]
    matching_reasons: List[str]


class FormulaRecommendResponse(BaseModel):
    """처방 추천 응답"""
    recommendations: List[RecommendedFormula]
    total_analyzed: int


@router.post("/", response_model=FormulaRecommendResponse)
async def recommend_formula(request: FormulaRecommendRequest):
    """
    증상/진단/체질 기반 처방 추천

    치험례 데이터를 분석하여 입력된 조건에 맞는 처방을 추천합니다.
    """
    cases = load_cases()

    # 처방별 점수 계산
    formula_scores: Dict[str, Dict] = {}

    for case in cases:
        formula = case.get('formula_name', '')
        if not formula or len(formula) < 2:
            continue

        # 무효한 처방명 필터링
        invalid_names = {'사상', '감기의', '새로보는', '고령자채록모음', '빈용', '되고'}
        if formula in invalid_names:
            continue

        score = 0
        reasons = []
        matched_symptoms = []

        case_symptoms = [s.lower() for s in case.get('symptoms', [])]
        case_diagnosis = case.get('diagnosis', '').lower()
        case_constitution = case.get('patient_constitution', '')
        case_age = case.get('patient_age')
        case_gender = case.get('patient_gender')

        # 증상 매칭 (각 20점)
        for symptom in request.symptoms:
            symptom_lower = symptom.lower()
            if any(symptom_lower in cs or cs in symptom_lower for cs in case_symptoms):
                score += 20
                matched_symptoms.append(symptom)
                reasons.append(f"증상 '{symptom}' 일치")

        # 진단 매칭 (30점)
        if request.diagnosis and case_diagnosis:
            if request.diagnosis.lower() in case_diagnosis:
                score += 30
                reasons.append(f"진단 '{request.diagnosis}' 일치")

        # 체질 매칭 (25점)
        if request.constitution and case_constitution:
            if request.constitution == case_constitution:
                score += 25
                reasons.append(f"체질 '{request.constitution}' 일치")

        # 연령대 매칭 (10점)
        if request.age and case_age:
            age_diff = abs(request.age - case_age)
            if age_diff <= 10:
                score += 10
                reasons.append(f"연령대 유사 ({case_age}세)")

        # 성별 매칭 (5점)
        if request.gender and case_gender:
            if request.gender == case_gender:
                score += 5
                reasons.append("성별 일치")

        if score > 0:
            if formula not in formula_scores:
                formula_scores[formula] = {
                    'total_score': 0,
                    'case_count': 0,
                    'matched_symptoms': set(),
                    'reasons': set()
                }

            formula_scores[formula]['total_score'] += score
            formula_scores[formula]['case_count'] += 1
            formula_scores[formula]['matched_symptoms'].update(matched_symptoms)
            formula_scores[formula]['reasons'].update(reasons)

    # 평균 점수로 정렬
    recommendations = []
    for formula, data in formula_scores.items():
        avg_score = data['total_score'] / data['case_count']
        recommendations.append(RecommendedFormula(
            formula_name=formula,
            score=round(avg_score, 1),
            case_count=data['case_count'],
            matching_symptoms=list(data['matched_symptoms'])[:5],
            matching_reasons=list(data['reasons'])[:5]
        ))

    # 점수순 정렬
    recommendations.sort(key=lambda x: (x.score, x.case_count), reverse=True)

    return FormulaRecommendResponse(
        recommendations=recommendations[:request.top_k],
        total_analyzed=len(cases)
    )


@router.get("/by-symptom")
async def get_formulas_by_symptom(
    symptom: str = Query(..., description="증상명"),
    top_k: int = Query(10, ge=1, le=50)
):
    """
    특정 증상에 많이 사용되는 처방 조회
    """
    cases = load_cases()
    formula_counts = Counter()

    symptom_lower = symptom.lower()

    for case in cases:
        case_symptoms = [s.lower() for s in case.get('symptoms', [])]
        formula = case.get('formula_name', '')

        if not formula or len(formula) < 2:
            continue

        invalid_names = {'사상', '감기의', '새로보는', '고령자채록모음', '빈용'}
        if formula in invalid_names:
            continue

        if any(symptom_lower in cs or cs in symptom_lower for cs in case_symptoms):
            formula_counts[formula] += 1

    results = [
        {"formula": f, "count": c}
        for f, c in formula_counts.most_common(top_k)
    ]

    return {
        "symptom": symptom,
        "formulas": results,
        "total_matches": sum(formula_counts.values())
    }


@router.get("/by-constitution/{constitution}")
async def get_formulas_by_constitution(
    constitution: str,
    top_k: int = Query(10, ge=1, le=50)
):
    """
    체질별 자주 사용되는 처방 조회
    """
    cases = load_cases()
    formula_counts = Counter()

    for case in cases:
        case_constitution = case.get('patient_constitution', '')
        formula = case.get('formula_name', '')

        if not formula or len(formula) < 2:
            continue

        invalid_names = {'사상', '감기의', '새로보는', '고령자채록모음', '빈용'}
        if formula in invalid_names:
            continue

        if constitution == case_constitution:
            formula_counts[formula] += 1

    results = [
        {"formula": f, "count": c}
        for f, c in formula_counts.most_common(top_k)
    ]

    return {
        "constitution": constitution,
        "formulas": results,
        "total_cases": sum(formula_counts.values())
    }


@router.get("/by-diagnosis/{diagnosis}")
async def get_formulas_by_diagnosis(
    diagnosis: str,
    top_k: int = Query(10, ge=1, le=50)
):
    """
    진단/변증별 자주 사용되는 처방 조회
    """
    cases = load_cases()
    formula_counts = Counter()

    diagnosis_lower = diagnosis.lower()

    for case in cases:
        case_diagnosis = case.get('diagnosis', '').lower()
        formula = case.get('formula_name', '')

        if not formula or len(formula) < 2:
            continue

        invalid_names = {'사상', '감기의', '새로보는', '고령자채록모음', '빈용'}
        if formula in invalid_names:
            continue

        if diagnosis_lower in case_diagnosis or case_diagnosis in diagnosis_lower:
            formula_counts[formula] += 1

    results = [
        {"formula": f, "count": c}
        for f, c in formula_counts.most_common(top_k)
    ]

    return {
        "diagnosis": diagnosis,
        "formulas": results,
        "total_cases": sum(formula_counts.values())
    }
