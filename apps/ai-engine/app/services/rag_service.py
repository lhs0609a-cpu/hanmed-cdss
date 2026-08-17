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
        *,
        user_id: Optional[str] = None,
    ) -> Dict:
        """환자 정보 기반 처방 추론 후보. user_id 가 있으면 동시성/Rate-limit 에 사용."""
        return await self.llm_service.generate_recommendation(
            patient_info=patient_info,
            current_medications=patient_info.get('current_medications'),
            # top_k 를 넘기지 않아 프롬프트에 후보 개수 지시가 빠져 있었다.
            # 그 결과 요청이 3개를 원해도 모델이 늘 1개만 돌려줬고,
            # 결과 화면의 "다른 후보" 블록이 영영 뜨지 않았다.
            top_k=top_k,
            user_id=user_id,
        )
