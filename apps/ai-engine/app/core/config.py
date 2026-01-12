from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """애플리케이션 설정"""

    # 환경
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://hanmed-cdss.vercel.app",
        "https://*.vercel.app",
    ]

    # OpenAI GPT
    OPENAI_API_KEY: str = ""
    GPT_MODEL: str = "gpt-4o-mini"

    # Database
    DATABASE_URL: str = ""

    # Supabase
    SUPABASE_URL: str = "https://bbwnroljrrbwnewmamno.supabase.co"
    SUPABASE_KEY: str = ""

    # 토스페이먼츠
    TOSS_CLIENT_KEY: str = ""
    TOSS_SECRET_KEY: str = ""

    # JWT (프론트엔드 토큰 검증용)
    JWT_SECRET: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
