import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PatientNotifyLog,
  NotifyKind,
  NotifyChannel,
  NotifyStatus,
} from '../../database/entities/patient-notify-log.entity';
import { MessagingService } from '../messaging/messaging.service';
import { KakaoService } from '../messaging/services/kakao.service';
import { SmsService } from '../messaging/services/sms.service';
import { KakaoTemplates } from '../messaging/dto';
import { seoulHour } from '../../common/seoul-day';

export interface SendLinkInput {
  practitionerId: string;
  patientId: string | null;
  guideId: string | null;
  kind: NotifyKind;
  /** 복호화된 환자 연락처. 없으면 보낼 수 없다. */
  phone: string | null;
  /** 복호화된 환자 이름 — 알림톡 본문에만 쓰고 어디에도 남기지 않는다. */
  patientName: string;
  clinicName: string;
  formulaName: string;
  /** 환자 단위 추적 링크 */
  link: string;
  /** 체크인 문구 — '복용 3일째,' 같은 앞머리 */
  dayLabel?: string;
  consentAt: Date | null;
  optOutAt: Date | null;
  /** 자동 발송이면 true — 야간(21~08시)에는 보내지 않는다. */
  automatic?: boolean;
}

export interface SendLinkResult {
  status: NotifyStatus;
  channel: NotifyChannel;
  messageId?: string;
  reason?: string;
}

const QUIET_START = 21;
const QUIET_END = 8;

/**
 * 환자 카톡으로 복약 추적 링크를 보낸다.
 *
 * 채널은 알림톡 우선, 실패하면 문자로 내려간다. 알림톡은 카카오가 사전 승인한
 * 템플릿 코드로만 나가는데(MEDICATION_TRACK / MEDICATION_CHECKIN), 검수 전에는
 * 프로바이더가 거절한다. 그때 아무 일도 안 일어나면 한의사는 보냈다고 믿고
 * 환자는 못 받는다 — 그래서 문자 폴백이 선택이 아니라 기본이다.
 *
 * 보내기 전에 두 가지를 반드시 확인한다.
 *   1. 수신 동의(정보통신망법 제50조). 동의가 없거나 철회했으면 보내지 않는다.
 *   2. 연락처. 명부에 번호가 없으면 보낼 곳이 없다.
 * 막힌 시도도 로그에 남긴다 — "동의 없이 보낸 적 없다" 는 것도 증빙이 필요하다.
 */
@Injectable()
export class GuideLinkSenderService {
  private readonly logger = new Logger(GuideLinkSenderService.name);

