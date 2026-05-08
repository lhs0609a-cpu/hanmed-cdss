import { Injectable, Logger } from '@nestjs/common';

/**
 * 사용자 데이터 export — 환자/진료 기록을 한꺼번에 추출한다.
 *
 * 정책:
 *   - 한의사 본인 또는 그 한의원 멤버만 export 가능.
 *   - 형식: JSON (풀 스키마, 추후 import 호환), CSV (Excel 호환)
 *   - 파일은 일회용 다운로드 URL (S3 presigned 또는 즉시 stream).
 *   - audit log 에 export 시점/IP 기록 (개인정보보호법).
 */

export interface ExportRequest {
  userId: string;
  format: 'json' | 'csv';
  scope: {
    patients: boolean;
    visits: boolean;
    prescriptions: boolean;
    diagnoses: boolean;
  };
  anonymize?: boolean;
}

export interface ExportResult {
  filename: string;
  contentType: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  /**
   * Export 실행.
   * 실제 데이터 수집은 PatientsRepository / VisitsRepository 와 결합.
   * 본 메서드는 인터페이스 + 직렬화 책임만 가진다.
   */
  async exportUserData(
    request: ExportRequest,
    fetchData: (req: ExportRequest) => Promise<unknown>,
  ): Promise<ExportResult> {
    const data = await fetchData(request);
    if (request.format === 'json') {
      const json = JSON.stringify({
        exportedAt: new Date().toISOString(),
        userId: request.userId,
        scope: request.scope,
        data,
      }, null, 2);
      const buffer = Buffer.from(json, 'utf-8');
      return {
        filename: `ongojisin-export-${request.userId}-${Date.now()}.json`,
        contentType: 'application/json; charset=utf-8',
        size: buffer.length,
        buffer,
      };
    }
    const csv = this.toCsv(data);
    // BOM 으로 Excel 한글 깨짐 방지
    const buffer = Buffer.from('﻿' + csv, 'utf-8');
    return {
      filename: `ongojisin-export-${request.userId}-${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
      size: buffer.length,
      buffer,
    };
  }

  private toCsv(data: unknown): string {
    if (!Array.isArray(data) || data.length === 0) return '';
    const rows = data as Array<Record<string, unknown>>;
    const headers = Array.from(
      rows.reduce<Set<string>>((acc, row) => {
        Object.keys(row).forEach((k) => acc.add(k));
        return acc;
      }, new Set()),
    );
    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(','));
    }
    return lines.join('\r\n');
  }
}
