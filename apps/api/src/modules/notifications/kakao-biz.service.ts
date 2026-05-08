import { Injectable, Logger } from '@nestjs/common';

/**
 * 카카오톡 비즈메시지(알림톡) 발송 서비스 — 환자 락인 핵심 채널.
 *
 * 정책:
 *   - 모든 메시지는 사전 승인된 템플릿(template_code)으로만 발송 가능.
 *   - 템플릿 변수는 `#{key}` 형태. 한 번에 100건 미만은 단건 API, 그 이상은 batch.
 *   - 동의 없는 환자에게 발송 시 정보통신망법 위반 — 환자 등록 시 동의 여부 필드 필수.
 *   - 야간(21:00~08:00) 광고성 메시지 금지 (정통법 50조의2).
 *
 * 환경변수:
 *   - KAKAO_BIZ_PROVIDER ('aligo' | 'solapi' | 'biztalk' | 'mock')
 *   - KAKAO_BIZ_API_KEY
 *   - KAKAO_BIZ_API_SECRET
 *   - KAKAO_BIZ_SENDER_KEY (한의원별 발신 프로필)
 */

export type KakaoTemplateKey =
  | 'appointment_confirm'      // 예약 확인
  | 'appointment_reminder'     // 예약 D-1 리마인드
  | 'medication_reminder'      // 복약 알림
  | 'follow_up'                // 재진료 안내
  | 'prescription_ready'       // 처방 조제 완료
  | 'visit_thanks';            // 진료 감사 + 후기 요청

export interface SendKakaoMessageInput {
  templateKey: KakaoTemplateKey;
  /** 010-1234-5678 또는 01012345678 */
  recipientPhone: string;
  /** 템플릿 변수 — 템플릿마다 필수 키가 다름 */
  variables: Record<string, string>;
  /** 한의원 식별자 — 발신 프로필/감사 로그에 사용 */
  clinicId: string;
  /** 환자 동의 여부 (false면 발송 차단) */
  patientConsented: boolean;
  /** 광고성 여부 (true 이면 야간 차단) */
  isAdvertising?: boolean;
  /** 진료/예약 ID — 응답 추적용 */
  reference?: { kind: 'appointment' | 'visit' | 'prescription'; id: string };
}

export interface KakaoSendResult {
  ok: boolean;
  messageId?: string;
  status: 'sent' | 'queued' | 'rejected' | 'consent_missing' | 'quiet_hours' | 'provider_disabled';
  reason?: string;
}

const QUIET_HOURS_START = 21; // 21:00
const QUIET_HOURS_END = 8;    // 08:00

/** 사전 승인 템플릿 본문 — 운영팀이 카카오 검수에 등록해 둔 것을 그대로 사용. */
const TEMPLATES: Record<KakaoTemplateKey, { body: string; required: string[]; isAdvertising: boolean }> = {
  appointment_confirm: {
    body:
      '[#{clinicName}] #{patientName}님, #{date} #{time} 진료가 예약되었습니다.\n' +
      '· 위치: #{address}\n· 문의: #{phone}\n예약 변경/취소는 회신 부탁드립니다.',
    required: ['clinicName', 'patientName', 'date', 'time', 'address', 'phone'],
    isAdvertising: false,
  },
  appointment_reminder: {
    body:
      '[#{clinicName}] 내일 #{time}에 진료가 예약되어 있습니다, #{patientName}님.\n' +
      '· 위치: #{address}\n취소가 필요하시면 회신 부탁드려요.',
    required: ['clinicName', 'patientName', 'time', 'address'],
    isAdvertising: false,
  },
  medication_reminder: {
    body:
      '[#{clinicName}] #{patientName}님, 처방받으신 한약 복용을 잊지 마세요.\n' +
      '· 처방: #{prescription}\n· 복용법: #{dosage}\n불편한 점이 있으면 언제든 연락 주세요.',
    required: ['clinicName', 'patientName', 'prescription', 'dosage'],
    isAdvertising: false,
  },
  follow_up: {
    body:
      '[#{clinicName}] #{patientName}님, #{visitDate} 진료 후 경과는 어떠신가요?\n' +
      '재진료를 원하시면 #{rebookLink} 에서 예약하실 수 있습니다.',
    required: ['clinicName', 'patientName', 'visitDate', 'rebookLink'],
    isAdvertising: false,
  },
  prescription_ready: {
    body:
      '[#{clinicName}] #{patientName}님의 처방 한약이 준비되었습니다.\n' +
      '편하신 시간에 방문해 주세요. (운영시간 #{hours})',
    required: ['clinicName', 'patientName', 'hours'],
    isAdvertising: false,
  },
  visit_thanks: {
    body:
      '[#{clinicName}] 오늘 진료해 주셔서 감사합니다, #{patientName}님.\n' +
      '소중한 후기를 남겨주시면 큰 힘이 됩니다 → #{reviewLink}',
    required: ['clinicName', 'patientName', 'reviewLink'],
    isAdvertising: true, // 후기 유도는 광고성으로 분류
  },
};

