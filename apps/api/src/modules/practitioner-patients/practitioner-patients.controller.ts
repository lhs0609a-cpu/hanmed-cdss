import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import {
  PractitionerPatientsService,
  UpsertPatientInput,
  CreateVisitInput,
  RecordOutcomeInput,
} from './practitioner-patients.service';

type AuthedRequest = Request & { user: { id: string } };

/**
 * 한의사 본인의 환자 명부 / 진료 기록.
 * 모든 엔드포인트는 JWT 필수이고, 서비스 계층에서 practitionerId 로 스코프된다.
 */
@ApiTags('my-patients')
@Controller('my-patients')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PractitionerPatientsController {
  constructor(private readonly service: PractitionerPatientsService) {}

  @Get()
  @ApiOperation({ summary: '내 환자 명부 조회' })
  list(@Req() req: AuthedRequest) {
    return this.service.listPatients(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: '환자 등록' })
  create(@Req() req: AuthedRequest, @Body() body: UpsertPatientInput) {
    return this.service.createPatient(req.user.id, body);
  }

  @Get('export')
  @ApiOperation({ summary: '내 환자·진료 데이터 전체 내보내기' })
  exportAll(@Req() req: AuthedRequest) {
    return this.service.exportAll(req.user.id);
  }

  @Post('import')
  @ApiOperation({ summary: '브라우저에 남아 있던 로컬 데이터 이관' })
  importLocal(
    @Req() req: AuthedRequest,
    @Body() body: { patients?: UpsertPatientInput[]; visits?: CreateVisitInput[] },
  ) {
    return this.service.importLocal(req.user.id, body ?? {});
  }

  @Get('visits')
  @ApiOperation({ summary: '진료 기록 조회 (patientId 로 필터)' })
  listVisits(
    @Req() req: AuthedRequest,
    @Query('patientId') patientId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listVisits(
      req.user.id,
      patientId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('visits')
  @ApiOperation({ summary: '진료 기록 저장' })
  createVisit(@Req() req: AuthedRequest, @Body() body: CreateVisitInput) {
    return this.service.createVisit(req.user.id, body);
  }

  @Get('follow-ups')
  @ApiOperation({
    summary: '경과 확인이 필요한 진료',
    description:
      '재방문일이 지났는데 경과가 없거나, 재방문일 없이 처방 후 일정 기간이 지난 진료를 모은다.',
  })
  listFollowUps(@Req() req: AuthedRequest, @Query('staleDays') staleDays?: string) {
    return this.service.listPendingFollowUps(
      req.user.id,
      staleDays ? parseInt(staleDays, 10) : 14,
    );
  }

  @Patch('visits/:id/outcome')
  @ApiOperation({ summary: '진료 경과 기록' })
  recordOutcome(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordOutcomeInput,
  ) {
    return this.service.recordOutcome(req.user.id, id, body);
  }

  @Delete('visits/:id')
  @ApiOperation({ summary: '진료 기록 삭제' })
  async deleteVisit(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.deleteVisit(req.user.id, id);
    return { deleted: true };
  }

  // :id 라우트는 'export' / 'import' / 'visits' 뒤에 와야 한다 —
  // 앞에 두면 그 경로들이 :id 로 잡힌다.
  @Get(':id')
  @ApiOperation({ summary: '환자 상세 조회' })
  get(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPatient(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '환자 정보 수정' })
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<UpsertPatientInput>,
  ) {
    return this.service.updatePatient(req.user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '환자 삭제' })
  async remove(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.deletePatient(req.user.id, id);
    return { deleted: true };
  }
}
