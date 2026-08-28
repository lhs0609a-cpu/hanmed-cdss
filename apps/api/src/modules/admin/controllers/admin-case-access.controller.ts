import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../database/entities/enums';
import { CaseAccessService } from '../../cases/case-access.service';
import { CaseAccessAction } from '../../../database/entities/case-access-log.entity';
import { extractZeroWidthWatermark } from '../../cases/case-content';

/**
 * 치험례 유출 대응 창구 (관리자).
 *
 * 워터마크는 심어 두기만 해서는 아무것도 하지 않는다. 유출본이 돌아다닐 때
 * 붙여넣고 열람자를 뽑아낼 자리가 있어야 비로소 억지력이 된다. 여기가 그 자리다.
 *
 * 잠금 해제도 여기 둔다 — 이상탐지는 오탐을 낸다. 사용자에게 "고객센터로
 * 문의하라"고 안내해 놓고 문의를 받은 쪽에 풀어 줄 수단이 없으면 안내가 거짓말이 된다.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/case-access')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminCaseAccessController {
  constructor(private readonly caseAccessService: CaseAccessService) {}

  @Post('trace')
  @ApiOperation({
    summary: '유출본 텍스트로 열람자 역추적',
    description:
      '유출된 치험례 원문을 그대로 붙여넣으면 제로폭 워터마크를 복원해 열람 기록을 찾는다.' +
      ' 워터마크는 32비트라 충돌 가능성이 있어 단정하지 않고 후보 목록을 돌려준다 —' +
      ' 열람 시각·IP·치험례 id 를 맞춰 보고 사람이 판단한다.',
  })
  async trace(@Body() body: { text?: string }) {
    const text = body?.text || '';
    if (!text.trim()) {
      throw new BadRequestException('유출본 텍스트를 넣어 주세요.');
    }

    const traceHex = extractZeroWidthWatermark(text);
    if (!traceHex) {
      // 워터마크가 없다 = 우리 서버를 거치지 않았거나, 제로폭 문자가 지워진 사본이다.
      // (메신저·게시판 일부는 붙여넣기 단계에서 제로폭 문자를 걸러 낸다)
      return {
        found: false,
        traceHex: null,
        candidates: [],
        message:
          '워터마크를 찾지 못했습니다. 제로폭 문자가 제거된 사본이거나, 화면을 보고 옮겨 적은 텍스트일 수 있습니다.',
      };
    }

    const candidates = await this.caseAccessService.traceLeak(traceHex);
    return { found: candidates.length > 0, traceHex, candidates };
  }

  @Get('logs')
  @ApiOperation({
    summary: '치험례 열람 로그 조회',
    description: '이상 열람 신고가 들어왔을 때 사용자·치험례·행위별로 훑어본다.',
  })
  async logs(
    @Query('userId') userId?: string,
    @Query('caseId') caseId?: string,
    @Query('action') action?: CaseAccessAction,
    @Query('limit') limit?: string,
  ) {
    return this.caseAccessService.recentLogs({
      userId,
      caseId,
      action,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('users/:userId/remaining')
  @ApiOperation({ summary: '해당 사용자의 남은 열람 수' })
  async remaining(@Param('userId') userId: string) {
    return this.caseAccessService.getRemaining(userId);
  }

  @Post('users/:userId/lock')
  @ApiOperation({
    summary: '치험례 열람 수동 잠금',
    description: '유출 정황이 확인된 계정을 사람이 직접 잠근다.',
  })
  async lock(@Param('userId') userId: string, @Body() body: { reason?: string }) {
    await this.caseAccessService.lockUser(userId, body?.reason || 'manual');
    return { userId, locked: true };
  }

  @Delete('users/:userId/lock')
  @ApiOperation({
    summary: '치험례 열람 잠금 해제',
    description: '이상탐지 오탐을 푼다. 잠금 안내가 고객센터를 가리키므로 반드시 필요하다.',
  })
  async unlock(@Param('userId') userId: string) {
    return this.caseAccessService.unlockUser(userId);
  }
}
