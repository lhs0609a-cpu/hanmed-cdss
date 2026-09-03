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
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { FeatureKey } from '../../database/entities/plan-features';
import { SubscriptionTier } from '../../database/entities/user.entity';

type AuthedRequest = Request & {
  user: { id: string; subscriptionTier?: SubscriptionTier };
};

/**
 * 한의사 본인의 환자 명부 / 진료 기록.
 * 모든 엔드포인트는 JWT 필수이고, 서비스 계층에서 practitionerId 로 스코프된다.
 */
@ApiTags('my-patients')
/**
 * 환자 명부는 전 티어에 열려 있고 보관 인원으로 나뉜다 (PATIENT_LIMITS).
 *
 * 예전에는 Pro 이상만 들어올 수 있어 무료 계정에는 자물쇠 화면만 보였다.
 * 써 보지 못한 기능은 결제 이유가 되지 않는다. 지금은 문을 열어 두고
 * 인원에서 막는다 — 실제 차단은 서비스의 assertPatientQuota 가 한다.
 *
 * 이 데코레이터는 남겨 둔다. 지금은 전 티어가 통과하지만, 나중에 누가
 * 무료 개방을 되돌리면 API 쪽도 같이 닫히는 것이 맞다.
 */
@RequireFeature(FeatureKey.PATIENT_MANAGEMENT)
@Controller('my-patients')
@UseGuards(AuthGuard('jwt'), FeatureGuard)
@ApiBearerAuth()
export class PractitionerPatientsController {
  constructor(private readonly service: PractitionerPatientsService) {}

  @Get()
  @ApiOperation({ summary: '내 환자 명부 조회' })
  list(@Req() req: AuthedRequest) {
    return this.service.listPatients(req.user.id);
  }

  @Get('quota')
  @ApiOperation({ summary: '환자 보관 사용량과 한도' })
  quota(@Req() req: AuthedRequest) {
    return this.service.getQuota(req.user.id, req.user.subscriptionTier);
  }

  @Post()
  @ApiOperation({ summary: '환자 등록' })
  create(@Req() req: AuthedRequest, @Body() body: UpsertPatientInput) {
    return this.service.createPatient(
      req.user.id,
      body,
      req.user.subscriptionTier,
    );
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
    return this.service.importLocal(
      req.user.id,
      body ?? {},
      req.user.subscriptionTier,
    );
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

  @Get('inactive')
  @ApiOperation({
    summary: '한동안 안 온 환자',
    description:
      '마지막 내원일이 기준일보다 오래된 활성 환자를 오래된 순으로 준다. 등록만 하고 안 온 환자도 포함한다.',
  })
  listInactive(
    @Req() req: AuthedRequest,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedDays = days ? parseInt(days, 10) : NaN;
    const parsedLimit = limit ? parseInt(limit, 10) : NaN;
    return this.service.listInactivePatients(
      req.user.id,
      Number.isFinite(parsedDays) ? parsedDays : 60,
      Number.isFinite(parsedLimit) ? Math.min(parsedLimit, 100) : 30,
    );
  }

  @Patch('visits/:id/interaction-notice')
  @ApiOperation({
    summary: '상호작용 설명 기록',
    description:
      '한약-양약 상호작용 위험을 환자에게 설명했다는 사실을 진료 단위로 남긴다.',
  })
  recordInteractionNotice(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.recordInteractionNotice(req.user.id, id);
  }

  @Get(':id/cheopyak-quota')
  @ApiOperation({
    summary: '첩약 시범사업 연간 한도 사용량',
    description:
      '2단계 시범사업은 환자 1인당 연간 2개 질환, 질환당 20일분까지 급여다. 남은 일수를 계산해 준다.',
  })
  cheopyakQuota(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('year') year?: string,
  ) {
    // 연도는 진료일 기준. 안 주면 올해.
    const parsed = year ? parseInt(year, 10) : NaN;
    return this.service.getCheopyakQuota(
      req.user.id,
      id,
      Number.isFinite(parsed) ? parsed : new Date().getFullYear(),
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

  @Patch(':id/notify-consent')
  @ApiOperation({
    summary: '알림 수신 동의 기록',
    description:
      '동의 없이는 카톡·문자를 보낼 수 없다(정보통신망법 제50조). 환자가 직접 거부한 뒤에는 한의사가 다시 켤 수 없다.',
  })
  setNotifyConsent(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { consented?: boolean },
  ) {
    return this.service.setNotifyConsent(
      req.user.id,
      id,
      body?.consented !== false,
    );
  }

  @Delete(':id/track-link')
  @ApiOperation({
    summary: '추적 링크 회수',
    description:
      '링크가 즉시 열리지 않게 된다. 다시 보내면 새 토큰이 발급된다.',
  })
  revokeTrackLink(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.revokeTrackLink(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '환자 삭제' })
  async remove(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.deletePatient(req.user.id, id);
    return { deleted: true };
  }
}
