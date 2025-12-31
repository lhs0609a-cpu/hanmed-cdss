from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from ...services.patient_explanation_service import PatientExplanationService

router = APIRouter()
explanation_service = PatientExplanationService()


# ===== Request/Response Models =====

class SymptomInput(BaseModel):
    name: str
    severity: Optional[int] = None
    duration: Optional[str] = None


class PatientInfo(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    constitution: Optional[str] = None


class RecordExplanationRequest(BaseModel):
    visitDate: str = Field(..., description="진료일")
    chiefComplaint: str = Field(..., description="주소증")
    symptoms: Optional[List[SymptomInput]] = Field(None, description="증상 목록")
    diagnosis: Optional[str] = Field(None, description="진단")
    treatment: Optional[str] = Field(None, description="치료 내용")
    patientInfo: Optional[PatientInfo] = Field(None, description="환자 정보")


class HerbInput(BaseModel):
    name: str
    amount: Optional[str] = None
    role: Optional[str] = None


class PrescriptionExplanationRequest(BaseModel):
    formulaName: str = Field(..., description="처방명")
    herbs: List[HerbInput] = Field(..., description="구성 약재")
    dosageInstructions: Optional[str] = Field(None, description="복용법")
    purpose: Optional[str] = Field(None, description="처방 목적")
    patientContext: Optional[Dict] = Field(None, description="환자 상태 정보")


class HerbExplanationRequest(BaseModel):
    name: str = Field(..., description="약재명")
    category: Optional[str] = Field(None, description="분류")
    efficacy: Optional[str] = Field(None, description="효능")
    usage: Optional[str] = Field(None, description="용도")


class HealthTipsRequest(BaseModel):
    constitution: Optional[str] = Field(None, description="체질")
    mainSymptoms: Optional[List[str]] = Field(None, description="주요 증상")
    currentPrescription: Optional[str] = Field(None, description="현재 복용 중인 처방")
    season: Optional[str] = Field(None, description="계절")


class MedicationReminderRequest(BaseModel):
    prescriptionName: str = Field(..., description="처방명")
    timeOfDay: str = Field(..., description="복용 시간대 (morning/lunch/dinner/bedtime)")
    patientName: Optional[str] = Field(None, description="환자 이름")


# ===== API Endpoints =====

@router.post("/record")
async def explain_health_record(request: RecordExplanationRequest):
    """
    진료 기록을 환자가 이해할 수 있는 쉬운 말로 설명합니다.
    """
    try:
        record_data = {
            "visitDate": request.visitDate,
            "chiefComplaint": request.chiefComplaint,
            "symptoms": [s.dict() for s in request.symptoms] if request.symptoms else [],
            "diagnosis": request.diagnosis,
            "treatment": request.treatment,
        }

        patient_data = None
        if request.patientInfo:
            patient_data = {
                "age": request.patientInfo.age,
                "gender": request.patientInfo.gender,
                "constitution": request.patientInfo.constitution,
            }

        result = await explanation_service.explain_health_record(record_data, patient_data)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prescription")
async def explain_prescription(request: PrescriptionExplanationRequest):
    """
    처방을 환자가 이해할 수 있는 쉬운 말로 설명합니다.
    약재의 효능과 역할을 과학적 근거와 함께 설명합니다.
    """
    try:
        prescription_data = {
            "formulaName": request.formulaName,
            "herbs": [h.dict() for h in request.herbs],
            "dosageInstructions": request.dosageInstructions,
            "purpose": request.purpose,
        }

        result = await explanation_service.explain_prescription(
            prescription_data,
            request.patientContext
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/herb")
async def explain_herb(request: HerbExplanationRequest):
    """
    개별 약재에 대한 정보를 환자가 이해할 수 있게 설명합니다.
    """
    try:
        herb_data = {
            "name": request.name,
            "category": request.category,
            "efficacy": request.efficacy,
            "usage": request.usage,
        }

        result = await explanation_service.explain_herb(herb_data)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/health-tips")
async def generate_health_tips(request: HealthTipsRequest):
    """
    환자의 체질과 증상에 맞는 맞춤형 건강 팁을 생성합니다.
    """
    try:
        patient_data = {
            "constitution": request.constitution,
            "mainSymptoms": request.mainSymptoms or [],
        }

        result = await explanation_service.generate_health_tips(
            patient_data,
            request.currentPrescription,
            request.season
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/medication-reminder")
async def generate_medication_reminder(request: MedicationReminderRequest):
    """
    복약 알림 메시지를 생성합니다.
    """
    try:
        result = await explanation_service.generate_medication_reminder_message(
            request.prescriptionName,
            request.timeOfDay,
            request.patientName
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test")
async def test_explanation_service():
    """
    환자 설명 서비스 테스트 엔드포인트
    """
    return {
        "service": "patient-explanation",
        "status": "active",
        "endpoints": [
            "POST /record - 진료 기록 설명",
            "POST /prescription - 처방 설명",
            "POST /herb - 약재 설명",
            "POST /health-tips - 건강 팁 생성",
            "POST /medication-reminder - 복약 알림 메시지",
        ]
    }
