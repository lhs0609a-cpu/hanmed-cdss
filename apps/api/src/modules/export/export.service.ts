import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { PatientPrescription } from '../../database/entities/patient-prescription.entity';

export interface ExportDateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface ConsultationExportRow {
  날짜: string;
  환자명: string;
  성별: string;
  나이: string;
  주소증: string;
  진단: string;
  처방명: string;
  메모: string;
}

export interface PatientExportRow {
  등록일: string;
  환자명: string;
  성별: string;
  생년월일: string;
  연락처: string;
  총진료횟수: string;
  마지막진료일: string;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(PatientRecord)
    private recordRepository: Repository<PatientRecord>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
    @InjectRepository(PatientPrescription)
    private prescriptionRepository: Repository<PatientPrescription>,
  ) {}

  /**
   * 진료 기록을 CSV 형식으로 내보내기
   */
  async exportConsultationsToCSV(
    userId: string,
    dateRange?: ExportDateRange,
  ): Promise<string> {
    const whereClause: any = { practitionerId: userId };

    if (dateRange?.startDate && dateRange?.endDate) {
      whereClause.visitDate = Between(dateRange.startDate, dateRange.endDate);
    } else if (dateRange?.startDate) {
      whereClause.visitDate = MoreThanOrEqual(dateRange.startDate);
    } else if (dateRange?.endDate) {
      whereClause.visitDate = LessThanOrEqual(dateRange.endDate);
    }

    const records = await this.recordRepository.find({
      where: whereClause,
      relations: ['patient', 'prescription'],
      order: { visitDate: 'DESC' },
    });

    const rows: ConsultationExportRow[] = records.map((r) => ({
      날짜: this.formatDate(r.visitDate),
      환자명: r.patient?.name || '미등록',
      성별: this.formatGender(r.patient?.gender),
      나이: r.patient?.birthDate
        ? this.calculateAge(r.patient.birthDate).toString()
        : '',
      주소증: r.chiefComplaintPatient || '',
      진단: r.diagnosisSummary || '',
      처방명: r.prescription?.formulaName || '',
      메모: r.nextVisitNotes || '',
    }));

    return this.convertToCSV(rows);
  }

  /**
   * 환자 목록을 CSV 형식으로 내보내기
   */
  async exportPatientsToCSV(
    userId: string,
    dateRange?: ExportDateRange,
  ): Promise<string> {
    // 해당 한의사의 진료 기록에서 환자 ID 추출
    const records = await this.recordRepository.find({
      where: { practitionerId: userId },
      relations: ['patient'],
      order: { visitDate: 'DESC' },
    });

    // 환자별로 그룹화
    const patientMap = new Map<string, { patient: PatientAccount; visits: PatientRecord[] }>();

    for (const record of records) {
      if (record.patient) {
        const existing = patientMap.get(record.patientId);
        if (existing) {
          existing.visits.push(record);
        } else {
          patientMap.set(record.patientId, { patient: record.patient, visits: [record] });
        }
      }
    }

    const rows: PatientExportRow[] = Array.from(patientMap.values()).map(({ patient, visits }) => ({
      등록일: this.formatDate(patient.createdAt),
      환자명: patient.name,
      성별: this.formatGender(patient.gender),
      생년월일: patient.birthDate ? this.formatDate(patient.birthDate) : '',
      연락처: patient.phone || '',
      총진료횟수: visits.length.toString(),
      마지막진료일: visits.length > 0 ? this.formatDate(visits[0].visitDate) : '',
    }));

    return this.convertToCSV(rows);
  }

  /**
   * 처방전을 PDF용 HTML로 변환
   */
  async generatePrescriptionHTML(
    prescriptionId: string,
    userId: string,
  ): Promise<string> {
    const record = await this.recordRepository.findOne({
      where: { prescriptionId, practitionerId: userId },
      relations: ['patient', 'prescription'],
    });

    if (!record || !record.prescription) {
      throw new NotFoundException('처방 기록을 찾을 수 없습니다.');
    }

    return this.buildPrescriptionHTML(record);
  }

  /**
   * CSV 문자열 생성
   */
  private convertToCSV<T extends object>(rows: T[]): string {
    if (rows.length === 0) {
      return '';
    }

    const headers = Object.keys(rows[0]);
    const csvRows: string[] = [];

    // BOM for Korean encoding in Excel
    csvRows.push('\uFEFF');

    // Header row
    csvRows.push(headers.join(','));

    // Data rows
    for (const row of rows) {
      const values = headers.map((header) => {
        const value = String((row as any)[header] || '');
        // Escape quotes and wrap in quotes if contains comma or newline
        if (
          value.includes(',') ||
          value.includes('\n') ||
          value.includes('"')
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * 처방전 HTML 생성
   */
  private buildPrescriptionHTML(record: PatientRecord): string {
    const patient = record.patient;
    const prescription = record.prescription;

    const herbs =
      prescription?.herbsDetail
        ?.map(
          (h, i) =>
            `<tr><td>${i + 1}</td><td>${h.name}</td><td>${h.amount}</td></tr>`,
        )
        .join('') || '';

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>처방전 - ${prescription?.formulaName || '처방'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #14b8a6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      color: #14b8a6;
      margin-bottom: 8px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #14b8a6;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .info-item {
      display: flex;
    }
    .info-label {
      width: 80px;
      font-weight: 500;
      color: #666;
    }
    .info-value {
      flex: 1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    .chief-complaint {
      background: #f0fdfa;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #14b8a6;
    }
    .formula-name {
      font-size: 20px;
      font-weight: bold;
      color: #0f766e;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>처방전</h1>
    <div class="subtitle">온고지신 AI - 한의학 임상 의사결정 지원 시스템</div>
  </div>

  <div class="section">
    <div class="section-title">환자 정보</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">환자명</span>
        <span class="info-value">${patient?.name || '미등록'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">성별</span>
        <span class="info-value">${this.formatGender(patient?.gender)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">나이</span>
        <span class="info-value">${patient?.birthDate ? this.calculateAge(patient.birthDate) + '세' : '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">진료일</span>
        <span class="info-value">${this.formatDate(record.visitDate)}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">주소증</div>
    <div class="chief-complaint">${record.chiefComplaintPatient || '-'}</div>
  </div>

  <div class="section">
    <div class="section-title">진단 및 처방</div>
    <div class="info-grid" style="margin-bottom: 16px;">
      <div class="info-item">
        <span class="info-label">진단</span>
        <span class="info-value">${record.diagnosisSummary || '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">처방명</span>
        <span class="info-value formula-name">${prescription?.formulaName || '-'}</span>
      </div>
    </div>
    ${
      herbs
        ? `
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">번호</th>
          <th>약재명</th>
          <th style="width: 100px;">용량</th>
        </tr>
      </thead>
      <tbody>
        ${herbs}
      </tbody>
    </table>
    `
        : ''
    }
  </div>

  ${
    record.nextVisitNotes
      ? `
  <div class="section">
    <div class="section-title">특이사항</div>
    <p>${record.nextVisitNotes}</p>
  </div>
  `
      : ''
  }

  <div class="footer">
    <p>본 처방전은 온고지신 AI를 통해 생성되었습니다.</p>
    <p>출력일: ${this.formatDate(new Date())}</p>
  </div>
</body>
</html>`;
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatGender(gender?: string | null): string {
    if (!gender) return '-';
    if (gender === 'M' || gender === 'male') return '남성';
    if (gender === 'F' || gender === 'female') return '여성';
    return gender;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
}
