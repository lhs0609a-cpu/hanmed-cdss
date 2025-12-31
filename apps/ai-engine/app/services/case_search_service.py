"""
치험례 검색 서비스
벡터 검색 + 하이브리드 스코어링을 통한 유사 치험례 검색
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field, asdict
import asyncio
from functools import partial
import json
from pathlib import Path

from .vector_service import VectorService
from .hybrid_scorer import HybridScorer, MatchScore, MatchGrade, MatchReason
from ..core.config import settings


@dataclass
class PatientInfo:
    """환자 정보"""
    age: Optional[int] = None
    gender: Optional[str] = None  # 'M' or 'F'
    constitution: Optional[str] = None  # 소음인, 태음인, 소양인, 태양인


@dataclass
class Symptom:
    """증상 정보"""
    name: str
    severity: Optional[int] = None  # 1-10


@dataclass
class CaseSearchRequest:
    """치험례 검색 요청"""
    patient_info: PatientInfo
    chief_complaint: str
    symptoms: List[Symptom] = field(default_factory=list)
    diagnosis: Optional[str] = None
    formula: Optional[str] = None  # 특정 처방으로 필터링
    options: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MatchedCase:
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
    match_score: Dict[str, Any]  # MatchScore를 dict로
    match_reasons: List[Dict[str, Any]]  # MatchReason들을 dict로


@dataclass
class CaseSearchResponse:
    """치험례 검색 응답"""
    results: List[MatchedCase]
    total_found: int
    search_metadata: Dict[str, Any]


class CaseSearchService:
    """치험례 검색 서비스"""

    def __init__(self):
        self.vector_service = VectorService()
        self.scorer = HybridScorer()
        self._local_cases: Optional[List[Dict]] = None

    def _load_local_cases(self) -> List[Dict]:
        """로컬 케이스 데이터 로드 (Pinecone 없을 때 폴백)"""
        if self._local_cases is not None:
            return self._local_cases

        data_file = Path(__file__).parent.parent.parent / "data" / "extracted_cases.json"

        if data_file.exists():
            with open(data_file, 'r', encoding='utf-8') as f:
                self._local_cases = json.load(f)
            print(f"[INFO] Local case data loaded: {len(self._local_cases)} cases")
        else:
            self._local_cases = []
            print("[WARN] No local case data found")

        return self._local_cases

    def _build_query_text(self, request: CaseSearchRequest) -> str:
        """검색 쿼리 텍스트 생성"""
        parts = []

        # 주소증
        if request.chief_complaint:
            parts.append(f"주소증: {request.chief_complaint}")

        # 증상
        symptom_names = [s.name for s in request.symptoms]
        if symptom_names:
            parts.append(f"증상: {', '.join(symptom_names)}")

        # 진단
        if request.diagnosis:
            parts.append(f"진단: {request.diagnosis}")

        # 환자 정보
        patient_parts = []
        if request.patient_info.age:
            patient_parts.append(f"{request.patient_info.age}세")
        if request.patient_info.gender:
            patient_parts.append("남성" if request.patient_info.gender == "M" else "여성")
        if request.patient_info.constitution:
            patient_parts.append(request.patient_info.constitution)

        if patient_parts:
            parts.append(f"환자: {' '.join(patient_parts)}")

        return '\n'.join(parts)

    def _build_query_dict(self, request: CaseSearchRequest) -> Dict:
        """하이브리드 스코어링용 쿼리 딕셔너리 생성"""
        return {
            'chief_complaint': request.chief_complaint,
            'symptoms': [s.name for s in request.symptoms],
            'diagnosis': request.diagnosis or '',
            'formula': request.formula or '',
            'patient_age': request.patient_info.age,
            'patient_gender': request.patient_info.gender,
            'patient_constitution': request.patient_info.constitution,
        }

    def _build_pinecone_filter(self, request: CaseSearchRequest) -> Optional[Dict]:
        """Pinecone 메타데이터 필터 생성"""
        filters = []

        # 체질 필터
        if request.patient_info.constitution:
            filters.append({
                "patient_constitution": {"$eq": request.patient_info.constitution}
            })

        # 특정 처방 필터
        if request.formula:
            filters.append({
                "formula_name": {"$eq": request.formula}
            })

        if len(filters) == 0:
            return None
        elif len(filters) == 1:
            return filters[0]
        else:
            return {"$and": filters}

    async def search(self, request: CaseSearchRequest) -> CaseSearchResponse:
        """
        치험례 검색 실행

        Args:
            request: 검색 요청

        Returns:
            CaseSearchResponse: 검색 결과
        """
        import time
        start_time = time.time()

        top_k = request.options.get('top_k', 10)
        min_confidence = request.options.get('min_confidence', 0)

        # 쿼리 텍스트 생성
        query_text = self._build_query_text(request)
        query_dict = self._build_query_dict(request)

        # Pinecone 검색 시도
        if self.vector_service.index:
            results = await self._search_with_pinecone(
                query_text, query_dict, request, top_k
            )
        else:
            # 로컬 폴백 검색
            results = await self._search_local(query_dict, top_k)

        # 최소 신뢰도 필터링
        if min_confidence > 0:
            results = [r for r in results if r.match_score['total'] >= min_confidence]

        # 점수순 정렬
        results.sort(key=lambda x: x.match_score['total'], reverse=True)

        # 상위 N개만 반환
        results = results[:top_k]

        processing_time = (time.time() - start_time) * 1000

        return CaseSearchResponse(
            results=results,
            total_found=len(results),
            search_metadata={
                'processing_time_ms': round(processing_time, 2),
                'query_text': query_text[:200],
                'vector_search_used': self.vector_service.index is not None,
            }
        )

    async def _search_with_pinecone(
        self,
        query_text: str,
        query_dict: Dict,
        request: CaseSearchRequest,
        top_k: int
    ) -> List[MatchedCase]:
        """Pinecone 벡터 검색"""
        # 메타데이터 필터
        filter_dict = self._build_pinecone_filter(request)

        # 벡터 검색 (더 많이 가져와서 리랭킹)
        search_results = await self.vector_service.search(
            query=query_text,
            filter_dict=filter_dict,
            top_k=top_k * 3  # 리랭킹을 위해 더 많이 가져옴
        )

        # 하이브리드 스코어링
        matched_cases = []
        for result in search_results:
            metadata = result.get('metadata', {})
            vector_score = result.get('score', 0.0)

            # 하이브리드 점수 계산
            match_score = self.scorer.calculate_score(
                query=query_dict,
                case=metadata,
                vector_similarity=vector_score
            )

            matched_case = MatchedCase(
                case_id=metadata.get('case_id', result.get('id', '')),
                title=metadata.get('title', ''),
                formula_name=metadata.get('formula_name', ''),
                formula_hanja=metadata.get('formula_hanja', ''),
                chief_complaint=metadata.get('chief_complaint', ''),
                symptoms=metadata.get('symptoms', []),
                diagnosis=metadata.get('diagnosis', ''),
                patient_age=metadata.get('patient_age'),
                patient_gender=metadata.get('patient_gender'),
                patient_constitution=metadata.get('patient_constitution'),
                treatment_formula=metadata.get('treatment_formula', ''),
                data_source=metadata.get('data_source', ''),
                match_score={
                    'total': match_score.total,
                    'grade': match_score.grade.value,
                    'grade_label': match_score.grade_label,
                    'vector_similarity': match_score.vector_similarity,
                    'keyword_match': match_score.keyword_match,
                    'metadata_match': match_score.metadata_match,
                },
                match_reasons=[
                    {
                        'type': r.type,
                        'description': r.description,
                        'contribution': r.contribution
                    }
                    for r in match_score.reasons
                ]
            )

            matched_cases.append(matched_case)

        return matched_cases

    async def _search_local(
        self,
        query_dict: Dict,
        top_k: int
    ) -> List[MatchedCase]:
        """로컬 데이터 검색 (Pinecone 없을 때 폴백)"""
        cases = self._load_local_cases()

        if not cases:
            return self._get_dummy_results(query_dict)

        matched_cases = []
        query_chief = query_dict.get('chief_complaint', '').lower()
        query_symptoms = [s.lower() for s in query_dict.get('symptoms', [])]

        for case in cases:
            # 간단한 키워드 매칭으로 후보 필터링
            case_chief = case.get('chief_complaint', '').lower()
            case_title = case.get('title', '').lower()
            case_symptoms = [s.lower() for s in case.get('symptoms', [])]

            # 주소증이나 증상이 하나라도 매칭되면 후보에 포함
            is_candidate = False

            if query_chief and (query_chief in case_chief or query_chief in case_title):
                is_candidate = True

            for qs in query_symptoms:
                if any(qs in cs for cs in case_symptoms):
                    is_candidate = True
                    break

            if not is_candidate and query_chief:
                # 주소증이 제목에 포함되어 있는지 확인
                if any(word in case_title for word in query_chief.split()):
                    is_candidate = True

            if is_candidate:
                # 벡터 유사도 없이 키워드/메타데이터만으로 점수 계산
                match_score = self.scorer.calculate_score(
                    query=query_dict,
                    case=case,
                    vector_similarity=0.5  # 기본값
                )

                matched_case = MatchedCase(
                    case_id=case.get('id', ''),
                    title=case.get('title', ''),
                    formula_name=case.get('formula_name', ''),
                    formula_hanja=case.get('formula_hanja', ''),
                    chief_complaint=case.get('chief_complaint', ''),
                    symptoms=case.get('symptoms', []),
                    diagnosis=case.get('diagnosis', ''),
                    patient_age=case.get('patient_age'),
                    patient_gender=case.get('patient_gender'),
                    patient_constitution=case.get('patient_constitution'),
                    treatment_formula=case.get('treatment_formula', ''),
                    data_source=case.get('data_source', ''),
                    match_score={
                        'total': match_score.total,
                        'grade': match_score.grade.value,
                        'grade_label': match_score.grade_label,
                        'vector_similarity': match_score.vector_similarity,
                        'keyword_match': match_score.keyword_match,
                        'metadata_match': match_score.metadata_match,
                    },
                    match_reasons=[
                        {
                            'type': r.type,
                            'description': r.description,
                            'contribution': r.contribution
                        }
                        for r in match_score.reasons
                    ]
                )

                matched_cases.append(matched_case)

        return matched_cases[:top_k * 3]

    def _get_dummy_results(self, query_dict: Dict) -> List[MatchedCase]:
        """테스트용 더미 결과"""
        dummy_cases = [
            {
                'case_id': 'demo-001',
                'title': '중풍(中風), 반신불수(半身不遂)',
                'formula_name': '소속명탕',
                'formula_hanja': '小續命湯',
                'chief_complaint': '중풍',
                'symptoms': ['반신마비', '언어장애', '구안와사'],
                'diagnosis': '중풍',
                'patient_age': 65,
                'patient_gender': 'M',
                'patient_constitution': '소음인',
                'treatment_formula': '소속명탕',
                'data_source': 'demo',
            },
            {
                'case_id': 'demo-002',
                'title': '두통(頭痛), 현훈(眩暈)',
                'formula_name': '반하백출천마탕',
                'formula_hanja': '半夏白朮天麻湯',
                'chief_complaint': '두통',
                'symptoms': ['두통', '어지러움', '구역감'],
                'diagnosis': '담음두통',
                'patient_age': 52,
                'patient_gender': 'F',
                'patient_constitution': '태음인',
                'treatment_formula': '반하백출천마탕',
                'data_source': 'demo',
            },
        ]

        matched = []
        for case in dummy_cases:
            match_score = self.scorer.calculate_score(
                query=query_dict,
                case=case,
                vector_similarity=0.7
            )

            matched.append(MatchedCase(
                case_id=case['case_id'],
                title=case['title'],
                formula_name=case['formula_name'],
                formula_hanja=case['formula_hanja'],
                chief_complaint=case['chief_complaint'],
                symptoms=case['symptoms'],
                diagnosis=case['diagnosis'],
                patient_age=case['patient_age'],
                patient_gender=case['patient_gender'],
                patient_constitution=case['patient_constitution'],
                treatment_formula=case['treatment_formula'],
                data_source=case['data_source'],
                match_score={
                    'total': match_score.total,
                    'grade': match_score.grade.value,
                    'grade_label': match_score.grade_label,
                    'vector_similarity': match_score.vector_similarity,
                    'keyword_match': match_score.keyword_match,
                    'metadata_match': match_score.metadata_match,
                },
                match_reasons=[
                    {
                        'type': r.type,
                        'description': r.description,
                        'contribution': r.contribution
                    }
                    for r in match_score.reasons
                ]
            ))

        return matched


# 싱글톤 인스턴스
case_search_service = CaseSearchService()
