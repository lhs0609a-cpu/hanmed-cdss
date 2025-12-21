from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .core.config import settings
from .api.v1 import retrieval, recommendation, interaction

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 라이프사이클 관리"""
    # Startup
    print("🚀 온고지신 AI Engine 시작 중...")
    from .services.vector_service import VectorService
    try:
        app.state.vector_service = VectorService()
        print("✅ Vector 서비스 초기화 완료")
    except Exception as e:
        print(f"⚠️ Vector 서비스 초기화 실패: {e}")
        app.state.vector_service = None

    yield

    # Shutdown
    print("👋 온고지신 AI Engine 종료 중...")

app = FastAPI(
    title="온고지신 AI Engine",
    description="한의학 CDSS AI/ML 파이프라인 서비스",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(
    retrieval.router,
    prefix="/api/v1/retrieval",
    tags=["RAG Retrieval"]
)
app.include_router(
    recommendation.router,
    prefix="/api/v1/recommend",
    tags=["Prescription Recommendation"]
)
app.include_router(
    interaction.router,
    prefix="/api/v1/interaction",
    tags=["Drug-Herb Interaction"]
)

@app.get("/")
async def root():
    return {
        "service": "온고지신 AI Engine",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-engine"
    }
