"""
치험례 데이터 정규화기
"""

import re
from typing import Dict, Any, List


class CaseNormalizer:
    """
    추출된 치험례 데이터를 기존 스키마에 맞게 정규화
    """

    # 증상 동의어 매핑
    SYMPTOM_SYNONYMS = {
        '두통': ['머리아픔', '머리가 아픔', '두중', '편두통', '머리통증'],
        '복통': ['배아픔', '배가 아픔', '위통', '복부통증'],
        '어지러움': ['현훈', '어지럼증', '현기증', '빙빙 돌음'],
        '불면': ['불면증', '잠을 못 잠', '수면장애', '불수면'],
        '피로': ['피곤함', '권태', '무력감', '기력저하'],
        '소화불량': ['소화가 안됨', '체함', '식체', '더부룩'],
        '변비': ['대변이 안 나옴', '배변곤란'],
        '설사': ['설변', '묽은 변', '수양변'],
    }

    # 성별 정규화
    GENDER_MAP = {
        '남': 'M', '남자': 'M', '남성': 'M', '男': 'M', 'male': 'M', 'm': 'M',
        '여': 'F', '여자': 'F', '여성': 'F', '女': 'F', 'female': 'F', 'f': 'F',
    }

    # 체질 정규화
    CONSTITUTION_MAP = {
        '소음': '소음인', '소음인': '소음인', '少陰人': '소음인',
        '태음': '태음인', '태음인': '태음인', '太陰人': '태음인',
        '소양': '소양인', '소양인': '소양인', '少陽人': '소양인',
        '태양': '태양인', '태양인': '태양인', '太陽人': '태양인',
    }

    def normalize(self, case: Dict[str, Any]) -> Dict[str, Any]:
        """
        케이스 정규화

        Args:
            case: 정규화할 케이스 딕셔너리

        Returns:
            정규화된 케이스
        """
        normalized = case.copy()

        # 텍스트 필드 정리
        text_fields = [
            'chief_complaint', 'diagnosis', 'differentiation',
            'result', 'title', 'appearance', 'history', 'reference',
            'treatment_principle', 'prescription_plan'
        ]
        for field in text_fields:
            if field in normalized and normalized[field]:
                normalized[field] = self._clean_text(normalized[field])

        # 성별 정규화
        gender = normalized.get('patient_gender', '')
        if gender:
            normalized['patient_gender'] = self._normalize_gender(gender)

        # 체질 정규화
        constitution = normalized.get('patient_constitution', '')
        if constitution:
            normalized['patient_constitution'] = self._normalize_constitution(constitution)

        # 증상 정규화
        symptoms = normalized.get('symptoms', [])
        if symptoms:
            normalized['symptoms'] = self._normalize_symptoms(symptoms)

        # 처방명 정규화
        formula = normalized.get('formula_name', '')
        if formula:
            normalized['formula_name'] = self._normalize_formula(formula)

        # 검색 텍스트 재생성
        normalized['search_text'] = self._generate_search_text(normalized)

        return normalized

    def _clean_text(self, text: str) -> str:
        """텍스트 정리"""
        if not text:
            return ""

        # 여러 공백을 하나로
        text = re.sub(r'\s+', ' ', text)

        # 앞뒤 공백 제거
        text = text.strip()

        # 특수문자 정리
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)

        return text

    def _normalize_gender(self, gender: str) -> str:
        """성별 정규화"""
        gender_lower = gender.lower().strip()

        for key, value in self.GENDER_MAP.items():
            if key in gender_lower:
                return value

        return gender

    def _normalize_constitution(self, constitution: str) -> str:
        """체질 정규화"""
        constitution = constitution.strip()

        for key, value in self.CONSTITUTION_MAP.items():
            if key in constitution:
                return value

        return constitution

    def _normalize_symptoms(self, symptoms: List[str]) -> List[str]:
        """증상 리스트 정규화"""
        normalized = []

        for symptom in symptoms:
            symptom = self._clean_text(symptom)
            if not symptom:
                continue

            # 동의어 매핑
            normalized_symptom = symptom
            for standard, synonyms in self.SYMPTOM_SYNONYMS.items():
                if any(syn in symptom for syn in synonyms):
                    normalized_symptom = standard
                    break

            if normalized_symptom and normalized_symptom not in normalized:
                normalized.append(normalized_symptom)

        return normalized

    def _normalize_formula(self, formula: str) -> str:
        """처방명 정규화"""
        formula = formula.strip()

        # 괄호 안 내용 제거 (가미 등)
        formula = re.sub(r'\([^)]*\)', '', formula)

        # 숫자 제거
        formula = re.sub(r'\d+', '', formula)

        # 공백 제거
        formula = formula.strip()

        return formula

    def _generate_search_text(self, case: Dict[str, Any]) -> str:
        """검색용 텍스트 생성"""
        parts = [
            case.get('formula_name', ''),
            case.get('title', ''),
            case.get('chief_complaint', ''),
            ' '.join(case.get('symptoms', [])),
            case.get('diagnosis', ''),
            case.get('differentiation', ''),
            case.get('patient_constitution', ''),
        ]
        return ' '.join(p for p in parts if p)
