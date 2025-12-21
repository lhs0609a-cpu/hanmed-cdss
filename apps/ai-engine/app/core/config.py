from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """애플리케이션 설정"""

    # 환경
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # OpenAI (임베딩)
    OPENAI_API_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-large"
    EMBEDDING_DIMENSION: int = 3072

    # Anthropic Claude (LLM)
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"

    # Pinecone (벡터 DB)
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = "hanmed-cases"
    PINECONE_ENVIRONMENT: str = "us-east-1"

    # NestJS API
    NESTJS_API_URL: str = "http://localhost:3001"
    INTERNAL_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
