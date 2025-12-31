import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PatientRecordsService } from './patient-records.service';
import { PatientAuthGuard } from '../patient-auth/guards/patient-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import {
  CreatePatientRecordDto,
  UpdatePatientRecordDto,
  ShareRecordDto,
  GetRecordsDto,
} from './dto';

@ApiTags('patient-records')
@Controller('patient-records')
export class PatientRecordsController {
  constructor(private readonly recordsService: PatientRecordsService) {}

  // ===== 환자용 엔드포인트 =====

  @Get()
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 진료 기록 목록 (환자용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async findMyRecords(@Request() req: any, @Query() dto: GetRecordsDto) {
    return this.recordsService.findByPatient(req.user.id, dto);
  }

  @Get(':id')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '진료 기록 상세 (환자용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '기록을 찾을 수 없음' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.recordsService.findByIdForPatient(id, req.user.id);
  }

  // ===== 의료진용 엔드포인트 =====

  @Post('clinic/:clinicId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '진료 기록 생성 (의료진용)' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  async create(
    @Param('clinicId') clinicId: string,
    @Request() req: any,
    @Body() dto: CreatePatientRecordDto,
  ) {
    return this.recordsService.create(req.user.id, clinicId, dto);
  }

  @Patch('clinic/:clinicId/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '진료 기록 수정 (의료진용)' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  async update(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdatePatientRecordDto,
  ) {
    return this.recordsService.update(id, req.user.id, clinicId, dto);
  }

  @Post('clinic/:clinicId/:id/share')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '환자에게 기록 공유 (의료진용)' })
  @ApiResponse({ status: 200, description: '공유 성공' })
  async shareWithPatient(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: { generateAiExplanation?: boolean },
  ) {
    return this.recordsService.shareWithPatient(
      id,
      req.user.id,
      clinicId,
      dto.generateAiExplanation ?? true,
    );
  }

  @Get('clinic/:clinicId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '한의원 진료 기록 목록 (의료진용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async findByClinic(
    @Param('clinicId') clinicId: string,
    @Query() dto: GetRecordsDto & { patientId?: string },
  ) {
    return this.recordsService.findByClinic(clinicId, dto);
  }

  @Get('clinic/:clinicId/:id/share-link')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '공유 링크 생성 (의료진용)' })
  @ApiResponse({ status: 200, description: '링크 생성 성공' })
  async getShareLink(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
  ) {
    return this.recordsService.generateShareLink(id, clinicId);
  }

  @Post('clinic/:clinicId/:id/send-sms')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'SMS로 공유 링크 발송 (의료진용)' })
  @ApiResponse({ status: 200, description: '발송 성공' })
  async sendViaSms(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: { generateAiExplanation?: boolean },
  ) {
    return this.recordsService.sendShareLinkViaSms(
      id,
      req.user.id,
      clinicId,
      dto.generateAiExplanation ?? true,
    );
  }

  @Post('clinic/:clinicId/:id/send-kakao')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '카카오톡으로 공유 링크 발송 (의료진용)' })
  @ApiResponse({ status: 200, description: '발송 성공' })
  async sendViaKakao(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: { generateAiExplanation?: boolean },
  ) {
    return this.recordsService.sendShareLinkViaKakao(
      id,
      req.user.id,
      clinicId,
      dto.generateAiExplanation ?? true,
    );
  }
}
