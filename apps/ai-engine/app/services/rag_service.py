from typing import List, Dict, Optional

from .vector_service import VectorService
from .llm_service import LLMService
from ..core.config import settings

class RAGService:
    """RAG (Retrieval-Augmented Generation) 서비스"""

    def __init__(self, vector_service: VectorService, llm_service: LLMService):
        self.vector_service = vector_service
        self.llm_service = llm_service

    async def search_similar_cases(
        self,
        query: str,
        filters: Optional[Dict] = None,
        top_k: int = 10,
    ) -> List[Dict]:
        """유사 치험례 검색"""

        # Pinecone 필터 구성
        pinecone_filter = {"type": "symptoms"}
        if filters:
            if filters.get('constitution'):
                pinecone_filter['constitution'] = filters['constitution']

        # 벡터 검색 수행
        results = await self.vector_service.search(
            query=query,
            filter_dict=pinecone_filter,
            top_k=top_k,
        )

        # 중복 제거 및 케이스별 정리
        seen_case_ids = set()
        unique_cases = []

        for match in results:
            case_id = match.get('metadata', {}).get('case_id')
            if case_id and case_id not in seen_case_ids:
                seen_case_ids.add(case_id)
                unique_cases.append(match)

        return unique_cases

    async def get_recommendation(
        self,
        patient_info: Dict,
        top_k: int = 10,
    ) -> Dict:
        """환자 정보 기반 처방 추천"""

        # 1. 증상 텍스트 구성
        symptoms_text = patient_info.get('chief_complaint', '')
        if patient_info.get('symptoms'):
            symptoms_list = [s.get('name', '') for s in patient_info['symptoms'] if s.get('name')]
            if symptoms_list:
                symptoms_text += ". " + ", ".join(symptoms_list)

        # 2. 유사 치험례 검색
        similar_cases = await self.search_similar_cases(
            query=symptoms_text,
            filters={
                'constitution': patient_info.get('constitution'),
            },
            top_k=top_k * 2,  # 후처리를 위해 더 많이 검색
        )

        # 3. LLM 추천 생성
        recommendation = await self.llm_service.generate_recommendation(
            patient_info=patient_info,
            similar_cases=similar_cases,
            current_medications=patient_info.get('current_medications'),
        )

        return {
            **recommendation,
            "similar_cases": similar_cases[:top_k],
        }
