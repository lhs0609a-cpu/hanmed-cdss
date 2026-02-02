import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PracticeAnalyticsService } from './practice-analytics.service';
import { PeriodType } from './dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: PracticeAnalyticsService) {}

  /**
   * 대시보드 요약 데이터
   */
  @Get('dashboard')
  @ApiOperation({
    summary: '대시보드 요약',
    description: '한의사의 진료 성과 대시보드 데이터를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '대시보드 데이터 조회 성공' })
  async getDashboard(@Request() req: any) {
    const result = await this.analyticsService.getDashboardData(req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 기간별 통계 조회
   */
  @Get('statistics')
  @ApiOperation({
    summary: '기간별 통계',
    description: '지정된 기간의 진료 통계를 조회합니다.',
  })
  @ApiQuery({ name: 'period', enum: PeriodType, description: '기간 타입' })
  @ApiQuery({ name: 'startDate', description: '시작 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: '종료 날짜 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: '통계 조회 성공' })
  async getStatistics(
    @Request() req: any,
    @Query('period') period: 'daily' | 'weekly' | 'monthly',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.analyticsService.getStatistics(
      req.user.id,
      period,
      new Date(startDate),
      new Date(endDate),
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 벤치마크 비교
   */
  @Get('benchmark')
  @ApiOperation({
    summary: '벤치마크 비교',
    description: '전국 평균 대비 나의 성과를 비교합니다.',
  })
  @ApiResponse({ status: 200, description: '벤치마크 조회 성공' })
  async getBenchmark(@Request() req: any) {
    const result = await this.analyticsService.getBenchmark(req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 처방 패턴 분석
   */
  @Get('patterns')
  @ApiOperation({
    summary: '처방 패턴 분석',
    description: '자주 사용하는 처방, 증상, 체질 분포를 분석합니다.',
  })
  @ApiResponse({ status: 200, description: '패턴 분석 조회 성공' })
  async getPrescriptionPatterns(@Request() req: any) {
    const result = await this.analyticsService.getPrescriptionPatterns(req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 세금 리포트 데이터
   */
  @Get('export/tax-report')
  @ApiOperation({
    summary: '세금 신고용 리포트',
    description: '연간 진료 통계 리포트를 생성합니다.',
  })
  @ApiQuery({ name: 'year', type: Number, description: '년도' })
  @ApiResponse({ status: 200, description: '세금 리포트 생성 성공' })
  async getTaxReport(
    @Request() req: any,
    @Query('year') year: number,
  ) {
    const result = await this.analyticsService.generateTaxReportData(
      req.user.id,
      Number(year),
    );
    return {
      success: true,
      data: result,
    };
  }
}
