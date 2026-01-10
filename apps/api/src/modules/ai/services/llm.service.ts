import { Injectable } from '@nestjs/common';
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
- 혈어: 혈부축어탕, 도핵승기탕`;

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
    chiefComplaint: string;
    symptoms: Array<{ name: string; severity?: number }>;
    currentMedications?: string[];
  }): Promise<RecommendationResult> {
    if (!this.client) {
      return this.getDummyRecommendation(patientInfo);
    }

    const medicationsText = patientInfo.currentMedications?.join(', ') || '없음';
    const symptomsText = patientInfo.symptoms.map(s => s.name).join(', ');

    const userPrompt = `## 환자 정보
- 나이: ${patientInfo.age || '미상'}
- 성별: ${patientInfo.gender || '미상'}
- 체질: ${patientInfo.constitution || '미상'}
- 주소증: ${patientInfo.chiefComplaint}
- 증상: ${symptomsText}
- 복용 중인 양약: ${medicationsText}

## 요청사항
위 환자 정보를 분석하여 다음을 JSON 형식으로 제공해주세요:

1. **추천 처방** (1-3개): 처방명, 구성 약재(용량 포함), 신뢰도 점수(0-1)
2. **군신좌사 분석**: 각 약재의 역할과 선정 근거
3. **가감 제안**: 환자 특성에 맞는 약재 가감
4. **주의사항**: 복용 중인 양약과의 상호작용 가능성

JSON 형식:
{
  "recommendations": [
    {
      "formula_name": "처방명",
      "confidence_score": 0.85,
      "herbs": [
        {"name": "약재명", "amount": "용량", "role": "군/신/좌/사"}
      ],
      "rationale": "처방 선정 근거"
    }
  ],
  "analysis": "종합 분석 내용",
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
      return this.parseJsonResponse(content, patientInfo);
    } catch (error) {
      console.error('LLM 호출 오류:', error);
      return this.getDummyRecommendation(patientInfo);
    }
  }

  async generatePatientExplanation(prompt: string, context?: string): Promise<string> {
    if (!this.client) {
      return '현재 AI 서비스가 설정되지 않았습니다.';
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
    } catch (error) {
      console.error('LLM 호출 오류:', error);
      return '설명을 생성하는 중 오류가 발생했습니다.';
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

  private getDummyRecommendation(patientInfo: any): RecommendationResult {
    return {
      recommendations: [
        {
          formula_name: '이중탕',
          confidence_score: 0.85,
          herbs: [
            { name: '인삼', amount: '6g', role: '군' },
            { name: '백출', amount: '8g', role: '신' },
            { name: '건강', amount: '4g', role: '신' },
            { name: '감초', amount: '3g', role: '사' },
          ],
          rationale: '비위허한증에 대한 대표 처방으로, 환자의 소화불량과 복부 냉증 증상에 적합합니다.',
        },
      ],
      analysis: `환자의 주소증 '${patientInfo.chiefComplaint}'을 고려할 때, 비위를 따뜻하게 하고 기를 보하는 처방이 적합합니다.`,
      note: '이것은 테스트용 더미 데이터입니다. OPENAI_API_KEY를 설정하면 실제 AI 분석이 제공됩니다.',
    };
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
}

export interface RecommendationResult {
  recommendations: FormulaRecommendation[];
  analysis: string;
  modifications?: string;
  cautions?: string;
  note?: string;
}
