import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CasesService } from './cases.service';
import { CaseAccessService } from './case-access.service';
import { CaseAccessAction } from '../../database/entities/case-access-log.entity';
import { toTeaserCase, toFullCase, buildWatermarkLabel } from './case-content';
import {
  clampListPaging,
  isBeyondFreeWindow,
  browseAccess,
  CaseBrowsePaywallException,
  CASE_BROWSE_FREE_PAGES,
  CASE_LIST_PAGE_SIZE_MAX,
} from './case-browse';
import { SubscriptionTier } from '../../database/entities/user.entity';
import { FeatureKey, tierHasFeature } from '../../database/entities/plan-features';

/** 요청에서 열람 로그에 남길 접속 정보를 뽑는다 */
function accessContext(req: any) {
  const fwd = req?.headers?.['x-forwarded-for'];
  const ip =
    (typeof fwd === 'string' ? fwd.split(',')[0].trim() : null) ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    null;
  return {
    ipAddress: ip,
    userAgent: req?.headers?.['user-agent'] || null,
    sessionId: req?.headers?.['x-session-id'] || null,
  };
}

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly caseAccessService: CaseAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '치험례 목록 조회',
    description:
      `무료 회원은 앞 ${CASE_BROWSE_FREE_PAGES}페이지까지만 넘길 수 있고, 그 너머는 402 로 거절된다.` +
      ' 총 건수·총 페이지 수는 티어와 무관하게 사실대로 준다 — 얼마나 있는지는 보여주고' +
      ' 넘기는 것만 잠근다. 검색·필터는 모든 티어에서 열려 있다.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: `최대 ${CASE_LIST_PAGE_SIZE_MAX}. 넘겨도 잘린다.`,
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'searchField', required: false, type: String })
  @ApiQuery({ name: 'constitution', required: false, type: String })
  @ApiQuery({ name: 'outcome', required: false, type: String })
  async findAll(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('searchField') searchField?: string,
    @Query('constitution') constitution?: string,
    @Query('outcome') outcome?: string,
  ) {
    const tier: SubscriptionTier = req.user?.subscriptionTier ?? SubscriptionTier.FREE;

    // 페이지 크기를 먼저 조인다. 이걸 빼먹으면 limit=10000 한 번으로 벽을 넘어간다 —
    // 무료 한도를 페이지 번호가 아니라 "몇 번째 건"으로 잡는 이유도 같다.
    const { page: safePage, limit: safeLimit } = clampListPaging(page, limit);

    // 벽 너머는 쿼리를 돌리기 전에 끊는다. 데이터를 뽑아 놓고 지우는 방식은
    // 언젠가 한 군데서 새게 되어 있다.
    if (isBeyondFreeWindow(tier, safePage, safeLimit)) {
      throw new CaseBrowsePaywallException();
    }

    const raw = await this.casesService.findAll(safePage, safeLimit, {
      search,
      searchField,
      constitution,
      outcome,
    });

    // 목록에는 미끼 필드만 담는다. 원문·변증추론·경과는 여기서 절대 나가지 않는다 —
    // 예전에는 originalText 를 그대로 실어 보내서, 계정 하나로 페이지네이션만 돌리면
    // 6,000건 전문을 통째로 긁어갈 수 있었다. 본문은 GET /cases/:id/full 전용이다.
    const data = (raw.data || []).map((c: any) => toTeaserCase(c));

    return {
      data,
      meta: {
        ...raw.meta,
        // 프론트가 벽에 부딪히기 전에 그릴 수 있게 미리 알려 준다.
        // 실패한 요청으로 벽을 알게 하면 그건 버그처럼 보인다.
        access: browseAccess(tier, safePage, safeLimit),
      },
    };
  }

  @Get('statistics')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '치험례 통계 조회' })
  async getStatistics() {
    return this.casesService.getStatistics();
  }

  // 주의: 아래 :id 라우트보다 반드시 위에 있어야 한다.
  // 밑에 두면 'evidence' 가 :id 로 잡혀 uuid 파싱 오류(500)가 난다.
  @Get('evidence')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '처방/변증별 치험례 근거',
    description:
      '처방명 또는 변증명으로 실제 치험례를 모아 건수·경과 분포·성공률과 대표 사례를 돌려준다.' +
      ' 처방 상세, 변증 도우미, 약재 상세 등 어느 화면에서든 같은 근거를 붙이는 데 쓴다.',
  })
  async getEvidence(
    @Query('kind') kind: 'formula' | 'pattern' | 'herb',
    @Query('name') name: string,
    @Query('limit') limit?: string,
  ) {
    return this.casesService.getCaseEvidence({
      kind: kind === 'pattern' || kind === 'herb' ? kind : 'formula',
      name,
      limit: limit ? parseInt(limit, 10) : 5,
    });
  }


  @Get('evidence-counts')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '처방/변증별 치험례 건수 일괄 조회',
    description: '목록 화면에서 카드마다 개별 호출하지 않도록 이름 여러 개의 건수를 한 번에 준다.',
  })
  async getEvidenceCounts(
    @Query('kind') kind: 'formula' | 'pattern' | 'herb',
    @Query('names') names: string,
  ) {
    return this.casesService.getCaseCounts({
      kind: kind === 'pattern' || kind === 'herb' ? kind : 'formula',
      names: (names || '').split(',').map((n) => n.trim()).filter(Boolean),
    });
  }

  @Get('daily')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '오늘의 치험례 (미끼 필드만)',
    description:
      '날짜 시드로 코퍼스 전체에서 몇 건을 뽑는다. 목록 유료화의 예외다 —' +
      ' 하루 다섯 건은 수집 경로가 아니고, 무료 회원에게 코퍼스 깊은 곳을' +
      ' 보여주는 것이 유료로 넘어갈 이유가 된다.' +
      ' 시드는 서버가 날짜로 만든다(클라이언트가 시드를 고르면 그대로 우회로가 된다).',
  })
  @ApiQuery({ name: 'count', required: false, type: Number })
  async findDaily(@Query('count') count = 5) {
    // 하루치 표본이지 목록이 아니다. 상한을 낮게 둔다.
    const n = Math.min(Math.max(Math.floor(Number(count)) || 5, 1), 10);
    const rows = await this.casesService.findDailySample(n);
    return { data: rows.map((c: any) => toTeaserCase(c)) };
  }

  @Get('access/remaining')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '치험례 본문 열람 잔여 수',
    description: '프론트가 "이번 시간 3건 남음" 을 미리 안내하는 데 쓴다.',
  })
  async getAccessRemaining(@Req() req: any) {
    return this.caseAccessService.getRemaining(req.user.id);
  }

  @Post('copy-attempt')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '복사·인쇄·캡처 시도 신고',
    description:
      '클라이언트가 복사/인쇄/우클릭/개발자도구 시도를 감지하면 여기로 보낸다.' +
      ' 막는 것이 목적이 아니라(어차피 우회 가능) 고의성을 기록으로 남기는 것이 목적이다.',
  })
  async reportCopyAttempt(
    @Req() req: any,
    @Body() body: { caseId?: string; kind?: string },
  ) {
    await this.caseAccessService.record(
      req.user.id,
      body?.caseId || null,
      CaseAccessAction.COPY_ATTEMPT,
      accessContext(req),
      null,
      { kind: body?.kind || 'unknown' },
    );
    return { recorded: true };
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '치험례 상세 조회 (미끼 필드만)',
    description:
      '원문·변증추론·경과는 포함되지 않는다. 본문은 GET /cases/:id/full 로만 나간다.',
  })
  async findOne(@Param('id') id: string) {
    const found = await this.casesService.findById(id);
    if (!found) throw new NotFoundException('치험례를 찾을 수 없습니다.');
    // 엔티티를 그대로 돌려주면 원문은 물론 임베딩 벡터(1536개 float)까지 나간다.
    return toTeaserCase(found);
  }

  @Get(':id/full')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '치험례 본문 열람',
    description:
      '원문 전문과 변증 추론·경과를 반환한다. 속도제한과 이상탐지를 거치고,' +
      ' 전건이 case_access_logs 에 기록되며, 본문에는 열람자를 식별하는' +
      ' 제로폭 워터마크가 삽입된다. 화면에 띄울 가시 워터마크 문구도 함께 준다.',
  })
  async findOneFull(@Param('id') id: string, @Req() req: any) {
    const found = await this.casesService.findById(id);
    if (!found) throw new NotFoundException('치험례를 찾을 수 없습니다.');

    // 로그를 먼저 남긴다 — 그 로그 id 가 워터마크 traceId 가 되어야
    // 유출본에서 열람자를 역추적할 수 있다.
    const { traceId, user } = await this.caseAccessService.authorizeAndLog(
      req.user.id,
      id,
      accessContext(req),
    );

    return toFullCase(found, {
      label: buildWatermarkLabel(user),
      issuedAt: new Date().toISOString(),
      traceId,
    });
  }


  @Post('search')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '(legacy) 증상 기반 단순 검색' })
  async searchByStructured(
    @Body()
    searchDto: {
      // 프론트는 증상을 문자열 배열로도, {name} 객체 배열로도 보낸다.
      symptoms: Array<string | { name?: string }>;
      chiefComplaint?: string;
      diagnosis?: string;
      constitution?: string;
      topK?: number;
    },
    @Req() req?: any,
  ) {
    // 예전에는 symptoms 를 그대로 join 해서 객체가 오면 쿼리가
    // "[object Object] [object Object]" 가 됐다 — 검색이 항상 헛돌았다.
    // 주소증·변증도 함께 넣어야 유사도가 의미를 갖는다.
    const symptomNames = (searchDto.symptoms || [])
      .map((s) => (typeof s === 'string' ? s : s?.name))
      .filter((s): s is string => !!s && s.trim().length > 0);

    const query = [searchDto.chiefComplaint, ...symptomNames, searchDto.diagnosis]
      .filter((v): v is string => !!v && v.trim().length > 0)
      .join(' ');
    return this.casesService.searchSimilar({
      query,
      topK: this.searchTopK(req, searchDto.topK),
      constitution: searchDto.constitution,
    });
  }

  @Post('similar-success-stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '유사 치험례 성공률 통계',
    description:
      '주소증·증상으로 유사 치험례를 모아 치료 결과 분포와 성공률(완치+호전), 상위 처방을 집계한다.' +
      ' 진료 결과 화면의 "유사 환자 통계" 카드가 사용한다.',
  })
  async getSimilarSuccessStats(
    @Body()
    body: {
      chiefComplaint: string;
      symptoms?: Array<{ name: string; severity?: number }>;
      diagnosis?: string;
      constitution?: string;
    },
  ) {
    return this.casesService.getSimilarSuccessStats(body);
  }

  @Post('search-similar')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'AI 유사도 기반 치험례 검색',
    description:
      '쿼리 텍스트를 OpenAI text-embedding-3-small (1536d) 로 임베딩한 뒤,' +
      ' 모든 치험례 임베딩과 코사인 유사도를 계산해 매칭 % 와 함께 상위 N건 반환.' +
      ` 무료 회원은 한 번에 ${CASE_LIST_PAGE_SIZE_MAX}건까지 받는다 — 검색 자체는 무제한이다.`,
  })
  async searchSimilar(
    @Req() req: any,
    @Body()
    body: {
      query: string;
      topK?: number;
      threshold?: number;
      constitution?: string;
      outcome?: string;
    },
  ) {
    return this.casesService.searchSimilar({
      ...body,
      topK: this.searchTopK(req, body?.topK),
    });
  }

  /**
   * 검색 결과 건수 상한.
   *
   * 검색 횟수는 티어와 무관하게 무제한이다 — 찾으러 온 한의사를 막으면 제품이 죽는다.
   * 다만 한 번에 받는 건수는 조인다. 목록을 60건으로 잠가 놓고 검색 한 방에 50건씩
   * 내주면, 검색어만 바꿔 가며 목록 유료화를 우회하는 길이 열린다.
   * 한 화면에서 읽는 양(20건)은 임상에서 충분하다.
   */
  private searchTopK(req: any, requested?: number): number {
    const tier: SubscriptionTier = req?.user?.subscriptionTier ?? SubscriptionTier.FREE;
    const cap = tierHasFeature(tier, FeatureKey.CASE_BROWSE_UNLIMITED)
      ? 50
      : CASE_LIST_PAGE_SIZE_MAX;
    const n = Math.floor(Number(requested));
    return Number.isFinite(n) && n >= 1 ? Math.min(n, cap) : Math.min(10, cap);
  }
}
