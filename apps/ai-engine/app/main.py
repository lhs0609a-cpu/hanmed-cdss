from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .core.config import settings
from .core.middleware import ResponseWrapperMiddleware
from .api.v1 import retrieval, recommendation, interaction, case_search, subscription, patient_explanation, formula_recommendation, statistics, collector
from .services.collector import collector_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 라이프사이클 관리"""
    # Startup
    print("[START] AI Engine starting...")
    print(f"[INFO] GPT Model: {settings.GPT_MODEL}")
    print(f"[INFO] OpenAI API Key: {'configured' if settings.OPENAI_API_KEY else 'not set'}")

    # 치험례 수집기 초기화
    try:
        await collector_scheduler.initialize()
        print("[INFO] Case Collector initialized")
    except Exception as e:
        print(f"[WARN] Case Collector initialization failed: {e}")

    yield

    # Shutdown
    print("[STOP] AI Engine shutting down...")

    # 수집기 정리
    try:
        await collector_scheduler.cleanup()
    except Exception as e:
        print(f"[WARN] Case Collector cleanup failed: {e}")

app = FastAPI(
    title="온고지신 AI Engine",
    description="한의학 CDSS AI 서비스 - GPT-4o-mini 기반",
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

# 응답 래퍼 미들웨어 (NestJS 형식과 호환)
app.add_middleware(ResponseWrapperMiddleware)

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
app.include_router(
    case_search.router,
    prefix="/api/v1",
    tags=["Case Search"]
)
app.include_router(
    subscription.router,
    prefix="/api/v1/subscription",
    tags=["Subscription"]
)
app.include_router(
    patient_explanation.router,
    prefix="/api/v1/patient-explanation",
    tags=["Patient Explanation"]
)
app.include_router(
    formula_recommendation.router,
    prefix="/api/v1",
    tags=["Formula Recommendation"]
)
app.include_router(
    statistics.router,
    prefix="/api/v1",
    tags=["Statistics"]
)
app.include_router(
    collector.router,
    prefix="/api/v1",
    tags=["Case Collector"]
)

@app.get("/")
async def root():
    return {
        "service": "온고지신 AI Engine",
        "version": "1.0.0",
        "model": settings.GPT_MODEL,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-engine",
        "model": settings.GPT_MODEL
    }
