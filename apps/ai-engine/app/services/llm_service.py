import anthropic
from typing import List, Dict, Optional
import json

from ..core.config import settings

class LLMService:
    """Claude API를 사용한 LLM 서비스"""

    SYSTEM_PROMPT = """당신은 이종대 선생님의 임상 경험을 바탕으로 한의학 처방을 추천하는 AI 어시스턴트입니다.

## 역할
- 환자 증상과 유사한 치험례를 참고하여 최적의 한약 처방을 추천합니다.
- 각 약재의 선정 근거를 군신좌사(君臣佐使) 구조로 설명합니다.
- 과학적 근거와 전통 한의학 이론을 균형있게 활용합니다.

## 주의사항
- 반드시 참고 치험례를 기반으로 추천합니다.
- 확실하지 않은 경우 솔직히 불확실성을 표현합니다.
- 환자 안전을 최우선으로 합니다.
"""

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=settings.ANTHROPIC_API_KEY
        ) if settings.ANTHROPIC_API_KEY else None

    async def generate_recommendation(
        self,
        patient_info: Dict,
        similar_cases: List[Dict],
        current_medications: Optional[List[str]] = None,
    ) -> Dict:
        """처방 추천 생성"""

        if not self.client:
            return self._get_dummy_recommendation(patient_info)

        # 프롬프트 구성
        cases_text = self._format_cases(similar_cases)
        medications_text = ", ".join(current_medications) if current_medications else "없음"

        user_prompt = f"""## 환자 정보
- 나이: {patient_info.get('age', '미상')}
- 성별: {patient_info.get('gender', '미상')}
- 체질: {patient_info.get('constitution', '미상')}
- 주소증: {patient_info.get('chief_complaint', '')}
- 증상: {', '.join([s.get('name', '') for s in patient_info.get('symptoms', [])])}
- 복용 중인 양약: {medications_text}

## 참고 치험례
{cases_text}

## 요청사항
위 환자 정보와 유사 치험례를 참고하여 다음을 제공해주세요:

1. **추천 처방** (1-3개): 처방명, 구성 약재, 신뢰도 점수
2. **군신좌사 분석**: 각 약재의 역할과 선정 근거
3. **가감 제안**: 환자 특성에 맞는 약재 가감
4. **주의사항**: 복용 중인 양약과의 상호작용 가능성

JSON 형식으로 응답해주세요."""

        try:
            response = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=4096,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}]
            )

            content = response.content[0].text

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

    def _format_cases(self, cases: List[Dict]) -> str:
        """치험례 포맷팅"""
        formatted = []
        for i, case in enumerate(cases[:5], 1):
            meta = case.get('metadata', case)
            formatted.append(f"""
### 치험례 {i} (유사도: {case.get('score', 0):.2f})
- 케이스 ID: {meta.get('case_id', 'N/A')}
- 주소증: {meta.get('chief_complaint', 'N/A')}
- 증상: {meta.get('symptoms', 'N/A')}
- 처방: {meta.get('formula_name', 'N/A')}
""")
        return "\n".join(formatted)

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
            "similar_cases_count": 2,
            "note": "이것은 테스트용 더미 데이터입니다. API 키를 설정하면 실제 AI 분석이 제공됩니다."
        }
