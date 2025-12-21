from openai import OpenAI
from typing import List, Dict, Optional
import asyncio
from functools import partial

from ..core.config import settings

class VectorService:
    """Pinecone 벡터 검색 서비스"""

    def __init__(self):
        self.openai = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.index = None

        # Pinecone 초기화
        if settings.PINECONE_API_KEY:
            try:
                from pinecone import Pinecone
                pc = Pinecone(api_key=settings.PINECONE_API_KEY)
                self.index = pc.Index(settings.PINECONE_INDEX_NAME)
                print(f"✅ Pinecone 인덱스 '{settings.PINECONE_INDEX_NAME}' 연결 완료")
            except Exception as e:
                print(f"⚠️ Pinecone 연결 실패: {e}")
                self.index = None

    async def create_embedding(self, text: str) -> List[float]:
        """텍스트를 임베딩 벡터로 변환"""
        if not self.openai:
            raise ValueError("OpenAI API 키가 설정되지 않았습니다.")

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            partial(
                self.openai.embeddings.create,
                model=settings.EMBEDDING_MODEL,
                input=text
            )
        )
        return response.data[0].embedding

    async def search(
        self,
        query: str,
        filter_dict: Optional[Dict] = None,
        top_k: int = 10,
    ) -> List[Dict]:
        """벡터 유사도 검색"""
        if not self.index:
            print("⚠️ Pinecone 인덱스가 초기화되지 않았습니다. 더미 데이터 반환")
            return self._get_dummy_results()

        # 쿼리 임베딩 생성
        query_embedding = await self.create_embedding(query)

        # Pinecone 검색
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            partial(
                self.index.query,
                vector=query_embedding,
                filter=filter_dict,
                top_k=top_k,
                include_metadata=True
            )
        )

        # 결과 정리
        matches = []
        for match in results.matches:
            matches.append({
                'id': match.id,
                'score': match.score,
                'metadata': match.metadata,
            })

        return matches

    def _get_dummy_results(self) -> List[Dict]:
        """테스트용 더미 결과"""
        return [
            {
                'id': 'dummy_case_001',
                'score': 0.95,
                'metadata': {
                    'case_id': 'LEE-1995-0001',
                    'chief_complaint': '소화불량, 복부 냉증',
                    'symptoms': '식욕부진, 복부팽만, 수족냉증',
                    'formula_name': '이중탕',
                }
            },
            {
                'id': 'dummy_case_002',
                'score': 0.89,
                'metadata': {
                    'case_id': 'LEE-1997-0342',
                    'chief_complaint': '비위허한, 식체',
                    'symptoms': '소화불량, 권태감, 설사',
                    'formula_name': '육군자탕',
                }
            },
        ]
