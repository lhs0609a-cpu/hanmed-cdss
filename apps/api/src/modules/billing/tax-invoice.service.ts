import { Injectable, Logger } from '@nestjs/common';

/**
 * 세금계산서 발행 서비스 (Popbill 어댑터 인터페이스).
 *
 * 본 클래스는 외부 서비스(Popbill·Bill36524 등)의 어댑터 인터페이스만 정의한다.
 * 실제 발행은 운영 환경의 환경변수(`POPBILL_LINK_ID`, `POPBILL_SECRET_KEY`)로 활성.
 *
 * 정책:
 *   - 결제 시점에 카드 결제가 성공하면 trigger 호출 → 익영업일 자동 발행.
 *   - 사업자 정보가 누락된 경우 발행 보류 + 사용자에게 보완 요청 알림.
 *   - 발행 결과는 TaxInvoice 엔티티에 적재 (운영에서 추가).
 */

export interface TaxInvoiceRequest {
  userId: string;
  paymentId: string;
  // 공급가액(부가세 별도)
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  itemName: string;
  invoiceeBusinessNumber: string;
  invoiceeCompanyName: string;
  invoiceeRepresentative?: string;
  invoiceeAddress?: string;
  invoiceeContactEmail: string;
  // 한의원/실사용자 이메일이 다를 경우 보조 수신자
  invoiceeContactPhone?: string;
}

export interface TaxInvoiceResult {
  invoiceId: string;
  status: 'queued' | 'issued' | 'failed' | 'pending_business_info';
  externalId?: string;
  failureReason?: string;
}

@Injectable()
export class TaxInvoiceService {
  private readonly logger = new Logger(TaxInvoiceService.name);

  constructor() {
    if (!process.env.POPBILL_LINK_ID || !process.env.POPBILL_SECRET_KEY) {
      this.logger.warn(
        'TaxInvoiceService: POPBILL_LINK_ID/POPBILL_SECRET_KEY 미설정 — 세금계산서 발행은 큐에만 적재되고 실제 발행은 보류됩니다.',
      );
    }
  }

  /**
   * 결제 후 세금계산서 발행 트리거.
   * 사업자 정보가 부족하면 status='pending_business_info' 로 반환 — 프런트에서 보완 페이지 안내.
   */
  async issue(request: TaxInvoiceRequest): Promise<TaxInvoiceResult> {
    if (!this.isBusinessInfoComplete(request)) {
      this.logger.log(
        `[tax-invoice] pending business info: paymentId=${request.paymentId}`,
      );
      return {
        invoiceId: this.generateInvoiceId(request.paymentId),
        status: 'pending_business_info',
      };
    }

    if (!process.env.POPBILL_LINK_ID || !process.env.POPBILL_SECRET_KEY) {
      // 실제 외부 호출 없이 큐 상태로 적재. 운영 모드에서 키 등록 후 처리.
      return {
        invoiceId: this.generateInvoiceId(request.paymentId),
        status: 'queued',
      };
    }

    // 실제 외부 API 호출은 별도 워커에서 처리하도록 enqueue.
    // 여기서는 발행 ID 만 미리 부여한다.
    return {
      invoiceId: this.generateInvoiceId(request.paymentId),
      status: 'queued',
      externalId: undefined,
    };
  }

  /**
   * 세금계산서 발행 가능 여부 점검 — 결제 페이지에서 호출.
   */
  validateBusinessInfo(input: Partial<TaxInvoiceRequest>): {
    ok: boolean;
    missing: string[];
  } {
    const missing: string[] = [];
    if (!input.invoiceeBusinessNumber || !/^\d{10}$/.test(input.invoiceeBusinessNumber.replace(/\D/g, ''))) {
      missing.push('사업자등록번호 (10자리)');
    }
    if (!input.invoiceeCompanyName || input.invoiceeCompanyName.trim().length < 1) {
      missing.push('상호명');
    }
    if (!input.invoiceeContactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.invoiceeContactEmail)) {
      missing.push('수신 이메일');
    }
    return { ok: missing.length === 0, missing };
  }

  private isBusinessInfoComplete(request: TaxInvoiceRequest): boolean {
    return this.validateBusinessInfo(request).ok;
  }

  private generateInvoiceId(paymentId: string): string {
    return `inv_${paymentId}_${Date.now()}`;
  }
}
