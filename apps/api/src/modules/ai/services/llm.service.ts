import { Injectable, ServiceUnavailableException, BadGatewayException, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class LlmService {
  private client: OpenAI | null = null;
  private readonly model: string;

  private readonly SYSTEM_PROMPT = `당신은 이종대 선생님의 임상 경험과 전통 한의학 지식을 바탕으로 한약 처방을 추천하는 AI 어시스턴트 '온고지신 GPT'입니다.

## 역할
- 환자 증상을 분석하여 최적의 한약 처방을 추천합니다.
- 각 약재의 선정 근거를 군신좌사(君臣佐使) 구조로 설명합니다.
- 전통 한의학 이론(상한론, 금궤요략, 동의보감 등)을 기반으로 합니다.

## 핵심 진단 기준 (이종대 선생님 기준)
### 1. 체열(寒熱) - 가장 중요한 기준
- 한(寒): 몸이 차가운 사람. 따뜻한 것을 좋아하고, 찬 음식 먹으면 설사/복통.
- 열(熱): 몸에 열이 많은 사람. 에어컨/선풍기/찬물을 좋아하고 여름을 싫어함.
- **한증 환자에게 한량성 처방은 금기** (부작용: 설사, 복통, 기력 저하)
- **열증 환자에게 온열성 처방은 금기** (부작용: 화 증상 악화, 구건, 불면)

### 2. 근실도(虛實) - 두 번째 중요한 기준
- 허(虛): 체력/소화력이 약함. 흉곽이 작고 목소리가 약함. 보(補)하는 처방 필요.
- 실(實): 체력이 튼튼함. 흉곽이 크고 목소리가 낭랑함. 사(瀉)하는 처방도 감당 가능.
- **허약 환자에게 사하성 처방은 금기** (정기 손상 위험)

## 추천 원칙
1. **체열과 근실도를 최우선으로 고려합니다.** 이 기준만 지키면 치료 확률 50% 이상, 부작용 최소화.
2. 증상과 사상의학 체질을 종합적으로 고려합니다.
3. 처방의 효능, 주치, 구성을 명확히 설명합니다.
4. 복용 중인 양약과의 상호작용 가능성을 검토합니다.
5. 확실하지 않은 경우 솔직히 불확실성을 표현합니다.
6. 환자 안전을 최우선으로 합니다.

## 처방별 한열/보사 성질
### 온열성 처방 (한증 환자에 적합, 열증 환자 주의)
- 이중탕, 육군자탕, 보중익기탕, 십전대보탕, 귀비탕
- 팔미지황환, 우귀음, 부자이중탕, 진무탕

### 한량성 처방 (열증 환자에 적합, 한증 환자 주의)
- 백호탕, 황련해독탕, 용담사간탕
- 육미지황환, 좌귀음, 천왕보심단
- 대승기탕, 소승기탕 (사하성)

### 평성 처방 (한열 균형)
- 소요산, 시호소간산, 소시호탕, 반하사심탕`;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('GPT_MODEL') || 'gpt-4o-mini';

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async generateRecommendation(patientInfo: {
    age?: number;
    gender?: string;
    constitution?: string;
    bodyHeat?: string;         // 체열: cold, neutral, hot
    bodyStrength?: string;     // 근실도: deficient, neutral, excess
    bodyHeatScore?: number;    // -10 ~ +10
    bodyStrengthScore?: number; // -10 ~ +10
    chiefComplaint: string;
    symptoms: Array<{ name: string; severity?: number }>;
    currentMedications?: string[];
  }): Promise<RecommendationResult> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI 추천 서비스가 설정되지 않았습니다. (OPENAI_API_KEY 환경변수 필요)',
      );
    }

    const medicationsText = patientInfo.currentMedications?.join(', ') || '없음';
    const symptomsText = patientInfo.symptoms.map(s => s.name).join(', ');

    // 체열/근실도 텍스트 변환
    const bodyHeatText = this.getBodyHeatText(patientInfo.bodyHeat, patientInfo.bodyHeatScore);
    const bodyStrengthText = this.getBodyStrengthText(patientInfo.bodyStrength, patientInfo.bodyStrengthScore);

    const userPrompt = `## 환자 정보
- 나이: ${patientInfo.age || '미상'}
- 성별: ${patientInfo.gender || '미상'}
- 사상체질: ${patientInfo.constitution || '미상'}
- **체열(寒熱)**: ${bodyHeatText}
- **근실도(虛實)**: ${bodyStrengthText}
- 주소증: ${patientInfo.chiefComplaint}
- 증상: ${symptomsText}
- 복용 중인 양약: ${medicationsText}

## 중요 지침
1. **체열과 근실도를 최우선으로 고려하여 처방을 선택하세요.**
2. 한증(寒證) 환자에게는 한량성 처방을 피하고 온보성 처방을 권장합니다.
3. 열증(熱證) 환자에게는 온열성 처방을 피하고 청열성 처방을 권장합니다.
4. 허증(虛證) 환자에게는 사하성 처방을 피하고 보익성 처방을 권장합니다.

## 요청사항
위 환자 정보를 분석하여 다음을 JSON 형식으로 제공해주세요:

1. **추천 처방** (1-3개): 처방명, 구성 약재(용량 포함), 신뢰도 점수(0-1)
2. **군신좌사 분석**: 각 약재의 역할과 선정 근거
3. **체열/근실도 적합성**: 이 처방이 환자의 체열/근실도에 적합한 이유
4. **가감 제안**: 환자 특성에 맞는 약재 가감
5. **주의사항**: 복용 중인 양약과의 상호작용 가능성

JSON 형식:
{
  "recommendations": [
    {
      "formula_name": "처방명",
      "confidence_score": 0.85,
      "herbs": [
        {"name": "약재명", "amount": "용량", "role": "군/신/좌/사"}
      ],
      "rationale": "처방 선정 근거",
      "constitution_fit": "체열/근실도 적합성 설명"
    }
  ],
  "analysis": "종합 분석 내용 (체열/근실도 고려 포함)",
  "modifications": "가감 제안",
  "cautions": "주의사항"
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: this.SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content || '';
      const result = this.parseJsonResponse(content, patientInfo);
      return {
        ...result,
        isAiGenerated: true,
      };
    } catch (error: any) {
      console.error('❌ LLM 호출 오류:', error);

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new RequestTimeoutException('AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      }
      if (error.status === 429 || error.message?.includes('rate limit')) {
        throw new ServiceUnavailableException('AI 사용 한도에 도달했습니다. 잠시 후 다시 시도해주세요.');
      }
      if (error.status === 401 || error.status === 403) {
        throw new ServiceUnavailableException('AI 서비스 인증에 실패했습니다. 운영자에게 문의하세요.');
      }
      throw new BadGatewayException(`AI 추천 생성 실패: ${error.message || 'unknown error'}`);
    }
  }

  async generatePatientExplanation(prompt: string, context?: string): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI 설명 생성 서비스가 설정되지 않았습니다. (OPENAI_API_KEY 필요)',
      );
    }

    const systemPrompt = `당신은 한의학 전문가로서 환자에게 진료 내용을 쉽게 설명하는 역할을 합니다.
