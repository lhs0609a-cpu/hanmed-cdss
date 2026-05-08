import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  EdiClaimUnit,
  EdiSerializedMessage,
  EdiValidationResult,
} from './edi-types';

/**
 * EDI 메시지 빌더.
 *
 * 책임:
 *   1) 사전 검증 — 필수 필드, 코드 포맷, 금액 합계 일치 등
 *   2) XML 직렬화 — HIRA RFI 표준 메시지 형식 (간략화 — 실제 XSD 따라 보강 필요)
 *   3) 메시지 ID 생성 — 응답 추적용 UUID
 *
 * 외부 통신/서명/암호화는 별도 어댑터(edi-submission.service)가 담당한다.
 */

@Injectable()
export class EdiBuilderService {
  private readonly logger = new Logger(EdiBuilderService.name);

  validate(unit: EdiClaimUnit): EdiValidationResult {
    const errors: EdiValidationResult['errors'] = [];

    // 요양기관기호 8자리
    if (!/^\d{8}$/.test(unit.clinicYoyangCode)) {
      errors.push({ field: 'clinicYoyangCode', message: '요양기관기호는 8자리 숫자입니다.', severity: 'error' });
    }
    // 주민번호 형식 (마스킹 후라도 13자리)
    if (!/^\d{13}$/.test((unit.patient.rrn || '').replace(/\D/g, ''))) {
      errors.push({ field: 'patient.rrn', message: '주민등록번호는 13자리 숫자입니다.', severity: 'error' });
    }
    // 면허번호
    if (!unit.practitioner.licenseNumber || unit.practitioner.licenseNumber.length < 5) {
      errors.push({ field: 'practitioner.licenseNumber', message: '면허번호 누락', severity: 'error' });
    }
    // 주상병 1개
    const primaryDiagnoses = unit.diagnoses.filter((d) => d.isPrimary);
    if (primaryDiagnoses.length !== 1) {
      errors.push({
        field: 'diagnoses',
        message: '주상병이 정확히 1개여야 합니다.',
        severity: 'error',
      });
    }
    // 시술 항목 최소 1개
    if (!unit.treatments?.length) {
      errors.push({ field: 'treatments', message: '시술 항목이 1개 이상 있어야 합니다.', severity: 'error' });
    }
    // 금액 일관성
    const sum = (unit.treatments ?? []).reduce(
      (acc, t) => acc + Math.round((t.unitPrice || 0) * (t.quantity || 0)),
      0,
    );
    const expected = sum;
    if (Math.abs(expected - unit.copay.totalAmount) > 1) {
      errors.push({
        field: 'copay.totalAmount',
        message: `시술 합계(${expected}) 와 청구 총액(${unit.copay.totalAmount}) 불일치`,
        severity: 'error',
      });
    }
    if (Math.abs(unit.copay.patientAmount + unit.copay.insurerAmount - unit.copay.totalAmount) > 1) {
      errors.push({
        field: 'copay',
        message: '본인부담 + 공단부담 ≠ 총액',
        severity: 'error',
      });
    }
    // KCD 코드 형식 (느슨한 검증 — 영문대문자 1자리 + 숫자 + 선택 .)
    for (const d of unit.diagnoses) {
      if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(d.code)) {
        errors.push({
          field: `diagnoses.${d.code}`,
          message: `상병코드 형식 비정상: ${d.code}`,
          severity: 'warning',
        });
      }
    }
    // 첩약 시범사업 cross-check
    for (const t of unit.treatments ?? []) {
      if (t.category === 'cheopyak_pilot' && !t.cheopyakPilot?.diseaseCode) {
        errors.push({
          field: 'treatments',
          message: '첩약 시범사업 항목에는 시범사업 질환 코드가 필요합니다.',
          severity: 'error',
        });
      }
    }

    return { ok: !errors.some((e) => e.severity === 'error'), errors };
  }

  build(unit: EdiClaimUnit): EdiSerializedMessage {
    const validation = this.validate(unit);
    if (!validation.ok) {
      const firstError = validation.errors.find((e) => e.severity === 'error');
      throw new Error(`EDI 빌드 실패: ${firstError?.message ?? '알 수 없는 오류'}`);
    }

    const messageId = crypto.randomUUID();
    const body = this.toXml(unit, messageId);

    this.logger.log(
      `[edi] built msg=${messageId} clinic=${unit.clinicYoyangCode} serial=${unit.serialNumber}`,
    );

    return {
      format: 'xml',
      messageId,
      body,
      sender: {
        yoyangCode: unit.clinicYoyangCode,
        edsId: process.env.EDI_VAN_EDS_ID,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private toXml(unit: EdiClaimUnit, messageId: string): string {
    // 간략화된 RFI 형식 — 실제 운영은 심평원 XSD 에 맞춰 보강 필요.
    const esc = (s: string | number | undefined | null): string => {
      if (s === null || s === undefined) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const diagnosesXml = unit.diagnoses
      .map(
        (d) =>
          `      <Diagnosis primary="${d.isPrimary ? 'Y' : 'N'}" code="${esc(d.code)}"${d.onsetDate ? ` onsetDate="${esc(d.onsetDate)}"` : ''}/>`,
      )
      .join('\n');

    const treatmentsXml = unit.treatments
      .map((t) => {
        const cheopyakAttr =
          t.category === 'cheopyak_pilot' && t.cheopyakPilot
            ? ` cheopyakDiseaseCode="${esc(t.cheopyakPilot.diseaseCode)}" cheopCount="${t.cheopyakPilot.cheopCount}"`
            : '';
        return `      <Treatment code="${esc(t.code)}" qty="${t.quantity}" unitPrice="${t.unitPrice}" totalPrice="${t.totalPrice}" category="${esc(t.category)}"${cheopyakAttr}/>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<HiraClaim version="2.0" messageId="${messageId}">
  <Header>
    <YoyangCode>${esc(unit.clinicYoyangCode)}</YoyangCode>
    <SubmissionType>${esc(unit.submissionType)}</SubmissionType>
    <Serial>${esc(unit.serialNumber)}</Serial>
    <ClaimDate>${esc(unit.claimDate)}</ClaimDate>
    <ServiceDate>${esc(unit.serviceDate)}</ServiceDate>
  </Header>
  <Patient>
    <Name>${esc(unit.patient.name)}</Name>
    <Rrn>${esc(unit.patient.rrn)}</Rrn>
    <Sex>${esc(unit.patient.sex)}</Sex>
    <InsuranceType>${esc(unit.patient.insuranceType)}</InsuranceType>
    <InsuranceCard>${esc(unit.patient.insuranceCardNumber ?? '')}</InsuranceCard>
    <IsCovered>${unit.patient.isCovered ? 'Y' : 'N'}</IsCovered>
  </Patient>
  <Practitioner>
    <LicenseNumber>${esc(unit.practitioner.licenseNumber)}</LicenseNumber>
    <Name>${esc(unit.practitioner.name)}</Name>
  </Practitioner>
  <Diagnoses>
${diagnosesXml}
  </Diagnoses>
  <Treatments>
${treatmentsXml}
  </Treatments>
  <Copay>
    <Patient>${unit.copay.patientAmount}</Patient>
    <Insurer>${unit.copay.insurerAmount}</Insurer>
    <Total>${unit.copay.totalAmount}</Total>
  </Copay>
${
  unit.medicalAidExtras
    ? `  <MedicalAid classification="${esc(unit.medicalAidExtras.classification)}" referralDoc="${esc(unit.medicalAidExtras.referralDocNumber ?? '')}"/>\n`
    : ''
}</HiraClaim>`;
  }
}
