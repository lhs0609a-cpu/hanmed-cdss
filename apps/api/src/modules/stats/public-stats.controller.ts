import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PublicStatsService } from './public-stats.service';

/**
 * 홈페이지가 읽는 자산 수.
 *
 * 로그인 전 랜딩에서 부르므로 공개 엔드포인트다. 담긴 것은 전부
 * COUNT(*) 결과라 개인정보가 없고, 어차피 화면에 그대로 찍힌다.
 */
@ApiTags('stats')
@Controller('stats')
export class PublicStatsController {
  constructor(private readonly publicStats: PublicStatsService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: '홈페이지 지표 — 치험례·문헌·약재·처방 실측' })
  async getPublicStats() {
    return this.publicStats.getStats();
  }
}
