from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


# 검색 요청/응답
class RetrievalRequest(BaseModel):
    query: str = Field(..., description="검색 쿼리 (증상, 진단명 등)")
    top_k: int = Field(5, ge=1, le=20, description="반환할 치험례 수")
    filters: Optional[dict] = Field(None, description="메타데이터 필터")


class CaseResult(BaseModel):
    case_id: str
    title: str
    symptoms: List[str]
    diagnosis: str
    prescription: List[str]
    outcome: str
    similarity_score: float


class RetrievalResponse(BaseModel):
    results: List[CaseResult]
    total_count: int
    query: str


# 처방 추천 요청/응답
class RecommendationRequest(BaseModel):
    symptoms: List[str] = Field(..., min_length=1, description="환자 증상 목록")
    diagnosis: Optional[str] = Field(None, description="진단명")
    patient_info: Optional[dict] = Field(None, description="환자 정보 (나이, 성별 등)")
    current_medications: Optional[List[str]] = Field(None, description="현재 복용 중인 약물")


class HerbIngredient(BaseModel):
    name: str
    dosage: str
    role: str  # 군, 신, 좌, 사


class PrescriptionRecommendation(BaseModel):
    prescription_name: str
    herbs: List[HerbIngredient]
    rationale: str
    confidence_score: float
    similar_cases: List[str]


class RecommendationResponse(BaseModel):
    recommendations: List[PrescriptionRecommendation]
    analysis: str
    warnings: Optional[List[str]] = None


# 상호작용 검사 요청/응답
class InteractionRequest(BaseModel):
    herbs: List[str] = Field(..., min_length=1, description="처방 약재 목록")
    drugs: List[str] = Field(default=[], description="복용 중인 양약 목록")


class InteractionItem(BaseModel):
    drug_name: str
    herb_name: str
    mechanism: str
    severity: Severity
    recommendation: str


class InteractionResponse(BaseModel):
    has_interactions: bool
    total_count: int
    by_severity: dict
    overall_safety: str
    recommendations: List[str]


# 건강 체크
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
