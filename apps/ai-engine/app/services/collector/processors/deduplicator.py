"""
치험례 중복 제거기
"""

import hashlib
from typing import Dict, Any, List, Tuple, Optional, Set


class CaseDeduplicator:
    """
    중복 치험례 감지 및 제거
    여러 방법으로 중복 확인:
    1. 해시 기반 (full_text MD5)
    2. 키 필드 매칭 (formula + chief_complaint + patient_age)
    3. URL 기반 (source_url)
    """

    def __init__(self, existing_cases: Optional[List[Dict]] = None):
        """
        초기화

        Args:
            existing_cases: 기존 케이스 리스트 (중복 확인용)
        """
        self.existing_hashes: Set[str] = set()
        self.existing_keys: Set[str] = set()
        self.existing_urls: Set[str] = set()

        if existing_cases:
            self._index_existing_cases(existing_cases)

    def _index_existing_cases(self, cases: List[Dict]) -> None:
        """기존 케이스 인덱싱"""
        for case in cases:
            # 해시 인덱싱
            content_hash = self._compute_hash(case)
            if content_hash:
                self.existing_hashes.add(content_hash)

            # 키 필드 인덱싱
            key = self._compute_key(case)
            if key:
                self.existing_keys.add(key)

            # URL 인덱싱
            url = case.get('source_url', '')
            if url:
                self.existing_urls.add(url)

    def _compute_hash(self, case: Dict[str, Any]) -> str:
        """콘텐츠 해시 계산"""
        full_text = case.get('full_text', '')
        if not full_text:
            return ""

        # 정규화 (공백 제거 등)
        normalized = ''.join(full_text.split()).lower()

        return hashlib.md5(normalized.encode('utf-8')).hexdigest()

    def _compute_key(self, case: Dict[str, Any]) -> str:
        """키 필드로 고유 키 생성"""
        parts = [
            case.get('formula_name', ''),
            case.get('chief_complaint', '')[:50],
            str(case.get('patient_age', '')),
            case.get('patient_gender', ''),
        ]

        # 빈 값 제외하고 결합
        key_parts = [p for p in parts if p]
        if len(key_parts) < 2:
            return ""

        return '|'.join(key_parts).lower()

    def is_duplicate(self, new_case: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        중복 여부 확인

        Args:
            new_case: 확인할 새 케이스

        Returns:
            (is_duplicate, reason): 중복 여부와 사유
        """
        # 1. URL 중복 확인
        url = new_case.get('source_url', '')
        if url and url in self.existing_urls:
            return True, "duplicate_url"

        # 2. 해시 중복 확인
        content_hash = self._compute_hash(new_case)
        if content_hash and content_hash in self.existing_hashes:
            return True, "duplicate_hash"

        # 3. 키 필드 중복 확인
        key = self._compute_key(new_case)
        if key and key in self.existing_keys:
            return True, "duplicate_key"

        return False, None

    def add_case(self, case: Dict[str, Any]) -> None:
        """
        새 케이스를 인덱스에 추가

        Args:
            case: 추가할 케이스
        """
        # 해시 추가
        content_hash = self._compute_hash(case)
        if content_hash:
            self.existing_hashes.add(content_hash)

        # 키 추가
        key = self._compute_key(case)
        if key:
            self.existing_keys.add(key)

        # URL 추가
        url = case.get('source_url', '')
        if url:
            self.existing_urls.add(url)

    def filter_duplicates(
        self,
        new_cases: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        중복 케이스 필터링

        Args:
            new_cases: 새로 수집된 케이스 리스트

        Returns:
            (unique_cases, duplicate_cases): 고유 케이스와 중복 케이스
        """
        unique = []
        duplicates = []

        for case in new_cases:
            is_dup, reason = self.is_duplicate(case)

            if is_dup:
                case['_duplicate_reason'] = reason
                duplicates.append(case)
            else:
                unique.append(case)
                # 인덱스에 추가하여 이후 케이스와의 중복도 감지
                self.add_case(case)

        return unique, duplicates

    def get_stats(self) -> Dict[str, int]:
        """인덱스 통계"""
        return {
            'indexed_hashes': len(self.existing_hashes),
            'indexed_keys': len(self.existing_keys),
            'indexed_urls': len(self.existing_urls),
        }
