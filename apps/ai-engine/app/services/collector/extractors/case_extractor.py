"""
치험례 추출기
논문 텍스트에서 치험례 정보를 추출
"""

import re
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
import hashlib


@dataclass
class ExtractedCase:
    """추출된 치험례"""
    id: str = ""
    source_url: str = ""
    source_name: str = ""
    article_title: str = ""
    article_authors: List[str] = field(default_factory=list)
    article_journal: str = ""
    article_year: Optional[int] = None
    article_doi: Optional[str] = None

    # 기존 RealCase 스키마와 호환
    formula_name: str = ""
    formula_hanja: str = ""
    title: str = ""
    chief_complaint: str = ""
    symptoms: List[str] = field(default_factory=list)
    sub_symptoms: List[str] = field(default_factory=list)
    diagnosis: str = ""
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    patient_constitution: Optional[str] = None
    appearance: str = ""
    history: str = ""
    reference: str = ""
    differentiation: str = ""
    treatment_principle: str = ""
    prescription_plan: str = ""
    medications: List[Dict] = field(default_factory=list)
    progress: List[Dict] = field(default_factory=list)
    result: str = ""
    full_text: str = ""
    search_text: str = ""

    # 메타데이터
    data_source: str = "online_collection"
    collection_date: str = ""
    confidence_score: float = 0.0
    is_real_case: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        return asdict(self)


