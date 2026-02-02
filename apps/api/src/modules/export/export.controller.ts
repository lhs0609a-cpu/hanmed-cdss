import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { ExportService } from './export.service';
import { IsOptional, IsDateString } from 'class-validator';

class ExportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * 진료 기록 CSV 내보내기
   */
  @Get('consultations/csv')
  async exportConsultationsCSV(
    @CurrentUser() user: User,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const dateRange = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const csv = await this.exportService.exportConsultationsToCSV(
      user.id,
      dateRange,
    );

    const filename = `진료기록_${this.getDateString()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(csv);
  }

  /**
   * 환자 목록 CSV 내보내기
   */
  @Get('patients/csv')
  async exportPatientsCSV(
    @CurrentUser() user: User,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const dateRange = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const csv = await this.exportService.exportPatientsToCSV(
      user.id,
      dateRange,
    );

    const filename = `환자목록_${this.getDateString()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(csv);
  }

  /**
   * 처방전 PDF용 HTML 내보내기
   * (클라이언트에서 window.print()로 PDF 저장)
   */
  @Get('prescription/:id/html')
  async exportPrescriptionHTML(
    @CurrentUser() user: User,
    @Param('id') prescriptionId: string,
    @Res() res: Response,
  ) {
    if (!prescriptionId) {
      throw new BadRequestException('처방 ID가 필요합니다.');
    }

    const html = await this.exportService.generatePrescriptionHTML(
      prescriptionId,
      user.id,
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  private getDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }
}
