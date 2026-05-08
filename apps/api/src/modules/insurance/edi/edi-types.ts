/**
 * 심평원(HIRA) 전자청구 타입 정의.
 *
 * 본 어댑터는 *실제* HIRA 시스템과의 상세 프로토콜을 추상화한 인터페이스 계층이다.
 * 실 운영에서는 EDI 인증서·EDI VAN(가입한 EDI 사업자) API 와 연결된다.
 * 청구 매체:
 *   - HIRA 직접 제출(EDI 통신, 상호인증 인증서 필요)
 *   - 또는 EDI 사업자(예: 비트컴퓨터, 메디포스트 등)를 경유 (실무에선 이 경로가 다수)
 *
 * 정책:
 *   - 청구 본부는 항상 정상 청구(원본) — 정정/취소는 별도 EDI 트랜잭션.
 *   - 본 어댑터는 청구 데이터를 EDI 표준 메시지(RFI 명세)로 직렬화한다.
 *   - 외부 통신은 별도 워커(BullMQ) 가 큐로 처리. 본 모듈은 빌드/검증/직렬화/응답 매핑.
 */

export type EdiSubmissionType = 'normal' | 'amendment' | 'cancellation';

/** 청구 단위 (1건당 1환자 1진료) */
export interface EdiClaimUnit {
  /** 한의원 식별 — 사업자등록번호(요양기관기호) */
  clinicYoyangCode: string;        // 8자리 요양기관기호
  /** 청구 일련번호 */
  serialNumber: string;
  /** 청구 구분 */
  submissionType: EdiSubmissionType;

  /** 환자 정보 */
  patient: {
    name: string;
    rrn: string;                    // 주민등록번호 (앞 6 + 뒤 7) — EDI 전송 시 일부 마스킹 정책 따름
    sex: 'M' | 'F';
    nationalityCode?: string;       // 외국인 코드 (없으면 내국인)
    insuranceType: 'NHI' | 'MEDICAL_AID'; // 건강보험 / 의료급여
    insuranceCardNumber?: string;
    isCovered: boolean;             // 자격 확인 결과
  };

  /** 진료/청구 일자 (ISO date) */
  serviceDate: string;
  claimDate: string;

  /** 진료 의사(한의사) */
  practitioner: {
    licenseNumber: string;          // 면허번호
    name: string;
  };

  /** 상병 (KCD) — 첫번째 항목이 주상병 */
  diagnoses: Array<{
    code: string;                   // 예: U50.1
    isPrimary: boolean;
    onsetDate?: string;
  }>;

  /** 시술/처치 항목 (수가코드) */
  treatments: Array<{
    code: string;                   // 행위·약제·재료 코드
    quantity: number;               // 횟수/일수
    unitPrice: number;              // 단가 (원)
    totalPrice: number;             // 합계
    category: 'acupuncture' | 'moxibustion' | 'cupping' | 'chuna' | 'medication' | 'cheopyak_pilot' | 'other';
    /** 첩약 시범사업 여부 */
    cheopyakPilot?: {
      diseaseCode: string;          // 시범사업 질환 코드 (CP01~CP16)
      cheopCount: number;
    };
  }>;

  /** 본인부담 / 공단부담 분리 */
  copay: {
    patientAmount: number;          // 환자 본인부담
    insurerAmount: number;          // 공단 부담
    totalAmount: number;
  };

  /** 의료급여(2종 등) 추가 정보 */
  medicalAidExtras?: {
    classification: '1종' | '2종';
    referralDocNumber?: string;
  };
}

/** EDI 직렬화 결과 — 외부 발송 직전 메시지 */
export interface EdiSerializedMessage {
  format: 'xml';
  /** 메시지 ID — 응답 추적용 */
  messageId: string;
  /** payload (XML 문자열) */
  body: string;
  /** 보낸이 정보 — VAN 사업자 헤더용 */
  sender: {
    yoyangCode: string;
    edsId?: string;                 // EDI VAN 가입 ID
  };
  generatedAt: string;
}

/** EDI 응답 (HIRA → 한의원) */
export interface EdiAck {
  messageId: string;
  receivedAt: string;
  status: 'received' | 'syntax_error' | 'business_error' | 'rejected';
  errors?: Array<{ code: string; field?: string; message: string }>;
}

/** 심사 결정 (HIRA → 한의원, 보통 청구 후 며칠~수주 뒤) */
export interface EdiReviewDecision {
  claimSerialNumber: string;
  reviewedAt: string;
  outcome: 'approved' | 'partial' | 'rejected';
  approvedAmount: number;
  adjustedAmount: number;
  rejectedAmount: number;
  /** 항목별 사유 (삭감 학습 데이터의 직접 입력원) */
  itemAdjustments: Array<{
    treatmentCode: string;
    originalAmount: number;
    adjustedAmount: number;
    reasonCode: string;             // 심평원 반려/조정 사유 코드
    reasonText: string;
  }>;
}

/** 청구 검증 결과 — 제출 전 사전 점검 */
export interface EdiValidationResult {
  ok: boolean;
  errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>;
}
