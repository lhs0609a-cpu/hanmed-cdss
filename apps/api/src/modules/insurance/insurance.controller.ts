import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InsuranceService } from './insurance.service';
import {
  CreateClaimDto,
  UpdateClaimDto,
  SubmitClaimDto,
  RecordReviewResultDto,
  AutoMatchCodesDto,
  ClaimListQueryDto,
} from './dto';
import { ClaimStatus, InsuranceType } from '../../database/entities/insurance-claim.entity';

@ApiTags('Insurance Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  /**
   * 진료 기록에서 청구서 자동 생성
   */
  @Post('claims/auto-create/:recordId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '청구서 자동 생성',
    description: '진료 기록을 기반으로 보험 청구서를 자동 생성합니다.',
  })
  @ApiParam({ name: 'recordId', description: '진료 기록 ID' })
  @ApiResponse({ status: 200, description: '청구서 생성 성공' })
  async autoCreateClaim(
    @Request() req: any,
    @Param('recordId') recordId: string,
    @Query('insuranceType') insuranceType?: InsuranceType,
  ) {
    const result = await this.insuranceService.createClaimFromRecord(
      req.user.id,
      req.user.clinicId || req.user.id, // clinicId가 없으면 userId 사용
      recordId,
      insuranceType,
    );
    return { success: true, data: result };
  }

  /**
   * 청구서 수동 생성
   */
  @Post('claims')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '청구서 수동 생성',
    description: '보험 청구서를 수동으로 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '청구서 생성 성공' })
  async createClaim(
    @Request() req: any,
    @Body() dto: CreateClaimDto,
  ) {
    const result = await this.insuranceService.createClaim(
      req.user.id,
      req.user.clinicId || req.user.id,
      {
        patientId: dto.patientId,
        recordId: dto.recordId,
        insuranceType: dto.insuranceType,
        treatmentDate: new Date(dto.treatmentDate),
        diagnosisCodes: dto.diagnosisCodes,
        treatmentItems: dto.treatmentItems?.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice,
        })),
      },
    );
    return { success: true, data: result };
  }

  /**
   * 청구서 목록 조회
   */
  @Get('claims')
  @ApiOperation({
    summary: '청구서 목록 조회',
    description: '보험 청구서 목록을 조회합니다.',
  })
  @ApiQuery({ name: 'status', enum: ClaimStatus, required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getClaims(
    @Request() req: any,
    @Query() query: ClaimListQueryDto,
  ) {
    const result = await this.insuranceService.getClaims(
      req.user.id,
      req.user.clinicId || req.user.id,
      {
        status: query.status,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        page: query.page,
        limit: query.limit,
      },
    );
    return { success: true, data: result };
  }

  /**
   * 청구서 상세 조회
   */
  @Get('claims/:claimId')
  @ApiOperation({
    summary: '청구서 상세 조회',
    description: '특정 청구서의 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'claimId', description: '청구서 ID' })
  async getClaim(@Param('claimId') claimId: string) {
    const result = await this.insuranceService.getClaim(claimId);
    return { success: true, data: result };
  }

  /**
   * 청구서 수정
   */
  @Put('claims/:claimId')
  @ApiOperation({
    summary: '청구서 수정',
    description: '작성 중인 청구서를 수정합니다.',
  })
  @ApiParam({ name: 'claimId', description: '청구서 ID' })
  async updateClaim(
    @Param('claimId') claimId: string,
    @Body() dto: UpdateClaimDto,
  ) {
    const result = await this.insuranceService.updateClaim(claimId, {
      diagnosisCodes: dto.diagnosisCodes,
      treatmentItems: dto.treatmentItems?.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      })),
      notes: dto.notes,
    });
    return { success: true, data: result };
  }

  /**
   * 청구서 제출
   */
  @Post('claims/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '청구서 제출',
    description: '선택한 청구서들을 건강보험공단에 제출합니다.',
  })
  async submitClaims(
    @Request() req: any,
    @Body() dto: SubmitClaimDto,
  ) {
    const result = await this.insuranceService.submitClaims(dto.claimIds, req.user.id);
    return {
      success: true,
      data: {
        submittedCount: result.length,
        claims: result,
      },
    };
  }

  /**
   * 심사 결과 기록
   */
  @Post('claims/:claimId/review-result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '심사 결과 기록',
    description: '청구서의 심사 결과를 기록합니다.',
  })
  @ApiParam({ name: 'claimId', description: '청구서 ID' })
  async recordReviewResult(
    @Param('claimId') claimId: string,
    @Body() dto: RecordReviewResultDto,
  ) {
    const result = await this.insuranceService.recordReviewResult(claimId, dto);
    return { success: true, data: result };
  }

  /**
   * 청구 통계
   */
  @Get('summary')
  @ApiOperation({
    summary: '청구 통계',
    description: '기간별 보험 청구 통계를 조회합니다.',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getClaimSummary(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.insuranceService.getClaimSummary(
      req.user.clinicId || req.user.id,
      new Date(startDate),
      new Date(endDate),
    );
    return { success: true, data: result };
  }

  /**
   * 누락 청구 감지
   */
  @Get('missing')
  @ApiOperation({
    summary: '누락 청구 감지',
    description: '청구서가 생성되지 않은 진료 기록을 조회합니다.',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async detectMissingClaims(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.insuranceService.detectMissingClaims(
      req.user.clinicId || req.user.id,
      new Date(startDate),
      new Date(endDate),
    );
    return {
      success: true,
      data: {
        count: result.length,
        records: result,
      },
    };
  }
}
