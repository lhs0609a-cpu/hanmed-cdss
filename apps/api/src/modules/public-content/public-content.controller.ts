import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PublicContentService } from './public-content.service';

/**
 * 로그인 전에 읽히는 콘텐츠.
 *
 * 검색으로 들어온 사람에게 보여줄 조각만 돌려준다. 크롤러와 사람에게 같은
 * 것을 준다 — 크롤러에만 전문을 주면 클로킹이라 색인에서 빠진다.
 *
 * 인증이 없으므로 무엇이 실려 나가는지는 서비스의 select 가 정한다.
 */
@ApiTags('public')
@Controller('public')
export class PublicContentController {
  constructor(private readonly content: PublicContentService) {}

  @Get('books')
  @Public()
  @ApiOperation({ summary: '공개 고전 의안 목록' })
  books() {
    return this.content.books();
  }

  @Get('cases')
  @Public()
  @ApiOperation({ summary: '공개 치험례 목록 (티저)' })
  listCases(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('book') book?: string,
  ) {
    return this.content.listCases(toInt(page, 1), toInt(limit, 20), book);
  }

  @Get('cases/:slug')
  @Public()
  @ApiOperation({ summary: '공개 치험례 한 건 (티저)' })
  getCase(@Param('slug') slug: string) {
    return this.content.getCase(slug);
  }

  @Get('formulas')
  @Public()
  @ApiOperation({ summary: '공개 처방 목록 (티저)' })
  listFormulas(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.content.listFormulas(toInt(page, 1), toInt(limit, 20));
  }

  @Get('formulas/:slug')
  @Public()
  @ApiOperation({ summary: '공개 처방 한 건 (티저)' })
  getFormula(@Param('slug') slug: string) {
    return this.content.getFormula(slug);
  }

  @Get('sitemap-entries')
  @Public()
  @ApiOperation({ summary: '사이트맵이 쓰는 주소와 갱신 시점' })
  sitemapEntries() {
    return this.content.sitemapEntries();
  }
}

/** 쿼리스트링은 무엇이든 올 수 있다. 숫자가 아니면 기본값으로 돌린다. */
function toInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
