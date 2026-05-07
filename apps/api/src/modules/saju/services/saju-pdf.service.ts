import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SajuReport, SajuReportStatus } from '../../../database/entities/saju-report.entity';
import { SajuReportSection } from '../../../database/entities/saju-report-section.entity';

@Injectable()
export class SajuPdfService {
  private readonly logger = new Logger(SajuPdfService.name);

  constructor(
    @InjectRepository(SajuReport)
    private reportRepository: Repository<SajuReport>,
    @InjectRepository(SajuReportSection)
    private sectionRepository: Repository<SajuReportSection>,
    private configService: ConfigService,
  ) {}

  /** PDF 생성 */
  async generatePdf(reportId: string): Promise<{ url: string }> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('리포트를 찾을 수 없습니다.');
    }

    if (report.status !== SajuReportStatus.COMPLETED) {
      throw new NotFoundException('리포트 생성이 아직 완료되지 않았습니다.');
    }

    const sections = await this.sectionRepository.find({
      where: { reportId },
      order: { sectionOrder: 'ASC' },
    });

    try {
      // Puppeteer로 HTML → PDF 변환
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      const html = this.buildHtml(report, sections);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '60px', bottom: '60px', left: '40px', right: '40px' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size:9px;width:100%;text-align:center;color:#999;padding:10px 40px;">
            몸이알려줌 건강사주 리포트
          </div>`,
        footerTemplate: `
          <div style="font-size:9px;width:100%;text-align:center;color:#999;padding:10px 40px;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>`,
      });

      await browser.close();

      const pdfUrl = await this.persistPdf(reportId, pdfBuffer);
      await this.reportRepository.update(reportId, { pdfUrl });

      return { url: pdfUrl };
    } catch (error) {
      this.logger.error(`PDF 생성 실패 [${reportId}]`, error);
      throw error;
    }
  }

  /**
   * PDF 영구 저장: Supabase Storage 사용 가능시 업로드, 아니면 로컬 디스크 + 정적 서빙.
   */
  private async persistPdf(reportId: string, pdfBuffer: Buffer): Promise<string> {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseBucket = this.configService.get<string>('SUPABASE_BUCKET', 'saju-reports');

    if (supabaseUrl && supabaseKey) {
      try {
        const path = `saju/${reportId}.pdf`;
        const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${supabaseBucket}/${path}`;
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/pdf',
            'x-upsert': 'true',
          },
          body: pdfBuffer as unknown as BodyInit,
        });
        if (!res.ok) {
          throw new Error(`Supabase upload failed: ${res.status} ${await res.text()}`);
        }
        return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${supabaseBucket}/${path}`;
      } catch (err) {
        this.logger.warn(`Supabase 업로드 실패, 로컬 저장으로 대체: ${(err as Error).message}`);
      }
    }

    // 로컬 디스크 저장
    const uploadsRoot =
      this.configService.get<string>('UPLOADS_DIR') || join(process.cwd(), 'uploads');
    const dir = join(uploadsRoot, 'saju');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, `${reportId}.pdf`), pdfBuffer);

    const publicBase =
      this.configService.get<string>('PUBLIC_BASE_URL') ||
      this.configService.get<string>('BACKEND_URL') ||
      '';
    const path = `/uploads/saju/${reportId}.pdf`;
    return publicBase ? `${publicBase.replace(/\/$/, '')}${path}` : path;
  }

  private buildHtml(report: SajuReport, sections: SajuReportSection[]): string {
    const sectionHtml = sections
      .map(
        (s) => `
      <div class="section" style="page-break-before: always;">
        <h2>${s.title}</h2>
        ${s.imageUrl ? `<img src="${s.imageUrl}" style="max-width:100%;border-radius:12px;margin:16px 0;" />` : ''}
        <div class="content">${this.markdownToHtml(s.content)}</div>
      </div>
    `,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Noto Sans KR', sans-serif;
      color: #1a1a1a;
      line-height: 1.8;
      font-size: 11pt;
    }

    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: linear-gradient(135deg, #fff7ed, #ffe4e6);
      page-break-after: always;
    }

    .cover h1 {
      font-size: 32pt;
      font-weight: 900;
      background: linear-gradient(135deg, #f97316, #f43f5e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 16px;
    }

    .cover .subtitle {
      font-size: 14pt;
      color: #666;
      margin-bottom: 8px;
    }

    .cover .name {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a1a;
      margin: 24px 0;
    }

    .cover .info {
      font-size: 11pt;
      color: #888;
    }

    .toc {
      padding: 60px 0;
      page-break-after: always;
    }

    .toc h2 {
      font-size: 18pt;
      margin-bottom: 24px;
      color: #f97316;
    }

    .toc ul {
      list-style: none;
    }

    .toc li {
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 12pt;
    }

    .section h2 {
      font-size: 16pt;
      font-weight: 700;
      color: #f97316;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #fed7aa;
    }

    .content h3 { font-size: 13pt; font-weight: 700; color: #1a1a1a; margin: 20px 0 8px; }
    .content h4 { font-size: 12pt; font-weight: 600; color: #444; margin: 16px 0 6px; }
    .content p { margin-bottom: 12px; }
    .content ul, .content ol { margin: 8px 0 12px 20px; }
    .content li { margin-bottom: 4px; }
    .content strong { color: #c2410c; }
    .content blockquote {
      border-left: 3px solid #f97316;
      padding: 8px 16px;
      margin: 12px 0;
      background: #fff7ed;
      border-radius: 0 8px 8px 0;
    }
    .content table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .content th, .content td {
      border: 1px solid #e5e5e5;
      padding: 8px 12px;
      text-align: left;
      font-size: 10pt;
    }
    .content th { background: #fff7ed; font-weight: 600; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>건강사주 리포트</h1>
    <div class="subtitle">몸이알려줌 x 한의학 사주 분석</div>
    <div class="name">${report.name}</div>
    <div class="info">${report.birthDate} | ${report.constitution} 체질</div>
    <div class="info" style="margin-top:32px;font-size:9pt;color:#bbb;">
      Generated by 몸이알려줌 AI &middot; ${new Date().toLocaleDateString('ko-KR')}
    </div>
  </div>

  <div class="toc">
    <h2>목차</h2>
    <ul>
      ${sections.map((s, i) => `<li>${i + 1}. ${s.title}</li>`).join('')}
    </ul>
  </div>

  ${sectionHtml}
</body>
</html>`;
  }

  /** 간이 마크다운 → HTML 변환 */
  private markdownToHtml(md: string): string {
    return md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith('<')) return match;
        return `<p>${match}</p>`;
      });
  }
}
