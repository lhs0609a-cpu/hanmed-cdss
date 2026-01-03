"""
치험례 유효성 검증기
"""

from typing import Tuple, List, Dict, Any
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    issues: List[str]
    confidence: float


class CaseValidator:
    """
    추출된 치험례의 유효성 검증
    """

    # 필수 필드
    REQUIRED_FIELDS = ['chief_complaint', 'formula_name']

    # 최소 텍스트 길이
    MIN_TEXT_LENGTH = 100

    # 유효한 체질
    VALID_CONSTITUTIONS = ['소음인', '태음인', '소양인', '태양인']

    # 최소 신뢰도 (자동 승인용)
    AUTO_APPROVE_THRESHOLD = 0.9

    def validate(self, case: Dict[str, Any]) -> ValidationResult:
        """
        케이스 검증

        Args:
            case: 검증할 케이스 딕셔너리

        Returns:
            ValidationResult: 검증 결과
        """
        issues = []
        confidence = case.get('confidence_score', 0.0)

        # 필수 필드 검증
        for field in self.REQUIRED_FIELDS:
            if not case.get(field):
                issues.append(f"필수 필드 누락: {field}")

        # 필수 필드 중 하나라도 있으면 통과 (OR 조건)
        has_required = any(case.get(f) for f in self.REQUIRED_FIELDS)
        if not has_required:
            issues.append("주소증 또는 처방명이 필요합니다")

        # 텍스트 길이 검증
        full_text = case.get('full_text', '')
        if len(full_text) < self.MIN_TEXT_LENGTH:
            issues.append(f"텍스트가 너무 짧음: {len(full_text)}자 < {self.MIN_TEXT_LENGTH}자")

        # 환자 정보 검증
        age = case.get('patient_age')
        if age is not None:
            if not (0 < age < 120):
                issues.append(f"유효하지 않은 나이: {age}")

        gender = case.get('patient_gender')
        if gender and gender not in ['M', 'F']:
            issues.append(f"유효하지 않은 성별: {gender}")

        constitution = case.get('patient_constitution')
        if constitution and constitution not in self.VALID_CONSTITUTIONS:
            issues.append(f"유효하지 않은 체질: {constitution}")

        # 처방명 검증 (있는 경우)
        formula = case.get('formula_name', '')
        if formula:
            if len(formula) < 3:
                issues.append(f"처방명이 너무 짧음: {formula}")
            # 일반 동사/형용사로 끝나는지 확인
            bad_endings = ['하고', '있고', '없고', '했고', '되고']
            if any(formula.endswith(e) for e in bad_endings):
                issues.append(f"잘못된 처방명: {formula}")

        # 유효성 판단
        is_valid = len(issues) == 0 or (has_required and len(issues) <= 2)

        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            confidence=confidence
        )

    def can_auto_approve(self, case: Dict[str, Any]) -> bool:
        """
        자동 승인 가능 여부 확인

        Args:
            case: 검증할 케이스

        Returns:
            bool: 자동 승인 가능 여부
        """
        result = self.validate(case)

        if not result.is_valid:
            return False

        # 신뢰도가 임계값 이상이면 자동 승인
        return result.confidence >= self.AUTO_APPROVE_THRESHOLD

    def get_quality_score(self, case: Dict[str, Any]) -> float:
        """
        케이스 품질 점수 계산 (0-100)

        Args:
            case: 케이스 딕셔너리

        Returns:
            float: 품질 점수
        """
        score = 0.0

        # 주소증 (25점)
        if case.get('chief_complaint'):
            score += 25

        # 처방명 (25점)
        if case.get('formula_name'):
            score += 25

        # 환자 정보 (15점)
        if case.get('patient_age'):
            score += 5
        if case.get('patient_gender'):
            score += 5
        if case.get('patient_constitution'):
            score += 5

        # 증상 목록 (10점)
        symptoms = case.get('symptoms', [])
        if symptoms:
            score += min(10, len(symptoms) * 2)

        # 진단/변증 (10점)
        if case.get('diagnosis') or case.get('differentiation'):
            score += 10

        # 치료 결과 (15점)
        if case.get('result'):
            score += 15

        return min(score, 100.0)
