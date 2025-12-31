"""
Vector Service - 비활성화됨

Pinecone 벡터 DB가 제거되었습니다.
모든 처방 추천은 GPT-4o-mini를 통해 직접 수행됩니다.
"""

class VectorService:
    """Deprecated: Pinecone 벡터 서비스 (비활성화)"""
    
    def __init__(self):
        self.index = None  # Pinecone index is disabled
        # print("[INFO] VectorService is disabled. Use GPT-based recommendations.")
    
    async def search(self, query: str, **kwargs):
        return []
