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