class CaseExtractor:
    """
    논문 텍스트에서 치험례 추출
    parse_real_cases.py의 패턴 재사용
    """

    # 처방명 추출 패턴
    FORMULA_PATTERNS = [
        r'(?:복용|투약|처방|사용)\s*[:：]?\s*([가-힣]{2,10}(?:탕|산|환|단|음|원|전|방|제))',
        r'([가-힣]{2,10}(?:탕|산|환|단|음|원|전|방|제))\s*(?:을|를|가|이|의|으로|에|처방)?',
        r'([가-힣]{2,10}(?:탕|산|환|단|음|원|전|방|제))\s*\d*\s*(?:첩|일분|제)?',
    ]

    # 제외할 단어
    EXCLUDE_WORDS = [
        '처방', '투약', '복용', '증상', '경과', '참고', '변증', '치법',
        '가감', '합방', '용량', '약제', '주증', '부증', '원방', '본방',
        '이라고', '라고', '것이라고', '한다고'
    ]

    # 잘못된 어미
    FALSE_ENDINGS = [
        '하고', '다고', '라고', '아고', '이고', '으로', '없고',
        '있고', '했고', '됐고', '못하고', '않고', '치고', '되고', '지고',
        '순환', '한의원', '의원', '약국', '약방', '병원', '침술'
    ]

    # 체질 패턴
    CONSTITUTIONS = ['소음인', '태음인', '소양인', '태양인']

    # 유효한 "~고" 처방명
    VALID_GO_FORMULAS = ['경옥고', '자옥고', '응약고', '황련고', '자운고', '옥용고']

    def __init__(self):
        pass

    def extract_cases(self, article_text: str, article_info: Dict) -> List[ExtractedCase]:
        """
        논문 텍스트에서 치험례 추출

        Args:
            article_text: 논문 전문 텍스트
            article_info: 논문 메타정보 (title, authors, journal, year, url, doi)

        Returns:
            추출된 치험례 리스트
        """
        cases = []

        # 치험례 관련 키워드가 있는지 확인
        if not self._has_case_keywords(article_text):
            return cases

        # 케이스 블록 분리 시도
        case_blocks = self._split_into_case_blocks(article_text)

        if not case_blocks:
            # 분리 실패시 전체를 하나의 케이스로 처리
            case_blocks = [article_text]

        for i, block in enumerate(case_blocks):
            # 너무 짧은 블록은 스킵 (단, 하나뿐이면 처리)
            if len(block.strip()) < 50 and len(case_blocks) > 1:
                continue

            case = self._extract_single_case(block, article_info, i + 1)
            if case and self._is_valid_case(case):
                cases.append(case)

        return cases

    def _has_case_keywords(self, text: str) -> bool:
        """치험례 관련 키워드 존재 확인"""
        keywords = ['치험례', '증례', '임상례', 'case', '환자', '주소증', '변증', '처방']
        text_lower = text.lower()
        return any(kw in text_lower for kw in keywords)

    def _split_into_case_blocks(self, text: str) -> List[str]:
        """텍스트를 케이스 블록으로 분리"""
        blocks = []

        # 다양한 구분자 패턴
        patterns = [
            r'(?:증례|Case|사례)\s*\d+',  # 증례 1, Case 1
            r'■\s*',  # ■ 구분자
            r'▶\s*',  # ▶ 구분자
            r'\n\d+\.\s*환자',  # 1. 환자
        ]

        for pattern in patterns:
            splits = re.split(pattern, text, flags=re.IGNORECASE)
            if len(splits) > 1:
                blocks = [s for s in splits if len(s.strip()) > 100]
                if blocks:
                    return blocks

        return blocks

    def _extract_single_case(
        self,
        text: str,
        article_info: Dict,
        case_number: int
    ) -> Optional[ExtractedCase]:
        """단일 케이스 추출"""

        case = ExtractedCase(
            id=self._generate_case_id(text, article_info),
            source_url=article_info.get('url', ''),
            source_name=article_info.get('source', 'online'),
            article_title=article_info.get('title', ''),
            article_authors=article_info.get('authors', []),
            article_journal=article_info.get('journal', ''),
            article_year=article_info.get('year'),
            article_doi=article_info.get('doi'),
            collection_date=datetime.now().isoformat(),
        )

        # 환자 정보 추출
        self._extract_patient_info(text, case)

        # 주소증 추출
        case.chief_complaint = self._extract_chief_complaint(text)

        # 증상 추출
        case.symptoms = self._extract_symptoms(text)

        # 처방명 추출
        case.formula_name = self._extract_formula_name(text)

        # 진단/변증 추출
        case.diagnosis = self._extract_diagnosis(text)
        case.differentiation = self._extract_differentiation(text)

        # 치료 결과 추출
        case.result = self._extract_result(text)

        # 경과 추출
        case.progress = self._extract_progress(text)

        # 제목 생성
        case.title = self._generate_title(case, case_number)

        # 전체 텍스트 저장
        case.full_text = text[:2000]

        # 검색 텍스트 생성
        case.search_text = self._generate_search_text(case)

        # 신뢰도 점수 계산
        case.confidence_score = self._calculate_confidence(case)

        return case

    def _generate_case_id(self, text: str, article_info: Dict) -> str:
        """고유 케이스 ID 생성"""
        content = f"{article_info.get('url', '')}{text[:500]}"
        hash_obj = hashlib.md5(content.encode('utf-8'))
        return f"online_{hash_obj.hexdigest()[:12]}"

    def _extract_patient_info(self, text: str, case: ExtractedCase) -> None:
        """환자 정보 추출"""
        # 나이 추출
        age_patterns = [
            r'(\d+)\s*세',
            r'(\d+)\s*歲',
            r'환자[:\s]*(\d+)\s*세',
        ]
        for pattern in age_patterns:
            match = re.search(pattern, text)
            if match:
                age = int(match.group(1))
                if 0 < age < 120:
                    case.patient_age = age
                    break

        # 성별 추출
        if '여' in text[:500] or '女' in text[:500]:
            case.patient_gender = 'F'
        elif '남' in text[:500] or '男' in text[:500]:
            case.patient_gender = 'M'

        # 체질 추출
        for constitution in self.CONSTITUTIONS:
            if constitution in text:
                case.patient_constitution = constitution
                break

    def _extract_chief_complaint(self, text: str) -> str:
        """주소증 추출"""
        patterns = [
            r'주\s*소\s*증?\s*[:：]\s*(.+?)(?=현병력|과거력|변증|치법|처방|\n|$)',
            r'주\s*증\s*상\s*[:：]?\s*(.+?)(?=부수증상|참고|변증|\n|$)',
            r'C/?C\s*[:：]\s*(.+?)(?=\n|$)',
            r'호\s*소\s*[:：]\s*(.+?)(?=\n|$)',
            # 더 넓은 패턴
            r'(?:주소증|주증상|증상)\s*[:：]\s*(.+?)(?=\n|변증|처방|$)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                complaint = match.group(1).strip()
                # 정리
                complaint = re.sub(r'\s+', ' ', complaint)
                if len(complaint) > 3:
                    return complaint[:300]

        return ""

    def _extract_symptoms(self, text: str) -> List[str]:
        """증상 리스트 추출"""
        symptoms = []

        # 번호 매긴 증상
        pattern = r'\d+[.\)]\s*(.+?)(?=\d+[.\)]|$)'
        matches = re.findall(pattern, text[:1000])
        for m in matches:
            symptom = m.strip()
            if 3 < len(symptom) < 100:
                symptoms.append(symptom)

        return symptoms[:10]  # 최대 10개

    def _extract_formula_name(self, text: str) -> str:
        """처방명 추출 (parse_real_cases.py 로직 재사용)"""

        def is_valid_formula(name: str) -> bool:
            if not name or len(name) < 3:
                return False
            if name in self.EXCLUDE_WORDS:
                return False
            for ending in self.FALSE_ENDINGS:
                if name.endswith(ending):
                    return False
            if name.endswith('고') and name not in self.VALID_GO_FORMULAS:
                return False
            return True

        # 패턴 매칭
        for pattern in self.FORMULA_PATTERNS:
            matches = re.findall(pattern, text)
            for match in matches:
                if is_valid_formula(match):
                    return match

        # 마지막 시도
        broad_pattern = r'([가-힣]{3,12}(?:탕|산|환|단|음|원|전|방|제))'
        matches = re.findall(broad_pattern, text)
        for match in matches:
            if is_valid_formula(match) and len(match) >= 4:
                return match

        return ""

    def _extract_diagnosis(self, text: str) -> str:
        """진단 추출"""
        patterns = [
            r'진\s*단\s*[:：]?\s*(.+?)(?=변증|치법|처방|$)',
            r'(?:한의학적\s*)?진단명\s*[:：]?\s*(.+?)(?=\n|$)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                diagnosis = match.group(1).strip()
                return diagnosis[:100]

        return ""

    def _extract_differentiation(self, text: str) -> str:
        """변증 추출"""
        patterns = [
            r'변\s*증\s*[:：]?\s*(.+?)(?=치법|처방|투약|$)',
            r'변\s*상\s*[:：]?\s*(.+?)(?=치법|처방|$)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                diff = match.group(1).strip()
                return diff[:200]

        return ""

    def _extract_result(self, text: str) -> str:
        """치료 결과 추출"""
        patterns = [
            r'(?:치료\s*)?결\s*과\s*[:：]?\s*(.+?)(?=고찰|결론|참고문헌|$)',
            r'경\s*과\s*[:：]?\s*(.+?)(?=고찰|결론|$)',
            r'예\s*후\s*[:：]?\s*(.+?)(?=고찰|결론|$)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                result = match.group(1).strip()
                # 너무 길면 잘라냄
                return result[:500]

        return ""

    def _extract_progress(self, text: str) -> List[Dict]:
        """경과 기록 추출"""
        progress = []

        # 날짜별 경과 패턴
        date_pattern = r'(\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d+일차?|\d+주차?)\s*[:：]?\s*(.+?)(?=\d{4}[-./]|\d+일차|\d+주차|$)'
        matches = re.findall(date_pattern, text)

        for date, content in matches[:10]:
            progress.append({
                'date': date.strip(),
                'content': content.strip()[:200]
            })

        return progress

    def _generate_title(self, case: ExtractedCase, case_number: int) -> str:
        """케이스 제목 생성"""
        parts = []

        if case.formula_name:
            parts.append(case.formula_name)

        if case.chief_complaint:
            parts.append(case.chief_complaint[:30])
        elif case.diagnosis:
            parts.append(case.diagnosis[:30])

        if parts:
            return ' - '.join(parts)

        return f"Case {case_number}"

    def _generate_search_text(self, case: ExtractedCase) -> str:
        """검색용 텍스트 생성"""
        parts = [
            case.formula_name,
            case.title,
            case.chief_complaint,
            ' '.join(case.symptoms),
            case.diagnosis,
            case.differentiation,
            case.patient_constitution or '',
        ]
        return ' '.join(p for p in parts if p)

    def _calculate_confidence(self, case: ExtractedCase) -> float:
        """추출 신뢰도 점수 계산 (0-1)"""
        score = 0.0

        # 필수 필드 존재 여부
        if case.chief_complaint:
            score += 0.25
        if case.formula_name:
            score += 0.25
        if case.patient_age or case.patient_gender:
            score += 0.1
        if case.patient_constitution:
            score += 0.15
        if case.result:
            score += 0.15
        if case.symptoms:
            score += 0.1

        return min(score, 1.0)

    def _is_valid_case(self, case: ExtractedCase) -> bool:
        """유효한 케이스인지 확인"""
        # 최소 조건: 주소증 또는 처방명이 있어야 함
        if not case.chief_complaint and not case.formula_name:
            return False

        # 너무 짧으면 제외 (50자 이상)
        if len(case.full_text) < 50:
            return False

        return True
