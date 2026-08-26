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
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import {
  MedicationGuidesService,
  CreateGuideInput,
} from './medication-guides.service';

type AuthedRequest = Request & { user: { id: string } };

/** 한의사용 — 안내서 발행·조회·회수. */
@ApiTags('medication-guides')
@Controller('medication-guides')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MedicationGuidesController {
  constructor(private readonly service: MedicationGuidesService) {}

  @Get('reports/unreviewed')
  @ApiOperation({ summary: '확인하지 않은 환자 자가 기록' })
  unreviewed(@Req() req: AuthedRequest, @Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : NaN;
    return this.service.listUnreviewedReports(
      req.user.id,
      Number.isFinite(parsed) ? Math.min(parsed, 50) : 20,
    );
  }

  @Get('by-visit/:visitId')
  @ApiOperation({ summary: '진료의 안내서와 환자 자가 기록' })
  byVisit(
    @Req() req: AuthedRequest,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ) {
    return this.service.getByVisit(req.user.id, visitId);
  }

  @Post('by-visit/:visitId')
  @ApiOperation({
    summary: '안내서 발행',
    description:
      '진료 기록·처방 카탈로그·치험례·상호작용에서 환자용 안내서를 만든다. 이미 있으면 갱신한다.',
  })
  create(
    @Req() req: AuthedRequest,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() body: CreateGuideInput,
  ) {
    return this.service.createFromVisit(req.user.id, visitId, body ?? {});
  }

  @Post(':id/send')
  @ApiOperation({
    summary: '환자 카톡으로 추적 링크 보내기',
    description:
      '알림톡 우선, 실패하면 문자로 내려간다. 수신 동의가 없으면 보내지 않는다(정보통신망법 제50조).',
  })
  send(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.sendGuideLink(req.user.id, id);
  }

  @Patch(':id/reviewed')
  @ApiOperation({ summary: '환자 자가 기록 확인 처리' })
  markReviewed(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markReportsReviewed(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '안내서 회수 — 공개 링크가 더 이상 열리지 않는다' })
  revoke(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.revoke(req.user.id, id);
  }
}

/**
 * 환자용 — 인증 없이 링크로 연다.
 *
 * 로그인시키면 아무도 안 본다. 대신 토큰은 추측 불가능하게 만들고,
 * 문서에는 처음부터 식별정보를 담지 않는다.
 */
@ApiTags('medication-guides-public')
@Controller('public/guides')
export class PublicMedicationGuidesController {
  constructor(private readonly service: MedicationGuidesService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: '복약 안내서 열기' })
  get(@Param('token') token: string) {
    return this.service.getPublic(token);
  }

  @Public()
  @Get(':token/reports')
  @ApiOperation({ summary: '내가 보낸 기록 다시 보기' })
  reports(@Param('token') token: string) {
    return this.service.getPublicReports(token);
  }

  @Public()
  @Post(':token/doses/start')
  @Throttle({ long: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '복용 시작 — 오늘을 시작일로 기록' })
  startDosing(@Param('token') token: string) {
    return this.service.startDosing(token);
  }

  @Public()
  @Post(':token/doses/toggle')
  @Throttle({ long: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '오늘 복용 체크 토글 (날짜는 서버가 KST 로 정한다)' })
  toggleDose(@Param('token') token: string) {
    return this.service.toggleDoseToday(token);
  }

  @Public()
  @Post(':token/doses/import')
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: '기기에 남아 있던 복용 기록 1회 이관',
    description: '서버에 기록이 하나도 없을 때만 받는다. 최대 60일, 미래 날짜는 버린다.',
  })
  importDoses(
    @Param('token') token: string,
    @Body() body: { dates?: string[] },
  ) {
    return this.service.importDoses(token, body?.dates ?? []);
  }

  @Public()
  @Post(':token/reports')
  // 링크만 있으면 누구나 쓸 수 있는 자리라 분당 한도를 좁게 둔다.
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '복용 중 자가 기록 남기기' })
  report(
    @Param('token') token: string,
    @Body()
    body: { symptomScore?: number | null; adverseFlags?: string[]; note?: string | null },
  ) {
    return this.service.addPublicReport(token, body ?? {});
  }
}

/**
 * 환자 단위 추적 링크 — 카톡으로 보내는 것이 이 주소다.
 *
 * 안내서(진료 단위)와 달리 이 토큰은 그 환자의 처방 이력 전체를 연다.
 * 그만큼 무거우므로 한의사가 언제든 회수할 수 있고, 환자도 여기서 직접
 * 수신 거부를 할 수 있어야 한다.
 */
@ApiTags('medication-guides-public')
@Controller('public/track')
export class PublicPatientTrackController {
  constructor(private readonly service: MedicationGuidesService) {}

  @Public()
  @Get(':trackToken')
  @ApiOperation({ summary: '내 복약 현황 — 지금 먹는 약·경과·지난 처방' })
  track(@Param('trackToken') trackToken: string) {
    return this.service.getTrack(trackToken);
  }

  @Public()
  @Post(':trackToken/opt-out')
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '알림 수신 거부' })
  optOut(@Param('trackToken') trackToken: string) {
    return this.service.optOutOfNotifications(trackToken);
  }
}