- 전문 용어는 쉬운 말로 풀어서 설명합니다.
- 친근하고 따뜻한 톤으로 설명합니다.
- 과학적 근거와 전통 한의학 이론을 함께 설명합니다.
- 환자가 이해하기 쉽도록 비유를 활용합니다.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(context ? [{ role: 'user' as const, content: `맥락: ${context}` }] : []),
          { role: 'user', content: prompt },
        ],
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('LLM 호출 오류:', error);
      throw new BadGatewayException(`AI 설명 생성 실패: ${error.message || 'unknown error'}`);
    }
  }

  private parseJsonResponse(content: string, patientInfo: any): RecommendationResult {
    try {
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0];
      } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0];
      }
      return JSON.parse(jsonStr);
    } catch {
      return {
        recommendations: [],
        analysis: content,
      };
    }
  }

  /**
   * 체열 텍스트 변환
   */
  private getBodyHeatText(bodyHeat?: string, score?: number): string {
    if (!bodyHeat) return '미평가';

    const scoreText = score !== undefined ? ` (점수: ${score > 0 ? '+' : ''}${score})` : '';

    switch (bodyHeat) {
      case 'cold':
        return `한(寒) - 몸이 찬 편${scoreText}`;
      case 'hot':
        return `열(熱) - 몸에 열이 많음${scoreText}`;
      default:
        return `평(平) - 균형${scoreText}`;
    }
  }

  /**
   * 근실도 텍스트 변환
   */
  private getBodyStrengthText(bodyStrength?: string, score?: number): string {
    if (!bodyStrength) return '미평가';

    const scoreText = score !== undefined ? ` (점수: ${score > 0 ? '+' : ''}${score})` : '';

    switch (bodyStrength) {
      case 'deficient':
        return `허(虛) - 체력/소화력 약함${scoreText}`;
      case 'excess':
        return `실(實) - 체력 튼튼함${scoreText}`;
      default:
        return `평(平) - 균형${scoreText}`;
    }
  }
}

export interface HerbInfo {
  name: string;
  amount: string;
  role: string;
}

export interface FormulaRecommendation {
  formula_name: string;
  confidence_score: number;
  herbs: HerbInfo[];
  rationale: string;
  constitution_fit?: string; // 체열/근실도 적합성 설명
}

export interface RecommendationResult {
  recommendations: FormulaRecommendation[];
  analysis: string;
  modifications?: string;
  cautions?: string;
  note?: string;
  /** AI 분석 성공 여부 */
  isAiGenerated?: boolean;
  /** 오류 발생 시 경고 메시지 */
  warning?: string;
  /** 오류 유형 */
  errorType?: 'api_key_missing' | 'api_error' | 'parse_error' | 'timeout' | 'rate_limit';
}
