import { Injectable } from '@nestjs/common';
import { LlmService } from './llm.service';

export interface RecordExplanationRequest {
  visitDate: string;
  chiefComplaint: string;
  symptoms?: Array<{ name: string; severity?: number; duration?: string }>;
  diagnosis?: string;
  treatment?: string;
  patientInfo?: {
    age?: number;
    gender?: string;
    constitution?: string;
  };
}

export interface PrescriptionExplanationRequest {
  formulaName: string;
  herbs: Array<{ name: string; amount?: string; role?: string }>;
  dosageInstructions?: string;
  purpose?: string;
  patientContext?: Record<string, any>;
}

export interface HerbExplanationRequest {
  name: string;
  category?: string;
  efficacy?: string;
  usage?: string;
}

export interface HealthTipsRequest {
  constitution?: string;
  mainSymptoms?: string[];
  currentPrescription?: string;
  season?: string;
}

export interface MedicationReminderRequest {
  prescriptionName: string;
  timeOfDay: string;
  patientName?: string;
}

@Injectable()
export class PatientExplanationService {
  constructor(private llmService: LlmService) {}

  async explainHealthRecord(request: RecordExplanationRequest): Promise<{ explanation: string; keyPoints: string[] }> {
    const symptomsText = request.symptoms?.map(s => s.name).join(', ') || '없음';

    const prompt = `다음 진료 기록을 환자가 이해하기 쉽게 설명해주세요:

진료일: ${request.visitDate}
주소증: ${request.chiefComplaint}
증상: ${symptomsText}
진단: ${request.diagnosis || '없음'}
치료: ${request.treatment || '없음'}

환자 정보:
- 나이: ${request.patientInfo?.age || '미상'}
- 성별: ${request.patientInfo?.gender || '미상'}
- 체질: ${request.patientInfo?.constitution || '미상'}

다음 형식으로 응답해주세요:
1. 쉬운 말로 된 종합 설명
2. 핵심 포인트 3-5개 (리스트)`;

    const explanation = await this.llmService.generatePatientExplanation(prompt);

    return {
      explanation,
      keyPoints: this.extractKeyPoints(explanation),
    };
  }

  async explainPrescription(request: PrescriptionExplanationRequest): Promise<{
    summary: string;
    herbExplanations: Array<{ name: string; explanation: string }>;
    dosageGuide: string;
  }> {
    const herbsText = request.herbs
      .map(h => `${h.name}${h.amount ? ` ${h.amount}` : ''}${h.role ? ` (${h.role})` : ''}`)
      .join(', ');

    const prompt = `다음 한약 처방을 환자에게 쉽게 설명해주세요:

처방명: ${request.formulaName}
구성 약재: ${herbsText}
복용법: ${request.dosageInstructions || '미정'}
처방 목적: ${request.purpose || '증상 개선'}

다음을 포함해서 설명해주세요:
1. 처방의 전체적인 효능 (쉬운 말로)
2. 주요 약재 각각의 역할
3. 복용 시 주의사항`;

    const explanation = await this.llmService.generatePatientExplanation(prompt);

    return {
      summary: explanation,
      herbExplanations: request.herbs.map(h => ({
        name: h.name,
        explanation: `${h.name}은(는) ${h.role || '보조'} 역할을 합니다.`,
      })),
      dosageGuide: request.dosageInstructions || '담당 한의사의 지시에 따라 복용하세요.',
    };
  }

  async explainHerb(request: HerbExplanationRequest): Promise<{
    name: string;
    simpleExplanation: string;
    benefits: string[];
    precautions: string;
  }> {
    const prompt = `다음 한약재를 환자에게 쉽게 설명해주세요:

약재명: ${request.name}
분류: ${request.category || '미분류'}
효능: ${request.efficacy || '미정'}
용도: ${request.usage || '미정'}

쉬운 말로 설명하고, 주요 효능과 주의사항을 알려주세요.`;

    const explanation = await this.llmService.generatePatientExplanation(prompt);

    return {
      name: request.name,
      simpleExplanation: explanation,
      benefits: [request.efficacy || '몸의 균형을 맞춰줍니다'],
      precautions: '처방된 용량을 지켜서 복용하세요.',
    };
  }

  async generateHealthTips(request: HealthTipsRequest): Promise<{
    tips: string[];
    dietRecommendations: string[];
    lifestyleAdvice: string[];
  }> {
    const prompt = `다음 환자에게 맞춤형 건강 팁을 제공해주세요:

체질: ${request.constitution || '미상'}
주요 증상: ${request.mainSymptoms?.join(', ') || '없음'}
현재 복용 처방: ${request.currentPrescription || '없음'}
계절: ${request.season || '미정'}

다음을 포함해주세요:
1. 일반 건강 팁 3개
2. 식이 추천 3개
3. 생활 습관 조언 3개`;

    const explanation = await this.llmService.generatePatientExplanation(prompt);

    return {
      tips: [
        '충분한 수면을 취하세요',
        '규칙적인 식사를 하세요',
        '적당한 운동을 하세요',
      ],
      dietRecommendations: [
        '따뜻한 음식을 드세요',
        '자극적인 음식은 피하세요',
        '제철 음식을 드세요',
      ],
      lifestyleAdvice: [
        '스트레스를 관리하세요',
        '규칙적인 생활을 하세요',
        explanation,
      ],
    };
  }

  async generateMedicationReminder(request: MedicationReminderRequest): Promise<{
    message: string;
    timeLabel: string;
  }> {
    const timeLabels: Record<string, string> = {
      morning: '아침',
      lunch: '점심',
      dinner: '저녁',
      bedtime: '취침 전',
    };

    const timeLabel = timeLabels[request.timeOfDay] || request.timeOfDay;
    const patientName = request.patientName || '환자';

    return {
      message: `${patientName}님, ${timeLabel} ${request.prescriptionName} 복용 시간입니다. 건강한 하루 되세요!`,
      timeLabel,
    };
  }

  private extractKeyPoints(text: string): string[] {
    const lines = text.split('\n').filter(line => line.trim());
    const keyPoints: string[] = [];

    for (const line of lines) {
      if (line.match(/^[-*\d.]\s/) || line.includes(':')) {
        keyPoints.push(line.replace(/^[-*\d.]\s*/, '').trim());
      }
    }

    return keyPoints.length > 0 ? keyPoints.slice(0, 5) : ['진료 내용을 확인해주세요.'];
  }
}
