import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Sse,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, interval, map, takeWhile, switchMap, from } from 'rxjs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { SajuReport, SajuReportStatus } from '../../database/entities/saju-report.entity';
import { SajuReportSection } from '../../database/entities/saju-report-section.entity';
import { SajuPaymentService } from './services/saju-payment.service';
import { SajuReportGeneratorService } from './services/saju-report-generator.service';
import { SajuPdfService } from './services/saju-pdf.service';
import { CreateSajuOrderDto, ConfirmSajuPaymentDto } from './dto';

@ApiTags('saju')
@Controller('saju')
export class SajuController {
  constructor(
    private readonly paymentService: SajuPaymentService,
    private readonly reportGeneratorService: SajuReportGeneratorService,
    private readonly pdfService: SajuPdfService,
    @InjectRepository(SajuReport)
    private readonly reportRepository: Repository<SajuReport>,
    @InjectRepository(SajuReportSection)
    private readonly sectionRepository: Repository<SajuReportSection>,
  ) {}

  // ========== 결제 ==========

  @Public()
  @Get('products')
  @ApiOperation({ summary: '사주 상품 목록 조회' })
  getProducts() {
    return this.paymentService.getProducts();
  }

  @Public()
  @Get('client-key')
  @ApiOperation({ summary: 'Toss 클라이언트키 조회' })
  getClientKey() {
    return { clientKey: this.paymentService.getClientKey() };
  }

  @Public()
  @Post('order')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '사주 주문 생성' })
  async createOrder(@Body() dto: CreateSajuOrderDto) {
    return this.paymentService.createOrder(dto);
  }

  @Public()
  @Post('confirm')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '사주 결제 승인' })
  async confirmPayment(@Body() dto: ConfirmSajuPaymentDto) {
    const result = await this.paymentService.confirmPayment(dto);

    // 결제 성공 시 리포트 생성 시작
    if (result.success && result.reportId) {
      await this.reportGeneratorService.startGeneration(result.reportId);
    }

    return result;
  }

  // ========== 리포트 ==========

  @Public()
  @Get('reports/access/:token')
  @ApiOperation({ summary: '공유 링크로 리포트 조회' })
  async getReportByToken(@Param('token') token: string) {
    const report = await this.reportRepository.findOne({
      where: { accessToken: token },
    });
    if (!report) throw new NotFoundException('리포트를 찾을 수 없습니다.');

    // 결제 완료 전 리포트는 토큰으로도 접근 차단
    if (report.status === SajuReportStatus.PENDING_PAYMENT) {
      throw new NotFoundException('리포트를 찾을 수 없습니다.');
    }

    const sections = await this.sectionRepository.find({
      where: { reportId: report.id, isCompleted: true },
      order: { sectionOrder: 'ASC' },
    });

    return { report, sections };
  }

  @Get('reports/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 리포트 목록' })
  async getMyReports(@CurrentUser() user: User) {
    const reports = await this.reportRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    return { reports };
  }

  @Public()
  @Get('reports/:id')
  @ApiOperation({ summary: '리포트 상세 조회 (token 필수)' })
  async getReport(
    @Param('id') id: string,
    @Query('token') token?: string,
  ) {
    // 공개 엔드포인트: accessToken 필수
    if (!token) {
      throw new ForbiddenException('접근 토큰이 필요합니다.');
    }

    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException('리포트를 찾을 수 없습니다.');

    if (report.accessToken !== token) {
      throw new ForbiddenException('리포트에 접근할 권한이 없습니다.');
    }

    // 결제 전 리포트는 토큰이 있어도 접근 차단 (멱등성 확인용은 별도 경로)
    if (report.status === SajuReportStatus.PENDING_PAYMENT) {
      throw new NotFoundException('아직 결제가 완료되지 않은 리포트입니다.');
    }

    const sections = await this.sectionRepository.find({
      where: { reportId: id, isCompleted: true },
      order: { sectionOrder: 'ASC' },
    });

    return { report, sections };
  }

  @Public()
  @Sse('reports/:id/progress')
  @ApiOperation({ summary: 'SSE 리포트 생성 진행률 (token 필수)' })
  getProgress(
    @Param('id') id: string,
    @Query('token') token?: string,
  ): Observable<MessageEvent> {
    return interval(2000).pipe(
      switchMap(() =>
        from(this.reportRepository.findOne({ where: { id } })).pipe(
          map((report) => {
            if (!report || !token || report.accessToken !== token) {
              return {
                data: { status: 'not_found', progress: 0 },
              } as MessageEvent;
            }

            const progress =
              report.totalSections > 0
                ? Math.round(
                    (report.completedSections / report.totalSections) * 100,
                  )
                : 0;

            return {
              data: {
                status: report.status,
                completedSections: report.completedSections,
                totalSections: report.totalSections,
                progress,
              },
            } as MessageEvent;
          }),
        ),
      ),
      takeWhile((event: any) => {
        const status = event.data?.status;
        return (
          status !== SajuReportStatus.COMPLETED &&
          status !== SajuReportStatus.FAILED &&
          status !== 'not_found'
        );
      }, true), // inclusive: 마지막 이벤트도 전송
    );
  }

  // ========== PDF ==========

  @Public()
  @Post('reports/:id/pdf')
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'PDF 생성 트리거 (token 필수)' })
  async generatePdf(
    @Param('id') id: string,
    @Query('token') token?: string,
  ) {
    if (!token) throw new ForbiddenException('접근 토큰이 필요합니다.');
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException('리포트를 찾을 수 없습니다.');
    if (report.accessToken !== token) {
      throw new ForbiddenException('리포트에 접근할 권한이 없습니다.');
    }
    if (report.tier !== 'premium') {
      throw new ForbiddenException('프리미엄 리포트만 PDF 생성이 가능합니다.');
    }
    return this.pdfService.generatePdf(id);
  }

  @Public()
  @Get('reports/:id/pdf')
  @ApiOperation({ summary: 'PDF 다운로드 URL 조회 (token 필수)' })
  async getPdf(
    @Param('id') id: string,
    @Query('token') token?: string,
  ) {
    if (!token) throw new ForbiddenException('접근 토큰이 필요합니다.');
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException('리포트를 찾을 수 없습니다.');
    if (report.accessToken !== token) {
      throw new ForbiddenException('리포트에 접근할 권한이 없습니다.');
    }
    if (!report.pdfUrl) throw new NotFoundException('PDF가 아직 생성되지 않았습니다.');
    return { url: report.pdfUrl };
  }
}
