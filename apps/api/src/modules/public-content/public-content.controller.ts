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

  @Get('herbs')
  @Public()
  @ApiOperation({ summary: '공개 본초 목록 (티저)' })
  listHerbs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    return this.content.listHerbs(toInt(page, 1), toInt(limit, 20), category);
  }

  @Get('herb-categories')
  @Public()
  @ApiOperation({ summary: '본초 분류와 수' })
  herbCategories() {
    return this.content.herbCategories();
  }

  @Get('herbs/:slug')
  @Public()
  @ApiOperation({ summary: '공개 본초 한 건 (티저)' })
  getHerb(@Param('slug') slug: string) {
    return this.content.getHerb(slug);
  }

  @Get('references')
  @Public()
  @ApiOperation({ summary: '공개 문헌 목록 (티저)' })
  listReferences(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('source') source?: string,
    @Query('category') category?: string,
    @Query('evidenceType') evidenceType?: string,
    @Query('journal') journal?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.content.listReferences(toInt(page, 1), toInt(limit, 20), {
      source,
      category,
      evidenceType,
      journal,
      keyword,
    });
  }

  @Get('reference-keywords')
  @Public()
  @ApiOperation({ summary: '주제별 문헌 수 — 검색어 허브의 목록' })
  referenceKeywords() {
    return this.content.referenceKeywords();
  }

  /**
   * 한국어 주제 허브. 영문 주제(reference-keywords)와 나란히 산다.
   *
   * 나눠 두는 이유 — 세는 법이 다르다. 영문은 논문에 붙은 keywords 배열을
   * 보고, 한국어는 통제 어휘가 제목에 있는지 본다. 한 오퍼레이션에 섞으면
   * 어느 쪽 규칙으로 세어진 수인지 부르는 쪽이 알 수 없다.
   */
  @Get('korean-topics')
  @Public()
  @ApiOperation({ summary: '한국어 주제별 문헌 수 — 통제 어휘 허브의 목록' })
  koreanTopics() {
    return this.content.koreanTopics();
  }

  @Get('reference-journals')
  @Public()
  @ApiOperation({ summary: '학술지별 문헌 수 — 검색어 허브의 목록' })
  referenceJournals() {
    return this.content.referenceJournals();
  }

  @Get('references/:slug')
  @Public()
  @ApiOperation({ summary: '공개 문헌 한 건 (티저)' })
  getReference(@Param('slug') slug: string) {
    return this.content.getReference(slug);
  }

  /**
   * 한의과 상병 분류 목록(세 글자). 세부 13,720건은 여기 싣지 않는다 —
   * 한 목록에 쏟으면 읽을 것이 없고, 세부는 제 분류 쪽에서 본다.
   */
  @Get('sick-codes')
  @Public()
  @ApiOperation({ summary: '한의과 상병 분류 목록' })
  sickCodes() {
    return this.content.sickCodeCategories();
  }

  @Get('sick-codes/:code')
  @Public()
  @ApiOperation({ summary: '상병 한 건 — 분류 안의 자리와 관련 문헌' })
  getSickCode(@Param('code') code: string) {
    return this.content.getSickCode(code);
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
