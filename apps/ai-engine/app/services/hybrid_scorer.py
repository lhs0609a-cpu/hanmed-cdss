"""
하이브리드 점수 계산 서비스
벡터 유사도 + 키워드 매칭 + 메타데이터 매칭을 종합한 점수 계산
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Literal
from enum import Enum
import re


class MatchGrade(str, Enum):
    """매칭 등급"""
    S = "S"  # 90-100: 매우 높음
    A = "A"  # 75-89: 높음
    B = "B"  # 60-74: 보통
    C = "C"  # 45-59: 낮음
    D = "D"  # 0-44: 약함


@dataclass
class MatchReason:
    """매칭 근거"""
    type: Literal['chief_complaint', 'symptom', 'constitution', 'age', 'gender', 'diagnosis', 'formula']
    description: str
    contribution: float  # 점수 기여도 (0-100)


@dataclass
class MatchScore:
    """종합 매칭 점수"""
    total: float  # 0-100
    grade: MatchGrade
    grade_label: str
    vector_similarity: float  # 0-100
    keyword_match: float  # 0-100
    metadata_match: float  # 0-100
    reasons: List[MatchReason] = field(default_factory=list)


# 가중치 설정
WEIGHTS = {
    "vector": 0.4,      # 벡터 유사도 40%
    "keyword": 0.3,     # 키워드 매칭 30%
    "metadata": 0.3,    # 메타데이터 매칭 30%
}

# 키워드 점수
KEYWORD_SCORES = {
    "chief_complaint_exact": 15,    # 주소증 정확 일치
    "chief_complaint_partial": 8,   # 주소증 부분 일치
    "symptom": 5,                   # 증상 일치 (개당)
    "diagnosis": 10,                # 진단 일치
    "formula": 12,                  # 처방명 일치
}

# 메타데이터 점수
METADATA_SCORES = {
    "constitution": 20,   # 체질 일치
    "age_exact": 10,      # 연령대 정확 일치 (10세 단위)
    "age_close": 5,       # 연령대 근접 (20세 이내)
    "gender": 5,          # 성별 일치
}

# 등급 기준
GRADE_THRESHOLDS = {
    MatchGrade.S: (90, 100, "매우 높은 유사도"),
    MatchGrade.A: (75, 89, "높은 유사도"),
    MatchGrade.B: (60, 74, "보통 유사도"),
    MatchGrade.C: (45, 59, "낮은 유사도"),
    MatchGrade.D: (0, 44, "약한 연관성"),
}

# 증상 동의어 사전
SYMPTOM_SYNONYMS = {
    "두통": ["머리아픔", "头痛", "headache", "편두통", "두중"],
    "소화불량": ["체함", "더부룩", "식체", "소화장애"],
    "요통": ["허리통증", "腰痛", "요추통"],
    "중풍": ["뇌졸중", "中風", "뇌경색", "뇌출혈"],
    "불면": ["불면증", "수면장애", "不眠"],
    "변비": ["대변불통", "便秘"],
    "설사": ["泄瀉", "물변"],
    "기침": ["咳嗽", "해수"],
    "어지러움": ["현훈", "眩暈", "어지럼증"],
    "피로": ["疲勞", "권태", "무기력"],
}


class HybridScorer:
    """하이브리드 점수 계산기"""

    def __init__(self):
        self.synonym_map = self._build_synonym_map()

    def _build_synonym_map(self) -> Dict[str, str]:
        """동의어 -> 표준어 매핑 생성"""
        mapping = {}
        for canonical, synonyms in SYMPTOM_SYNONYMS.items():
            mapping[canonical.lower()] = canonical
            for syn in synonyms:
                mapping[syn.lower()] = canonical
        return mapping

    def normalize_symptom(self, symptom: str) -> str:
        """증상을 정규화된 키워드로 변환"""
        symptom_lower = symptom.lower().strip()
        return self.synonym_map.get(symptom_lower, symptom.strip())

    def calculate_score(
        self,
        query: Dict,
        case: Dict,
        vector_similarity: float  # Pinecone에서 받은 유사도 (0-1)
    ) -> MatchScore:
        """
        종합 점수 계산

        Args:
            query: 검색 쿼리 (환자 정보, 주소증, 증상 등)
            case: 치험례 케이스 (메타데이터)
            vector_similarity: 벡터 유사도 (0-1)

        Returns:
            MatchScore: 종합 점수 및 등급
        """
        reasons = []

        # 1. 벡터 유사도 점수 (0-100)
        vector_score = vector_similarity * 100

        # 2. 키워드 매칭 점수 계산
        keyword_score, keyword_reasons = self._calculate_keyword_score(query, case)
        reasons.extend(keyword_reasons)

        # 3. 메타데이터 매칭 점수 계산
        metadata_score, metadata_reasons = self._calculate_metadata_score(query, case)
        reasons.extend(metadata_reasons)

        # 4. 종합 점수 계산
        total = (
            vector_score * WEIGHTS["vector"] +
            keyword_score * WEIGHTS["keyword"] +
            metadata_score * WEIGHTS["metadata"]
        )

        # 5. 등급 결정
        grade = self._determine_grade(total)
        grade_label = GRADE_THRESHOLDS[grade][2]

        return MatchScore(
            total=round(total, 1),
            grade=grade,
            grade_label=grade_label,
            vector_similarity=round(vector_score, 1),
            keyword_match=round(keyword_score, 1),
            metadata_match=round(metadata_score, 1),
            reasons=reasons
        )

    def _calculate_keyword_score(
        self,
        query: Dict,
        case: Dict
    ) -> tuple[float, List[MatchReason]]:
        """키워드 매칭 점수 계산"""
        score = 0.0
        reasons = []
        max_score = 50.0  # 최대 점수 (정규화용)

        query_chief = query.get('chief_complaint', '').lower()
        case_chief = case.get('chief_complaint', '').lower()
        case_title = case.get('title', '').lower()

        # 주소증 매칭
        if query_chief and case_chief:
            if query_chief == case_chief:
                score += KEYWORD_SCORES["chief_complaint_exact"]
                reasons.append(MatchReason(
                    type='chief_complaint',
                    description=f'주소증 "{query.get("chief_complaint")}" 정확 일치',
                    contribution=KEYWORD_SCORES["chief_complaint_exact"]
                ))
            elif query_chief in case_chief or case_chief in query_chief:
                score += KEYWORD_SCORES["chief_complaint_partial"]
                reasons.append(MatchReason(
                    type='chief_complaint',
                    description=f'주소증 "{query.get("chief_complaint")}" 부분 일치',
                    contribution=KEYWORD_SCORES["chief_complaint_partial"]
                ))
            elif query_chief in case_title:
                score += KEYWORD_SCORES["chief_complaint_partial"]
                reasons.append(MatchReason(
                    type='chief_complaint',
                    description=f'제목에서 "{query.get("chief_complaint")}" 발견',
                    contribution=KEYWORD_SCORES["chief_complaint_partial"]
                ))

        # 증상 매칭
        query_symptoms = [self.normalize_symptom(s) for s in query.get('symptoms', [])]
        case_symptoms = case.get('symptoms', [])
        case_symptom_keywords = case.get('symptom_keywords', [])

        all_case_symptoms = set()
        for s in case_symptoms + case_symptom_keywords:
            all_case_symptoms.add(self.normalize_symptom(s).lower())

        matched_symptoms = []
        for qs in query_symptoms:
            qs_lower = qs.lower()
            if qs_lower in all_case_symptoms:
                matched_symptoms.append(qs)
                score += KEYWORD_SCORES["symptom"]

        if matched_symptoms:
            reasons.append(MatchReason(
                type='symptom',
                description=f'증상 일치: {", ".join(matched_symptoms[:3])}',
                contribution=len(matched_symptoms) * KEYWORD_SCORES["symptom"]
            ))

        # 진단 매칭
        query_diagnosis = query.get('diagnosis', '').lower()
        case_diagnosis = case.get('diagnosis', '').lower()

        if query_diagnosis and case_diagnosis and query_diagnosis in case_diagnosis:
            score += KEYWORD_SCORES["diagnosis"]
            reasons.append(MatchReason(
                type='diagnosis',
                description=f'진단 "{query.get("diagnosis")}" 일치',
                contribution=KEYWORD_SCORES["diagnosis"]
            ))

        # 처방명 매칭
        query_formula = query.get('formula', '').lower()
        case_formula = case.get('formula_name', '').lower()

        if query_formula and case_formula and query_formula in case_formula:
            score += KEYWORD_SCORES["formula"]
            reasons.append(MatchReason(
                type='formula',
                description=f'처방 "{case.get("formula_name")}" 일치',
                contribution=KEYWORD_SCORES["formula"]
            ))

        # 점수 정규화 (0-100)
        normalized = min(100.0, (score / max_score) * 100)
        return normalized, reasons

    def _calculate_metadata_score(
        self,
        query: Dict,
        case: Dict
    ) -> tuple[float, List[MatchReason]]:
        """메타데이터 매칭 점수 계산"""
        score = 0.0
        reasons = []
        max_score = 35.0  # 최대 점수 (정규화용)

        # 체질 매칭
        query_constitution = query.get('patient_constitution', '') or query.get('constitution', '')
        case_constitution = case.get('patient_constitution', '')

        if query_constitution and case_constitution:
            if query_constitution == case_constitution:
                score += METADATA_SCORES["constitution"]
                reasons.append(MatchReason(
                    type='constitution',
                    description=f'체질 "{query_constitution}" 일치',
                    contribution=METADATA_SCORES["constitution"]
                ))

        # 연령대 매칭
        query_age = query.get('patient_age') or query.get('age')
        case_age = case.get('patient_age')

        if query_age and case_age:
            age_diff = abs(int(query_age) - int(case_age))
            if age_diff <= 5:
                score += METADATA_SCORES["age_exact"]
                reasons.append(MatchReason(
                    type='age',
                    description=f'연령 {case_age}세 (차이 {age_diff}세)',
                    contribution=METADATA_SCORES["age_exact"]
                ))
            elif age_diff <= 15:
                score += METADATA_SCORES["age_close"]
                reasons.append(MatchReason(
                    type='age',
                    description=f'연령 {case_age}세 근접 (차이 {age_diff}세)',
                    contribution=METADATA_SCORES["age_close"]
                ))

        # 성별 매칭
        query_gender = query.get('patient_gender') or query.get('gender')
        case_gender = case.get('patient_gender')

        if query_gender and case_gender and query_gender == case_gender:
            score += METADATA_SCORES["gender"]
            reasons.append(MatchReason(
                type='gender',
                description=f'성별 {"남성" if case_gender == "M" else "여성"} 일치',
                contribution=METADATA_SCORES["gender"]
            ))

        # 점수 정규화 (0-100)
        normalized = min(100.0, (score / max_score) * 100)
        return normalized, reasons

    def _determine_grade(self, total: float) -> MatchGrade:
        """점수에 따른 등급 결정"""
        for grade, (min_score, max_score, _) in GRADE_THRESHOLDS.items():
            if min_score <= total <= max_score:
                return grade
        return MatchGrade.D

    @staticmethod
    def get_grade_color(grade: MatchGrade) -> Dict[str, str]:
        """등급별 색상 정보 반환"""
        colors = {
            MatchGrade.S: {"bg": "bg-purple-100", "text": "text-purple-800", "border": "border-purple-300"},
            MatchGrade.A: {"bg": "bg-blue-100", "text": "text-blue-800", "border": "border-blue-300"},
            MatchGrade.B: {"bg": "bg-green-100", "text": "text-green-800", "border": "border-green-300"},
            MatchGrade.C: {"bg": "bg-yellow-100", "text": "text-yellow-800", "border": "border-yellow-300"},
            MatchGrade.D: {"bg": "bg-gray-100", "text": "text-gray-600", "border": "border-gray-300"},
        }
        return colors.get(grade, colors[MatchGrade.D])