  constructor(
    @InjectRepository(PatientNotifyLog)
    private readonly logs: Repository<PatientNotifyLog>,
    private readonly messaging: MessagingService,
    private readonly kakao: KakaoService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  /** 웹 주소 — 링크를 만들 때 쓴다. */
  webOrigin(): string {
    return (
      this.config.get<string>('FRONTEND_URL') || 'https://ongojisin.ai'
    ).replace(/\/+$/, '');
  }

  trackLink(trackToken: string): string {
    return `${this.webOrigin()}/t/${trackToken}`;
  }

  async send(input: SendLinkInput): Promise<SendLinkResult> {
    const record = (r: SendLinkResult) => this.record(input, r);

    if (!input.consentAt || input.optOutAt) {
      return record({
        status: 'consent_missing',
        channel: 'none',
        reason: input.optOutAt
          ? '환자가 알림 수신을 거부했습니다.'
          : '알림 수신 동의를 먼저 받아 주세요.',
      });
    }

    const phone = normalizePhone(input.phone);
    if (!phone) {
      return record({
        status: 'no_phone',
        channel: 'none',
        reason: '환자 명부에 연락처가 없습니다.',
      });
    }

    if (input.automatic && this.isQuietHours()) {
      return record({
        status: 'quiet_hours',
        channel: 'none',
        reason: '야간(21시~익일 8시)에는 자동 알림을 보내지 않습니다.',
      });
    }

    const isCheckin = input.kind !== 'guide_link';
    const templateCode = isCheckin
      ? KakaoTemplates.MEDICATION_CHECKIN
      : KakaoTemplates.MEDICATION_TRACK;

    const params: Record<string, string> = {
      clinicName: input.clinicName || '한의원',
      patientName: input.patientName || '환자',
      formulaName: input.formulaName || '한약',
      trackLink: input.link,
      dayLabel: input.dayLabel || '복용은',
    };

    // ── 1차: 알림톡 ──────────────────────────────────────────
    if (this.kakao.isConfigured()) {
      try {
        const res = await this.messaging.sendKakaoAlimtalk({
          to: phone,
          templateCode,
          templateParams: params,
        });
        if (res.success) {
          return record({
            status: 'sent',
            channel: 'kakao',
            messageId: res.messageId,
          });
        }
        this.logger.warn(`알림톡 거절 — 문자로 대체합니다: ${res.error ?? ''}`);
      } catch (e) {
        this.logger.warn(
          `알림톡 발송 오류 — 문자로 대체합니다: ${(e as Error).message}`,
        );
      }
    }

    // ── 2차: 문자(90바이트 초과분은 LMS 로 자동 전환) ─────────
    const body = this.smsBody(input, isCheckin);
    if (!this.sms.isConfigured()) {
      // 아무것도 안 나갔다. 성공으로 적으면 조용한 실패가 된다.
      this.logger.warn(
        `[모의] 발송 채널 미설정 — 실제로 나가지 않았습니다. kind=${input.kind}`,
      );
      return record({
        status: 'simulated',
        channel: 'none',
        reason:
          '메시지 발송이 아직 설정되지 않았습니다. 링크를 복사해 직접 전달해 주세요.',
      });
    }

    try {
      const res = await this.messaging.sendSms({ to: phone, message: body });
      if (res.success) {
        return record({
          status: 'sent',
          channel: 'sms',
          messageId: res.messageId,
        });
      }
      return record({
        status: 'failed',
        channel: 'sms',
        reason: res.error ?? '문자 발송에 실패했습니다.',
      });
    } catch (e) {
      return record({
        status: 'failed',
        channel: 'sms',
        reason: (e as Error).message,
      });
    }
  }

  private smsBody(input: SendLinkInput, isCheckin: boolean): string {
    const clinic = input.clinicName || '한의원';
    if (isCheckin) {
      return (
        `[${clinic}] ${input.dayLabel || '복용은'} 어떠신가요?\n` +
        `오늘 상태를 남겨 주시면 다음 진료 때 참고합니다.\n${input.link}\n` +
        `수신거부는 링크 하단에서 가능합니다.`
      );
    }
    return (
      `[${clinic}] 처방받으신 한약 안내서입니다.\n` +
      `${input.formulaName || '한약'} — 구성·복용법·비용과 복용 기록을 여기서 보실 수 있습니다.\n` +
      `${input.link}\n수신거부는 링크 하단에서 가능합니다.`
    );
  }

  private isQuietHours(): boolean {
    const h = seoulHour();
    return h >= QUIET_START || h < QUIET_END;
  }

  private async record(
    input: SendLinkInput,
    result: SendLinkResult,
  ): Promise<SendLinkResult> {
    try {
      await this.logs.save(
        this.logs.create({
          practitionerId: input.practitionerId,
          patientId: input.patientId,
          guideId: input.guideId,
          kind: input.kind,
          channel: result.channel,
          status: result.status,
          messageId: result.messageId ?? null,
          error: result.reason ?? null,
        }),
      );
    } catch (e) {
      // 로그 저장 실패가 발송 결과를 뒤집으면 안 된다.
      this.logger.error(`발송 이력 저장 실패: ${(e as Error).message}`);
    }
    return result;
  }
}

/** 010-1234-5678 → 01012345678. 형식이 아니면 null. */
function normalizePhone(raw: string | null): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return digits;
  return null;
}
