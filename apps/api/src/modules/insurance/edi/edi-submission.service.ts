import { Injectable, Logger } from '@nestjs/common';
import { EdiBuilderService } from './edi-builder.service';
import {
  EdiAck,
  EdiClaimUnit,
  EdiReviewDecision,
  EdiSerializedMessage,
  EdiValidationResult,
} from './edi-types';

/**
 * EDI 제출/응답 어댑터.
 *
 * 운영 모드:
 *   - VAN 경유 (KOTRA·비트컴퓨터·메디포스트 등 EDI 사업자) — 실무에서 가장 흔함
 *   - 직접 제출 (인증서 + HIRA 게이트웨이 직연동) — 대형 운영자
 *
 * 환경변수:
 *   - EDI_PROVIDER ('van' | 'direct' | 'mock')
 *   - EDI_VAN_BASE_URL, EDI_VAN_API_KEY, EDI_VAN_EDS_ID
 *   - EDI_HIRA_CERT_PATH, EDI_HIRA_CERT_PASSWORD (직접 제출 시)
 *
 * 정책:
 *   - 본 메서드는 *동기 호출의 진입점* — 실 발송은 BullMQ 큐 enqueue 권장.
 *   - 응답은 ACK(즉시 수신 확인) 와 ReviewDecision(심사 후 별도 callback) 으로 나뉨.
 *   - 결과는 InsuranceClaim 엔티티의 reviewResult 에 저장.
 */

export interface SubmissionResult {
  messageId: string;
  status: 'queued' | 'submitted' | 'rejected';
  ack?: EdiAck;
  rawResponse?: unknown;
}

@Injectable()
export class EdiSubmissionService {
  private readonly logger = new Logger(EdiSubmissionService.name);

  constructor(private readonly builder: EdiBuilderService) {}

  /** 제출 전 검증만 수행 — UI 의 “미리 점검” 버튼에서 사용. */
  preflight(unit: EdiClaimUnit): EdiValidationResult {
    return this.builder.validate(unit);
  }

  /** 청구 단위를 EDI 메시지로 변환하고 외부로 발송. */
  async submit(unit: EdiClaimUnit): Promise<SubmissionResult> {
    const message = this.builder.build(unit);
    const provider = (process.env.EDI_PROVIDER || 'mock') as 'van' | 'direct' | 'mock';

    if (provider === 'mock' || !this.isProviderConfigured(provider)) {
      this.logger.warn(
        `[edi] mock 모드 — provider=${provider} 미설정. 메시지=${message.messageId} 큐 대기 상태로 기록.`,
      );
      return {
        messageId: message.messageId,
        status: 'queued',
        ack: {
          messageId: message.messageId,
          receivedAt: new Date().toISOString(),
          status: 'received',
        },
      };
    }

    try {
      const ack = await this.dispatch(message, provider);
      return {
        messageId: message.messageId,
        status: ack.status === 'received' ? 'submitted' : 'rejected',
        ack,
      };
    } catch (e) {
      this.logger.error(`[edi] 발송 실패 msg=${message.messageId}: ${(e as Error).message}`);
      return {
        messageId: message.messageId,
        status: 'rejected',
        ack: {
          messageId: message.messageId,
          receivedAt: new Date().toISOString(),
          status: 'rejected',
          errors: [{ code: 'NETWORK', message: (e as Error).message }],
        },
      };
    }
  }

  /** HIRA 가 보낸 심사 결정 webhook 을 파싱한다 (제3자 VAN 의 형식에 맞춰 어댑터 보강). */
  parseReviewDecision(payload: unknown): EdiReviewDecision {
    // 실제 VAN 마다 포맷이 다르므로 어댑터로 분기.
    // 본 구현은 표준화된 JSON 으로 들어왔다고 가정.
    if (!payload || typeof payload !== 'object') {
      throw new Error('심사 결정 payload 가 비어있습니다.');
    }
    const raw = payload as Record<string, unknown>;
    return {
      claimSerialNumber: String(raw.claimSerialNumber ?? ''),
      reviewedAt: String(raw.reviewedAt ?? new Date().toISOString()),
      outcome: (raw.outcome as EdiReviewDecision['outcome']) ?? 'approved',
      approvedAmount: Number(raw.approvedAmount ?? 0),
      adjustedAmount: Number(raw.adjustedAmount ?? 0),
      rejectedAmount: Number(raw.rejectedAmount ?? 0),
      itemAdjustments: Array.isArray(raw.itemAdjustments)
        ? (raw.itemAdjustments as EdiReviewDecision['itemAdjustments'])
        : [],
    };
  }

  private isProviderConfigured(provider: 'van' | 'direct'): boolean {
    if (provider === 'van') {
      return Boolean(process.env.EDI_VAN_BASE_URL && process.env.EDI_VAN_API_KEY);
    }
    if (provider === 'direct') {
      return Boolean(process.env.EDI_HIRA_CERT_PATH);
    }
    return false;
  }

  /** 외부 호출 — 실 운영에서는 인증서/서명/암호화 처리 추가. */
  private async dispatch(_msg: EdiSerializedMessage, _provider: 'van' | 'direct'): Promise<EdiAck> {
    // TODO: provider 별 어댑터(VanAdapter, HiraDirectAdapter) 활성화.
    // 본 단계에서는 인터페이스만 노출 — 실제 호출은 별도 워커 모듈에서.
    throw new Error('EDI dispatch 미구현 — provider 어댑터를 활성화하세요.');
  }
}
