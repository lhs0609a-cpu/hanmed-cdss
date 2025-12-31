"""
통계 API
치험례 데이터 기반 통계 및 분석
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Dict, Optional
from collections import Counter
import json
from pathlib import Path

router = APIRouter(prefix="/statistics", tags=["Statistics"])


def load_cases():
    data_file = Path(__file__).parent.parent.parent.parent / "data" / "extracted_cases.json"
    if data_file.exists():
        with open(data_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


class OverviewStats(BaseModel):
    """전체 통계"""
    total_cases: int
    total_formulas: int
    total_with_constitution: int
    total_with_diagnosis: int
    total_with_result: int
    age_distribution: Dict[str, int]
    gender_distribution: Dict[str, int]
    constitution_distribution: Dict[str, int]


class FormulaStats(BaseModel):
    """처방별 통계"""
    formula_name: str
    case_count: int
    top_symptoms: List[Dict[str, int]]
    top_diagnoses: List[Dict[str, int]]
    constitution_distribution: Dict[str, int]
    age_distribution: Dict[str, int]
    avg_age: Optional[float]
    gender_ratio: Dict[str, int]


class EffectivenessAnalysis(BaseModel):
    """처방 효과 분석"""
    formula_name: str
    total_cases_with_result: int
    positive_outcomes: int
    effectiveness_rate: float
    sample_results: List[str]


@router.get("/overview", response_model=OverviewStats)
async def get_overview_stats():
    """
    전체 통계 개요

    치험례 데이터의 전반적인 통계를 반환합니다.
    """
    cases = load_cases()

    # 기본 통계
    total = len(cases)
    formulas = set(c.get('formula_name', '') for c in cases if c.get('formula_name'))
    with_constitution = sum(1 for c in cases if c.get('patient_constitution'))
    with_diagnosis = sum(1 for c in cases if c.get('diagnosis'))
    with_result = sum(1 for c in cases if c.get('result'))

    # 연령대 분포
    age_dist = {'0-12': 0, '13-19': 0, '20-39': 0, '40-59': 0, '60+': 0, '미상': 0}
    for c in cases:
        age = c.get('patient_age')
        if age:
            if age <= 12:
                age_dist['0-12'] += 1
            elif age <= 19:
                age_dist['13-19'] += 1
            elif age <= 39:
                age_dist['20-39'] += 1
            elif age <= 59:
                age_dist['40-59'] += 1
            else:
                age_dist['60+'] += 1
        else:
            age_dist['미상'] += 1

    # 성별 분포
    gender_dist = Counter(c.get('patient_gender', '미상') or '미상' for c in cases)

    # 체질 분포
    const_dist = Counter(c.get('patient_constitution', '미상') or '미상' for c in cases)

    return OverviewStats(
        total_cases=total,
        total_formulas=len(formulas),
        total_with_constitution=with_constitution,
        total_with_diagnosis=with_diagnosis,
        total_with_result=with_result,
        age_distribution=dict(age_dist),
        gender_distribution=dict(gender_dist),
        constitution_distribution=dict(const_dist)
    )


@router.get("/formula/{formula_name}", response_model=FormulaStats)
async def get_formula_stats(formula_name: str):
    """
    특정 처방의 상세 통계

    해당 처방이 사용된 모든 케이스를 분석합니다.
    """
    cases = load_cases()

    # 해당 처방 케이스 필터링
    formula_cases = [
        c for c in cases
        if c.get('formula_name', '').lower() == formula_name.lower()
        or formula_name.lower() in c.get('formula_name', '').lower()
    ]

    if not formula_cases:
        return FormulaStats(
            formula_name=formula_name,
            case_count=0,
            top_symptoms=[],
            top_diagnoses=[],
            constitution_distribution={},
            age_distribution={},
            avg_age=None,
            gender_ratio={}
        )

    # 증상 통계
    all_symptoms = []
    for c in formula_cases:
        all_symptoms.extend(c.get('symptoms', []))
    top_symptoms = [
        {"symptom": s, "count": c}
        for s, c in Counter(all_symptoms).most_common(10)
    ]

    # 진단 통계
    diagnoses = [c.get('diagnosis', '') for c in formula_cases if c.get('diagnosis')]
    top_diagnoses = [
        {"diagnosis": d, "count": c}
        for d, c in Counter(diagnoses).most_common(5)
    ]

    # 체질 분포
    const_dist = Counter(
        c.get('patient_constitution', '미상') or '미상'
        for c in formula_cases
    )

    # 연령대 분포
    age_dist = {'0-12': 0, '13-19': 0, '20-39': 0, '40-59': 0, '60+': 0}
    ages = []
    for c in formula_cases:
        age = c.get('patient_age')
        if age:
            ages.append(age)
            if age <= 12:
                age_dist['0-12'] += 1
            elif age <= 19:
                age_dist['13-19'] += 1
            elif age <= 39:
                age_dist['20-39'] += 1
            elif age <= 59:
                age_dist['40-59'] += 1
            else:
                age_dist['60+'] += 1

    avg_age = sum(ages) / len(ages) if ages else None

    # 성별 비율
    gender_ratio = Counter(
        c.get('patient_gender', '미상') or '미상'
        for c in formula_cases
    )

    return FormulaStats(
        formula_name=formula_name,
        case_count=len(formula_cases),
        top_symptoms=top_symptoms,
        top_diagnoses=top_diagnoses,
        constitution_distribution=dict(const_dist),
        age_distribution=age_dist,
        avg_age=round(avg_age, 1) if avg_age else None,
        gender_ratio=dict(gender_ratio)
    )


@router.get("/effectiveness/{formula_name}", response_model=EffectivenessAnalysis)
async def analyze_formula_effectiveness(formula_name: str):
    """
    처방 효과 분석

    치료 결과가 기록된 케이스를 분석하여 효과를 평가합니다.
    """
    cases = load_cases()

    # 해당 처방 케이스 중 결과가 있는 것만
    formula_cases = [
        c for c in cases
        if (c.get('formula_name', '').lower() == formula_name.lower()
            or formula_name.lower() in c.get('formula_name', '').lower())
        and c.get('result')
    ]

    if not formula_cases:
        return EffectivenessAnalysis(
            formula_name=formula_name,
            total_cases_with_result=0,
            positive_outcomes=0,
            effectiveness_rate=0.0,
            sample_results=[]
        )

    # 긍정적 결과 키워드
    positive_keywords = [
        '완치', '호전', '개선', '낫', '좋아', '효과', '소실', '없어',
        '회복', '정상', '감소', '치료', '치유', '쾌유'
    ]

    positive_count = 0
    sample_results = []

    for c in formula_cases:
        result = c.get('result', '')
        result_lower = result.lower()

        # 긍정적 결과 판정
        if any(kw in result_lower for kw in positive_keywords):
            positive_count += 1

        # 샘플 수집
        if len(sample_results) < 5 and len(result) > 10:
            sample_results.append(result[:200])

    effectiveness_rate = (positive_count / len(formula_cases) * 100) if formula_cases else 0

    return EffectivenessAnalysis(
        formula_name=formula_name,
        total_cases_with_result=len(formula_cases),
        positive_outcomes=positive_count,
        effectiveness_rate=round(effectiveness_rate, 1),
        sample_results=sample_results
    )


@router.get("/top-formulas")
async def get_top_formulas(
    top_k: int = Query(20, ge=1, le=100),
    min_cases: int = Query(5, ge=1)
):
    """
    가장 많이 사용된 처방 목록
    """
    cases = load_cases()

    formula_counts = Counter()
    invalid_names = {'사상', '감기의', '새로보는', '고령자채록모음', '빈용', '되고', '을', '의'}

    for c in cases:
        formula = c.get('formula_name', '')
        if formula and len(formula) >= 2 and formula not in invalid_names:
            formula_counts[formula] += 1

    # 최소 케이스 수 이상만 필터링
    filtered = [
        {"formula": f, "count": c}
        for f, c in formula_counts.most_common()
        if c >= min_cases
    ][:top_k]

    return {
        "top_formulas": filtered,
        "total_unique_formulas": len([f for f, c in formula_counts.items() if c >= min_cases])
    }


@router.get("/top-symptoms")
async def get_top_symptoms(top_k: int = Query(30, ge=1, le=100)):
    """
    가장 많이 나타나는 증상 목록
    """
    cases = load_cases()

    all_symptoms = []
    for c in cases:
        all_symptoms.extend(c.get('symptoms', []))

    symptom_counts = Counter(all_symptoms)

    return {
        "top_symptoms": [
            {"symptom": s, "count": c}
            for s, c in symptom_counts.most_common(top_k)
        ],
        "total_unique_symptoms": len(symptom_counts)
    }


@router.get("/diagnosis-distribution")
async def get_diagnosis_distribution(top_k: int = Query(20, ge=1, le=100)):
    """
    진단/변증 분포
    """
    cases = load_cases()

    diagnoses = [c.get('diagnosis', '') for c in cases if c.get('diagnosis')]
    diagnosis_counts = Counter(diagnoses)

    return {
        "diagnoses": [
            {"diagnosis": d, "count": c}
            for d, c in diagnosis_counts.most_common(top_k)
        ],
        "total_unique_diagnoses": len(diagnosis_counts),
        "total_with_diagnosis": len(diagnoses)
    }
