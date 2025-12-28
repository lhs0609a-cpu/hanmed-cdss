"""
치험례 추출 스크립트
all-formulas.json에서 cases[] 배열을 추출하여 Pinecone 인덱싱용 데이터로 변환
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import re

# 프로젝트 루트 경로
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
FORMULAS_DIR = PROJECT_ROOT / "apps" / "web" / "src" / "data" / "formulas"
OUTPUT_DIR = PROJECT_ROOT / "apps" / "ai-engine" / "data"


@dataclass
class ExtractedCase:
    """추출된 치험례 데이터"""
    id: str
    formula_id: str
    formula_name: str
    formula_hanja: str
    title: str
    chief_complaint: str
    symptoms: List[str]
    diagnosis: str
    patient_age: Optional[int]
    patient_gender: Optional[str]
    patient_constitution: Optional[str]
    treatment_formula: str
    treatment_modification: Optional[str]
    result: str
    progress: List[Dict[str, str]]
    data_source: str
    # 검색용 통합 텍스트
    search_text: str
    # 증상 키워드 (정규화됨)
    symptom_keywords: List[str]


# 증상 동의어 사전
SYMPTOM_SYNONYMS = {
    "두통": ["머리아픔", "头痛", "headache", "편두통", "두중", "머리가 아프"],
    "소화불량": ["체함", "더부룩", "식체", "소화가 안됨", "소화장애"],
    "요통": ["허리통증", "腰痛", "요추통", "허리가 아프"],
    "중풍": ["뇌졸중", "中風", "뇌경색", "뇌출혈"],
    "불면": ["불면증", "잠을 못잠", "수면장애", "不眠"],
    "변비": ["대변불통", "便秘", "대변이 안나옴"],
    "설사": ["泄瀉", "물변", "설사가 심함"],
    "기침": ["咳嗽", "해수", "기침이 심함"],
    "어지러움": ["현훈", "眩暈", "어지럼증", "머리가 어지러움"],
    "피로": ["疲勞", "권태", "기력저하", "무기력"],
}


def normalize_symptom(symptom: str) -> str:
    """증상을 정규화된 키워드로 변환"""
    symptom_lower = symptom.lower().strip()

    for canonical, synonyms in SYMPTOM_SYNONYMS.items():
        if symptom_lower == canonical.lower():
            return canonical
        for syn in synonyms:
            if syn.lower() in symptom_lower or symptom_lower in syn.lower():
                return canonical

    return symptom.strip()


def extract_age_from_text(text: str) -> Optional[int]:
    """텍스트에서 나이 추출"""
    if not text:
        return None

    # "52세", "52 세", "52歲" 패턴
    patterns = [
        r'(\d+)\s*세',
        r'(\d+)\s*歲',
        r'(\d+)\s*years?\s*old',
    ]

    for pattern in patterns:
        match = re.search(pattern, str(text))
        if match:
            age = int(match.group(1))
            if 0 < age < 120:
                return age

    return None


def extract_gender(patient_info: Dict) -> Optional[str]:
    """환자 정보에서 성별 추출"""
    if not patient_info:
        return None

    gender = patient_info.get('gender', '')
    if gender in ['M', 'male', '남', '남성']:
        return 'M'
    elif gender in ['F', 'female', '여', '여성']:
        return 'F'

    return None


def extract_constitution(patient_info: Dict, text: str = "") -> Optional[str]:
    """체질 정보 추출"""
    constitutions = ['소음인', '태음인', '소양인', '태양인']

    # patient_info에서 먼저 찾기
    if patient_info:
        const = patient_info.get('constitution', '')
        for c in constitutions:
            if c in str(const):
                return c

    # 텍스트에서 찾기
    if text:
        for c in constitutions:
            if c in text:
                return c

    return None


def build_search_text(case: Dict, formula: Dict) -> str:
    """검색용 통합 텍스트 생성"""
    parts = []

    # 처방 정보
    parts.append(formula.get('name', ''))
    parts.append(formula.get('hanja', ''))

    # 케이스 제목
    parts.append(case.get('title', ''))

    # 주소증
    parts.append(case.get('chiefComplaint', ''))

    # 증상들
    symptoms = case.get('symptoms', [])
    if isinstance(symptoms, list):
        parts.extend(symptoms)

    # 진단
    parts.append(case.get('diagnosis', ''))

    # 결과
    parts.append(case.get('result', ''))

    return ' '.join(filter(None, parts))


def extract_symptoms_from_case(case: Dict) -> List[str]:
    """케이스에서 증상 목록 추출"""
    symptoms = []

    # symptoms 필드
    if 'symptoms' in case and isinstance(case['symptoms'], list):
        symptoms.extend(case['symptoms'])

    # chiefComplaint에서 추출
    chief = case.get('chiefComplaint', '')
    if chief:
        # 쉼표나 슬래시로 구분된 증상들
        parts = re.split(r'[,，、/]', chief)
        symptoms.extend([p.strip() for p in parts if p.strip()])

    # 중복 제거 및 정규화
    normalized = []
    seen = set()
    for s in symptoms:
        norm = normalize_symptom(s)
        if norm and norm not in seen:
            normalized.append(norm)
            seen.add(norm)

    return normalized


def extract_case_from_formula(formula: Dict, data_source: str) -> List[ExtractedCase]:
    """처방 데이터에서 케이스 추출"""
    cases = formula.get('cases', [])
    if not cases:
        return []

    extracted = []
    formula_id = formula.get('id', '')
    formula_name = formula.get('name', '')
    formula_hanja = formula.get('hanja', '')

    for i, case in enumerate(cases):
        if not case:
            continue

        # 필수 필드 확인
        title = case.get('title', '')
        chief_complaint = case.get('chiefComplaint', '')

        if not title and not chief_complaint:
            continue

        # 환자 정보 추출
        patient_info = case.get('patientInfo', {}) or {}

        # 나이 추출 (patientInfo 또는 title에서)
        age = None
        if patient_info:
            age = patient_info.get('age')
            if not age:
                age = extract_age_from_text(str(patient_info))
        if not age:
            age = extract_age_from_text(title)

        # 성별 추출
        gender = extract_gender(patient_info)

        # 체질 추출
        constitution = extract_constitution(patient_info, title)

        # 증상 추출
        symptoms = extract_symptoms_from_case(case)
        symptom_keywords = [normalize_symptom(s) for s in symptoms]

        # 치료 정보
        treatment = case.get('treatment', {}) or {}
        treatment_formula = treatment.get('formula', '') or formula_name
        treatment_modification = treatment.get('modifications', '') or treatment.get('modification', '')

        # 경과 정보
        progress = case.get('progress', []) or []

        # 결과
        result = case.get('result', '')

        # 진단
        diagnosis = case.get('diagnosis', '')

        # 검색 텍스트 생성
        search_text = build_search_text(case, formula)

        # 케이스 ID 생성
        case_id = case.get('id', f"{formula_id}-case-{i}")

        extracted_case = ExtractedCase(
            id=case_id,
            formula_id=formula_id,
            formula_name=formula_name,
            formula_hanja=formula_hanja,
            title=title or chief_complaint,
            chief_complaint=chief_complaint,
            symptoms=symptoms,
            diagnosis=diagnosis,
            patient_age=age,
            patient_gender=gender,
            patient_constitution=constitution,
            treatment_formula=treatment_formula,
            treatment_modification=treatment_modification,
            result=result,
            progress=progress,
            data_source=data_source,
            search_text=search_text,
            symptom_keywords=list(set(symptom_keywords))
        )

        extracted.append(extracted_case)

    return extracted


def load_formulas_from_file(filepath: Path, source_name: str) -> List[ExtractedCase]:
    """JSON 파일에서 처방 데이터 로드 및 케이스 추출"""
    print(f"Loading {filepath.name}...")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"  Error loading {filepath}: {e}")
        return []

    if not isinstance(data, list):
        print(f"  Unexpected data format in {filepath}")
        return []

    all_cases = []
    for formula in data:
        cases = extract_case_from_formula(formula, source_name)
        all_cases.extend(cases)

    print(f"  Extracted {len(all_cases)} cases from {len(data)} formulas")
    return all_cases


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("치험례 추출 스크립트")
    print("=" * 60)

    # 출력 디렉토리 생성
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 각 데이터 소스에서 추출
    all_cases: List[ExtractedCase] = []

    source_files = [
        ("all-formulas.json", "all_formulas"),
        # 개별 파일은 all-formulas에 이미 통합되어 있으므로 주석 처리
        # ("bangyak_sangton.json", "bangyak_sangton"),
        # ("bangyak_jungton.json", "bangyak_jungton"),
        # ("bangyak_haton.json", "bangyak_haton"),
        # ("binyong101.json", "binyong101"),
        # ("binyong202.json", "binyong202"),
    ]

    for filename, source_name in source_files:
        filepath = FORMULAS_DIR / filename
        if filepath.exists():
            cases = load_formulas_from_file(filepath, source_name)
            all_cases.extend(cases)
        else:
            print(f"File not found: {filepath}")

    # 중복 제거 (ID 기준)
    seen_ids = set()
    unique_cases = []
    for case in all_cases:
        if case.id not in seen_ids:
            seen_ids.add(case.id)
            unique_cases.append(case)

    print(f"\n총 {len(unique_cases)}개의 고유 치험례 추출됨")

    # 통계 출력
    with_age = sum(1 for c in unique_cases if c.patient_age is not None)
    with_gender = sum(1 for c in unique_cases if c.patient_gender is not None)
    with_constitution = sum(1 for c in unique_cases if c.patient_constitution is not None)
    with_symptoms = sum(1 for c in unique_cases if c.symptoms)

    print(f"\n통계:")
    print(f"  - 나이 정보 있음: {with_age} ({with_age/len(unique_cases)*100:.1f}%)")
    print(f"  - 성별 정보 있음: {with_gender} ({with_gender/len(unique_cases)*100:.1f}%)")
    print(f"  - 체질 정보 있음: {with_constitution} ({with_constitution/len(unique_cases)*100:.1f}%)")
    print(f"  - 증상 정보 있음: {with_symptoms} ({with_symptoms/len(unique_cases)*100:.1f}%)")

    # JSON으로 저장
    output_file = OUTPUT_DIR / "extracted_cases.json"
    cases_data = [asdict(c) for c in unique_cases]

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cases_data, f, ensure_ascii=False, indent=2)

    print(f"\n저장 완료: {output_file}")

    # 샘플 출력
    if unique_cases:
        print(f"\n샘플 케이스 (첫 번째):")
        sample = unique_cases[0]
        print(f"  ID: {sample.id}")
        print(f"  제목: {sample.title}")
        print(f"  처방: {sample.formula_name} ({sample.formula_hanja})")
        print(f"  주소증: {sample.chief_complaint}")
        print(f"  환자: {sample.patient_age}세 {sample.patient_gender} {sample.patient_constitution or ''}")
        print(f"  증상: {', '.join(sample.symptoms[:5])}")

    return unique_cases


if __name__ == "__main__":
    main()
