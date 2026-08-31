import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .core.config import settings
from .core.logger import get_logger
from .core.middleware import ResponseWrapperMiddleware
from .api.v1 import retrieval, recommendation, interaction, case_search, subscription, patient_explanation, formula_recommendation, statistics, collector, personalization
from .services.collector import collector_scheduler

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 라이프사이클 관리"""
    # Startup
    logger.info("AI Engine starting...")
    logger.info("GPT Model: %s", settings.GPT_MODEL)
    logger.info(
        "OpenAI API Key: %s",
        "configured" if settings.OPENAI_API_KEY else "not set",
    )

    # 치험례 수집기 초기화
    try:
        await collector_scheduler.initialize()
        logger.info("Case Collector initialized")
    except Exception:
        logger.exception("Case Collector initialization failed")

    yield

    # Shutdown
    logger.info("AI Engine shutting down...")

    # 수집기 정리
    try:
        await collector_scheduler.cleanup()
    except Exception:
        logger.exception("Case Collector cleanup failed")

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
app.include_router(
    personalization.router,
    prefix="/api/v1/personalization",
    tags=["Personalization (per-doctor)"]
)

@app.get("/")
async def root():
    return {
        "service": "온고지신 AI Engine",
        "version": "1.0.0",
        "model": settings.GPT_MODEL,
        "status": "running"
    }

def _read_commit() -> str | None:
    """
    배포된 커밋. 워크플로가 빌드 직전에 GIT_SHA 파일에 써 넣는다.

    --build-arg 로 넣으려다 배포가 통째로 안 올라가서 파일로 옮겼다.
    프로세스가 뜰 때 한 번만 읽는다 — 헬스체크가 30초마다 두드리는 경로다.
    """
    value = (os.getenv("GIT_SHA") or "").strip()
    if value and value != "unknown":
        return value
    try:
        with open("GIT_SHA", encoding="utf-8") as f:
            value = f.read().strip()
        return value if value and value != "unknown" else None
    except OSError:
        return None


_COMMIT = _read_commit()


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-engine",
        "model": settings.GPT_MODEL,
        # 지금 떠 있는 것이 어느 커밋인지 — 200 만으로는 알 수 없다.
        "commit": _COMMIT,
    }