@Injectable()
export class KakaoBizService {
  private readonly logger = new Logger(KakaoBizService.name);

  isConfigured(): boolean {
    return Boolean(process.env.KAKAO_BIZ_API_KEY && process.env.KAKAO_BIZ_API_SECRET);
  }

  /** 단건 발송. */
  async send(input: SendKakaoMessageInput): Promise<KakaoSendResult> {
    if (!input.patientConsented) {
      return { ok: false, status: 'consent_missing', reason: '환자가 알림 수신에 동의하지 않았습니다.' };
    }

    const template = TEMPLATES[input.templateKey];
    if (!template) {
      return { ok: false, status: 'rejected', reason: '미등록 템플릿입니다.' };
    }
    const isAd = input.isAdvertising ?? template.isAdvertising;
    if (isAd && this.isQuietHours()) {
      return {
        ok: false,
        status: 'quiet_hours',
        reason: '야간(21시~익일 8시) 광고성 메시지는 발송할 수 없습니다 (정통법 50조의2).',
      };
    }

    const missing = template.required.filter((k) => !input.variables[k]);
    if (missing.length) {
      return {
        ok: false,
        status: 'rejected',
        reason: `필수 변수 누락: ${missing.join(', ')}`,
      };
    }

    const body = this.fillTemplate(template.body, input.variables);
    const phone = this.normalizePhone(input.recipientPhone);
    if (!phone) {
      return { ok: false, status: 'rejected', reason: '전화번호 형식이 올바르지 않습니다.' };
    }

    if (!this.isConfigured()) {
      this.logger.warn(
        `[kakao-biz] mock 발송 — provider 미설정. clinic=${input.clinicId} template=${input.templateKey}`,
      );
      return { ok: true, status: 'queued', messageId: `mock_${Date.now()}` };
    }

    // 실제 외부 호출은 별도 워커/큐(BullMQ 등)에 enqueue 권장.
    // 여기서는 인터페이스만 제공한다.
    try {
      const messageId = await this.dispatch({
        provider: process.env.KAKAO_BIZ_PROVIDER ?? 'aligo',
        senderKey: process.env.KAKAO_BIZ_SENDER_KEY ?? '',
        templateKey: input.templateKey,
        phone,
        body,
        reference: input.reference,
      });
      return { ok: true, status: 'sent', messageId };
    } catch (e) {
      this.logger.error(`[kakao-biz] 발송 실패: ${(e as Error).message}`);
      return { ok: false, status: 'rejected', reason: (e as Error).message };
    }
  }

  private isQuietHours(): boolean {
    const hour = new Date().getHours();
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  }

  private fillTemplate(body: string, vars: Record<string, string>): string {
    return body.replace(/#\{(\w+)\}/g, (_m, k) => vars[k] ?? '');
  }

  private normalizePhone(raw: string): string | null {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) return digits;
    return null;
  }

  /**
   * 외부 프로바이더 호출 — 인터페이스 정의만 두고 실제 구현은 어댑터에서.
   * Aligo/Solapi/BizTalk 등은 모두 비슷한 REST 형태로, 운영 시 1개를 어댑터로 활성.
   */
  private async dispatch(_args: {
    provider: string;
    senderKey: string;
    templateKey: KakaoTemplateKey;
    phone: string;
    body: string;
    reference?: { kind: string; id: string };
  }): Promise<string> {
    // TODO: 어댑터 모듈 활성화. 현 단계에서는 큐 enqueue 만 가정.
    return `queued_${Date.now()}`;
  }
}
