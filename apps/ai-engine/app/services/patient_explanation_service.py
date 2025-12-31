from openai import OpenAI
from typing import List, Dict, Optional
import json

from ..core.config import settings


class PatientExplanationService:
    """환자용 쉬운 설명 생성 서비스"""

    PATIENT_SYSTEM_PROMPT = """당신은 한의학 전문가로서, 환자들이 자신의 건강 상태와 처방을 쉽게 이해할 수 있도록 설명해주는 AI입니다.

## 역할
- 복잡한 한의학 용어를 일상적인 언어로 번역합니다.
- 환자의 상태를 비유와 예시를 통해 이해하기 쉽게 설명합니다.
- 한약재의 효능과 역할을 과학적 근거와 함께 설명합니다.
- 건강 관리 방법을 구체적이고 실천 가능하게 안내합니다.

## 설명 원칙
1. 전문 용어는 괄호 안에 부연 설명을 추가합니다.
2. 비유와 일상적인 예시를 활용합니다.
3. 긍정적이고 희망적인 톤을 유지합니다.
4. 과학적 근거가 있는 경우 함께 언급합니다.
5. 복약 및 생활습관 권고사항은 구체적으로 안내합니다.
6. 응답은 반드시 한국어로 작성합니다.
"""

    HEALTH_RECORD_PROMPT = """## 진료 기록 설명 요청

환자가 이해할 수 있도록 아래 진료 기록을 쉬운 말로 설명해주세요.

### 진료 정보
- 진료일: {visit_date}
- 주증상: {chief_complaint}
- 증상들: {symptoms}
- 진단: {diagnosis}
- 치료: {treatment}

### 환자 정보
- 나이/성별: {patient_age}세 {patient_gender}
- 체질: {constitution}

### 요청 형식
JSON 형식으로 응답해주세요:
{{
  "summary": "전체 내용을 2-3문장으로 요약",
  "conditionExplanation": "현재 몸 상태를 쉬운 말로 설명 (비유 활용)",
  "diagnosisExplanation": "진단 내용을 환자가 이해할 수 있게 설명",
  "treatmentExplanation": "치료 방법과 왜 이 치료가 필요한지 설명",
  "keyFindings": ["중요한 발견 사항 1", "중요한 발견 사항 2"],
  "riskFactors": ["주의해야 할 점 1"],
  "improvements": ["기대되는 개선점 1", "기대되는 개선점 2"],
  "lifestyleAdvice": ["생활 습관 조언 1", "생활 습관 조언 2", "생활 습관 조언 3"],
  "nextSteps": "다음 진료까지 해야 할 일"
}}"""

    PRESCRIPTION_PROMPT = """## 처방 설명 요청

환자가 이해할 수 있도록 아래 처방 정보를 쉬운 말로 설명해주세요.

### 처방 정보
- 처방명: {formula_name}
- 구성 약재: {herbs}
- 복용법: {dosage_instructions}
- 처방 목적: {purpose}

### 환자 상태
- 주증상: {chief_complaint}
- 진단: {diagnosis}

### 요청 형식
JSON 형식으로 응답해주세요:
{{
  "summary": "이 처방의 핵심 효과를 1-2문장으로 요약",
  "formulaExplanation": "처방의 전체적인 작용을 쉬운 비유로 설명",
  "herbExplanations": [
    {{
      "herbName": "약재명",
      "role": "이 약재의 역할 (예: 주된 치료, 보조, 조화)",
      "efficacy": "이 약재가 어떤 효과가 있는지 쉽게 설명",
      "scientificInfo": "과학적으로 밝혀진 효능 (있는 경우)"
    }}
  ],
  "expectedEffects": ["기대되는 효과 1", "기대되는 효과 2"],
  "howItWorks": "이 처방이 몸에서 어떻게 작용하는지 쉬운 설명",
  "dosageExplanation": "복용법을 쉽게 설명",
  "precautions": ["주의사항 1", "주의사항 2"],
  "dietaryAdvice": ["식이 조언 1", "식이 조언 2"]
}}"""

    HERB_INFO_PROMPT = """## 약재 정보 요청

아래 약재에 대해 환자가 이해할 수 있는 정보를 제공해주세요.

### 약재 정보
- 약재명: {herb_name}
- 한약재 분류: {category}
- 효능: {efficacy}
- 용도: {usage}

### 요청 형식
JSON 형식으로 응답해주세요:
{{
  "koreanName": "한글 이름",
  "commonName": "일반적으로 불리는 이름 (있으면)",
  "simpleDescription": "이 약재가 무엇인지 한 문장으로 설명",
  "mainEffects": ["주요 효과 1", "주요 효과 2"],
  "howItHelps": "이 약재가 몸에 어떻게 도움이 되는지 쉬운 설명",
  "scientificEvidence": {{
    "activeCompounds": ["주요 활성 성분들"],
    "researches": ["관련 연구 결과 요약"]
  }},
  "traditionalUse": "전통적으로 어떻게 사용되어 왔는지",
  "modernApplications": "현대에는 어떻게 활용되는지",
  "precautions": ["주의할 점"],
  "funFact": "흥미로운 사실 하나"
}}"""

    HEALTH_TIP_PROMPT = """## 건강 팁 생성 요청

아래 환자 정보를 바탕으로 맞춤형 건강 관리 팁을 생성해주세요.

### 환자 정보
- 체질: {constitution}
- 주요 증상: {main_symptoms}
- 현재 처방: {current_prescription}
- 계절/날씨: {season}

### 요청 형식
JSON 형식으로 응답해주세요:
{{
  "dailyTips": [
    {{
      "category": "음식",
      "tip": "구체적인 팁",
      "reason": "왜 좋은지 간단한 설명"
    }},
    {{
      "category": "운동",
      "tip": "구체적인 팁",
      "reason": "왜 좋은지 간단한 설명"
    }},
    {{
      "category": "생활습관",
      "tip": "구체적인 팁",
      "reason": "왜 좋은지 간단한 설명"
    }}
  ],
  "avoidList": ["피해야 할 것들"],
  "seasonalAdvice": "현재 계절에 맞는 조언",
  "motivationalMessage": "환자를 격려하는 한마디"
}}"""

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY
        ) if settings.OPENAI_API_KEY else None

    async def explain_health_record(
        self,
        record_data: Dict,
        patient_data: Optional[Dict] = None
    ) -> Dict:
        """진료 기록을 환자용으로 설명"""

        if not self.client:
            return self._get_dummy_record_explanation()

        symptoms_text = ", ".join([
            s.get('name', '') for s in record_data.get('symptoms', [])
        ]) if record_data.get('symptoms') else "기록 없음"

        user_prompt = self.HEALTH_RECORD_PROMPT.format(
            visit_date=record_data.get('visitDate', ''),
            chief_complaint=record_data.get('chiefComplaint', ''),
            symptoms=symptoms_text,
            diagnosis=record_data.get('diagnosis', ''),
            treatment=record_data.get('treatment', ''),
            patient_age=patient_data.get('age', '미상') if patient_data else '미상',
            patient_gender=patient_data.get('gender', '미상') if patient_data else '미상',
            constitution=patient_data.get('constitution', '미상') if patient_data else '미상',
        )

        return await self._generate_response(user_prompt)

    async def explain_prescription(
        self,
        prescription_data: Dict,
        patient_context: Optional[Dict] = None
    ) -> Dict:
        """처방을 환자용으로 설명"""

        if not self.client:
            return self._get_dummy_prescription_explanation()

        herbs_text = ", ".join([
            f"{h.get('name', '')}({h.get('amount', '')})"
            for h in prescription_data.get('herbs', [])
        ]) if prescription_data.get('herbs') else "기록 없음"

        user_prompt = self.PRESCRIPTION_PROMPT.format(
            formula_name=prescription_data.get('formulaName', ''),
            herbs=herbs_text,
            dosage_instructions=prescription_data.get('dosageInstructions', ''),
            purpose=prescription_data.get('purpose', ''),
            chief_complaint=patient_context.get('chiefComplaint', '') if patient_context else '',
            diagnosis=patient_context.get('diagnosis', '') if patient_context else '',
        )

        return await self._generate_response(user_prompt)

    async def explain_herb(self, herb_data: Dict) -> Dict:
        """약재를 환자용으로 설명"""

        if not self.client:
            return self._get_dummy_herb_explanation(herb_data.get('name', ''))

        user_prompt = self.HERB_INFO_PROMPT.format(
            herb_name=herb_data.get('name', ''),
            category=herb_data.get('category', ''),
            efficacy=herb_data.get('efficacy', ''),
            usage=herb_data.get('usage', ''),
        )

        return await self._generate_response(user_prompt)

    async def generate_health_tips(
        self,
        patient_data: Dict,
        current_prescription: Optional[str] = None,
        season: Optional[str] = None
    ) -> Dict:
        """맞춤형 건강 팁 생성"""

        if not self.client:
            return self._get_dummy_health_tips()

        symptoms_text = ", ".join(patient_data.get('mainSymptoms', [])) or "없음"

        user_prompt = self.HEALTH_TIP_PROMPT.format(
            constitution=patient_data.get('constitution', '미상'),
            main_symptoms=symptoms_text,
            current_prescription=current_prescription or "없음",
            season=season or "봄",
        )

        return await self._generate_response(user_prompt)

    async def generate_medication_reminder_message(
        self,
        prescription_name: str,
        time_of_day: str,
        patient_name: Optional[str] = None
    ) -> Dict:
        """복약 알림 메시지 생성"""

        name = patient_name or "환자"

        messages = {
            "morning": f"{name}님, 좋은 아침이에요! {prescription_name} 복용 시간입니다. 건강한 하루의 시작을 응원합니다.",
            "lunch": f"{name}님, 점심 식사는 맛있게 하셨나요? {prescription_name} 복용을 잊지 마세요.",
            "dinner": f"{name}님, {prescription_name} 복용 시간이에요. 하루를 건강하게 마무리해요.",
            "bedtime": f"{name}님, 편안한 밤 되세요. {prescription_name} 복용 후 푹 주무시길 바랍니다.",
        }

        return {
            "title": "복약 알림",
            "message": messages.get(time_of_day, f"{name}님, {prescription_name} 복용 시간입니다."),
            "encouragement": "꾸준한 복용이 건강 회복의 첫걸음입니다!"
        }

    async def _generate_response(self, user_prompt: str) -> Dict:
        """GPT 응답 생성"""
        try:
            response = self.client.chat.completions.create(
                model=settings.GPT_MODEL,
                max_tokens=2048,
                messages=[
                    {"role": "system", "content": self.PATIENT_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ]
            )

            content = response.choices[0].message.content

            # JSON 파싱
            try:
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                return json.loads(content.strip())
            except:
                return {"rawResponse": content}

        except Exception as e:
            print(f"LLM 호출 오류: {e}")
            return {"error": str(e)}

    def _get_dummy_record_explanation(self) -> Dict:
        """테스트용 진료 기록 설명"""
        return {
            "summary": "소화가 잘 안되고 피로감이 있어 진료를 받으셨습니다. 비위(소화기관)가 약해진 상태로 보입니다.",
            "conditionExplanation": "우리 몸의 소화기관을 자동차 엔진에 비유하면, 지금은 엔진이 조금 약해져서 연료(음식)를 제대로 태우지 못하고 있는 상태예요. 그래서 피로하고 소화가 안 되는 거죠.",
            "diagnosisExplanation": "한의학에서는 이런 상태를 '비위허약'이라고 해요. 쉽게 말해, 소화기관의 힘이 떨어진 상태입니다.",
            "treatmentExplanation": "소화기관을 따뜻하게 하고 기운을 북돋아주는 한약을 처방받으셨어요. 마치 약해진 엔진에 좋은 연료와 윤활유를 넣어주는 것과 같아요.",
            "keyFindings": ["소화기능 저하", "기력 부족", "복부 냉감"],
            "riskFactors": ["찬 음식 과다 섭취", "불규칙한 식사"],
            "improvements": ["소화 기능 개선", "에너지 회복", "전반적인 컨디션 향상"],
            "lifestyleAdvice": ["따뜻한 음식 위주로 드세요", "규칙적인 식사 시간을 지켜주세요", "과식을 피하고 천천히 드세요"],
            "nextSteps": "2주 후 재진료 예정이에요. 그 사이 처방받은 한약을 꾸준히 복용해주세요.",
            "note": "테스트용 더미 데이터입니다."
        }

    def _get_dummy_prescription_explanation(self) -> Dict:
        """테스트용 처방 설명"""
        return {
            "summary": "소화 기능을 따뜻하게 하고 기운을 북돋아주는 처방입니다.",
            "formulaExplanation": "이 처방은 몸의 중심부(비위)를 따뜻하게 데워서 소화력을 높여주는 역할을 해요. 추운 날 히터를 켜면 실내가 따뜻해지듯, 이 약이 소화기관을 따뜻하게 해서 음식을 잘 소화할 수 있게 도와줍니다.",
            "herbExplanations": [
                {
                    "herbName": "인삼",
                    "role": "주된 치료 역할",
                    "efficacy": "기운을 북돋아주고 소화기관을 튼튼하게 합니다.",
                    "scientificInfo": "진세노사이드 성분이 피로 회복과 면역력 증진에 도움을 줍니다."
                },
                {
                    "herbName": "건강(생강)",
                    "role": "보조 치료 역할",
                    "efficacy": "소화기관을 따뜻하게 하고 구역감을 줄여줍니다.",
                    "scientificInfo": "진저롤 성분이 소화를 촉진하고 항염 효과가 있습니다."
                }
            ],
            "expectedEffects": ["소화력 향상", "피로감 감소", "복부 불편감 개선"],
            "howItWorks": "이 약은 소화기관을 따뜻하게 하고 기운을 보충해서, 음식을 잘 소화시키고 영양분을 제대로 흡수할 수 있게 도와줍니다.",
            "dosageExplanation": "하루 3회, 식후 30분에 따뜻한 물과 함께 드세요.",
            "precautions": ["기름진 음식은 피해주세요", "찬 음료는 삼가주세요"],
            "dietaryAdvice": ["따뜻한 죽이나 국 종류가 좋습니다", "소화가 잘 되는 음식 위주로 드세요"],
            "note": "테스트용 더미 데이터입니다."
        }

    def _get_dummy_herb_explanation(self, herb_name: str) -> Dict:
        """테스트용 약재 설명"""
        return {
            "koreanName": herb_name,
            "commonName": herb_name,
            "simpleDescription": f"{herb_name}은(는) 한의학에서 오랫동안 사용되어 온 약재입니다.",
            "mainEffects": ["기력 보강", "소화 촉진"],
            "howItHelps": "몸의 기운을 보충하고 소화 기능을 도와줍니다.",
            "scientificEvidence": {
                "activeCompounds": ["다양한 활성 성분"],
                "researches": ["다양한 연구에서 효능이 확인되었습니다."]
            },
            "traditionalUse": "수천 년 동안 건강 증진을 위해 사용되어 왔습니다.",
            "modernApplications": "현대에도 한약 처방에 널리 사용됩니다.",
            "precautions": ["과량 복용을 피하세요"],
            "funFact": "한의학의 중요한 약재 중 하나입니다.",
            "note": "테스트용 더미 데이터입니다."
        }

    def _get_dummy_health_tips(self) -> Dict:
        """테스트용 건강 팁"""
        return {
            "dailyTips": [
                {
                    "category": "음식",
                    "tip": "아침에 따뜻한 물 한 잔으로 시작하세요",
                    "reason": "소화기관을 부드럽게 깨우고 신진대사를 활성화합니다."
                },
                {
                    "category": "운동",
                    "tip": "식후 10분 가벼운 산책을 해보세요",
                    "reason": "소화를 돕고 혈액순환을 촉진합니다."
                },
                {
                    "category": "생활습관",
                    "tip": "규칙적인 식사 시간을 유지하세요",
                    "reason": "소화기관이 리듬을 찾아 효율적으로 일할 수 있습니다."
                }
            ],
            "avoidList": ["찬 음식과 음료", "과식", "늦은 야식"],
            "seasonalAdvice": "봄철에는 새싹 채소와 같은 가벼운 음식이 좋습니다.",
            "motivationalMessage": "건강은 작은 습관의 변화에서 시작됩니다. 오늘도 건강한 하루 보내세요!",
            "note": "테스트용 더미 데이터입니다."
        }
