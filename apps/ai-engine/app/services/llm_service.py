from openai import OpenAI
from typing import List, Dict, Optional
import json

from ..core.config import settings

class LLMService:
    """OpenAI GPT를 사용한 LLM 서비스 - 온고지신 GPT"""

    SYSTEM_PROMPT = """당신은 이종대 선생님의 임상 경험과 전통 한의학 지식을 바탕으로 한약 처방을 추천하는 AI 어시스턴트 '온고지신 GPT'입니다.

## 역할
- 환자 증상을 분석하여 최적의 한약 처방을 추천합니다.
- 각 약재의 선정 근거를 군신좌사(君臣佐使) 구조로 설명합니다.
- 전통 한의학 이론(상한론, 금궤요략, 동의보감 등)을 기반으로 합니다.

## 추천 원칙
1. 증상과 체질을 종합적으로 고려합니다.
2. 처방의 효능, 주치, 구성을 명확히 설명합니다.
3. 복용 중인 양약과의 상호작용 가능성을 검토합니다.
4. 확실하지 않은 경우 솔직히 불확실성을 표현합니다.
5. 환자 안전을 최우선으로 합니다.

## 대표 처방 예시
- 비위허한: 이중탕, 육군자탕, 보중익기탕
- 기혈허: 십전대보탕, 팔물탕, 귀비탕
- 음허: 육미지황환, 좌귀음
- 양허: 팔미지황환, 우귀음
- 기울: 소요산, 시호소간산
- 혈어: 혈부축어탕, 도핵승기탕
"""

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY
        ) if settings.OPENAI_API_KEY else None

    async def generate_recommendation(
        self,
        patient_info: Dict,
        similar_cases: Optional[List[Dict]] = None,
        current_medications: Optional[List[str]] = None,
    ) -> Dict:
        """처방 추천 생성"""

        if not self.client:
            return self._get_dummy_recommendation(patient_info)

        # 프롬프트 구성
        medications_text = ", ".join(current_medications) if current_medications else "없음"

        user_prompt = f"""## 환자 정보
- 나이: {patient_info.get('age', '미상')}
- 성별: {patient_info.get('gender', '미상')}
- 체질: {patient_info.get('constitution', '미상')}
- 주소증: {patient_info.get('chief_complaint', '')}
- 증상: {', '.join([s.get('name', '') for s in patient_info.get('symptoms', [])])}
- 복용 중인 양약: {medications_text}

## 요청사항
위 환자 정보를 분석하여 다음을 JSON 형식으로 제공해주세요:

1. **추천 처방** (1-3개): 처방명, 구성 약재(용량 포함), 신뢰도 점수(0-1)
2. **군신좌사 분석**: 각 약재의 역할과 선정 근거
3. **가감 제안**: 환자 특성에 맞는 약재 가감
4. **주의사항**: 복용 중인 양약과의 상호작용 가능성

JSON 형식:
{{
  "recommendations": [
    {{
      "formula_name": "처방명",
      "confidence_score": 0.85,
      "herbs": [
        {{"name": "약재명", "amount": "용량", "role": "군/신/좌/사"}}
      ],
      "rationale": "처방 선정 근거"
    }}
  ],
  "analysis": "종합 분석 내용",
  "modifications": "가감 제안",
  "cautions": "주의사항"
}}"""

        try:
            response = self.client.chat.completions.create(
                model=settings.GPT_MODEL,
                max_tokens=4096,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ]
            )

            content = response.choices[0].message.content

            # JSON 파싱 시도
            try:
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                result = json.loads(content)
            except:
                result = {
                    "recommendations": [],
                    "analysis": content,
                }

            return result

        except Exception as e:
            print(f"LLM 호출 오류: {e}")
            return self._get_dummy_recommendation(patient_info)

    def _get_dummy_recommendation(self, patient_info: Dict) -> Dict:
        """API 키 없을 때 더미 추천"""
        return {
            "recommendations": [
                {
                    "formula_name": "이중탕",
                    "confidence_score": 0.85,
                    "herbs": [
                        {"name": "인삼", "amount": "6g", "role": "군"},
                        {"name": "백출", "amount": "8g", "role": "신"},
                        {"name": "건강", "amount": "4g", "role": "신"},
                        {"name": "감초", "amount": "3g", "role": "사"},
                    ],
                    "rationale": "비위허한증에 대한 대표 처방으로, 환자의 소화불량과 복부 냉증 증상에 적합합니다.",
                }
            ],
            "analysis": f"환자의 주소증 '{patient_info.get('chief_complaint', '')}'을 고려할 때, 비위를 따뜻하게 하고 기를 보하는 처방이 적합합니다.",
            "note": "이것은 테스트용 더미 데이터입니다. API 키를 설정하면 실제 AI 분석이 제공됩니다."
        }
