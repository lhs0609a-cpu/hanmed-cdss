from typing import List, Dict, Optional

from .llm_service import LLMService

class RAGService:
    """GPT 기반 처방 추천 서비스 (Pinecone 제거됨)"""

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service

    async def get_recommendation(
        self,
        patient_info: Dict,
        top_k: int = 3,
    ) -> Dict:
        """환자 정보 기반 처방 추천"""

        # GPT로 직접 추천 생성
        recommendation = await self.llm_service.generate_recommendation(
            patient_info=patient_info,
            current_medications=patient_info.get('current_medications'),
        )

        return recommendation
