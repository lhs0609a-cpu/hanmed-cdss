import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/enums';
import { ReferencesService } from './references.service';
import { ReferenceIngestService } from './reference-ingest.service';
import {
  ReferenceCategory,
  ReferenceEvidenceType,
  ReferenceSource,
} from '../../database/entities/reference.entity';

/**
 * 문헌 자료실.
 *
 * 치험례와 달리 잠그지 않는다. 여기 있는 것은 전부 공개된 문헌이고 원문 링크도
 * 같이 준다 — 우리가 가진 값어치는 원문 자체가 아니라 한의사에게 맞게 모으고
 * 분류하고 검색되게 해 둔 것이다. 그걸 잠그면 쓰지 않는다.
 */
@ApiTags('references')
@Controller('references')
export class ReferencesController {
  constructor(
    private readonly references: ReferencesService,
    private readonly ingest: ReferenceIngestService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '문헌 검색·목록' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ReferenceCategory })
  @ApiQuery({ name: 'evidenceType', required: false, enum: ReferenceEvidenceType })
  @ApiQuery({ name: 'source', required: false, enum: ReferenceSource })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'yearFrom', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['recent', 'evidence'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('search') search?: string,
    @Query('category') category?: ReferenceCategory,
    @Query('evidenceType') evidenceType?: ReferenceEvidenceType,
    @Query('source') source?: ReferenceSource,
    @Query('language') language?: string,
    @Query('yearFrom') yearFrom?: string,
    @Query('sort') sort?: 'recent' | 'evidence',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.references.search({
      search,
      category,
      evidenceType,
      source,
      language,
      yearFrom: yearFrom ? parseInt(yearFrom, 10) || undefined : undefined,
      sort,
      page: page ? parseInt(page, 10) || 1 : 1,
      limit: limit ? parseInt(limit, 10) || 20 : 20,
    });
  }

  @Get('facets')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '분류별 건수 — 화면 상단 요약용' })
  async facets() {
    return this.references.facets();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '문헌 상세 (초록 원문 포함)' })
  async findOne(@Param('id') id: string) {
    const found = await this.references.findById(id);
    if (!found) throw new NotFoundException('문헌을 찾을 수 없습니다.');
    return found;
  }
}

/**
 * 수집 운영 창구 (관리자).
 *
 * 초기 적재는 크론이 아니라 여기서 여러 번 돌린다 — 수 시간짜리 작업을 크론에
 * 맡기면 배포할 때마다 처음부터 다시 돈다.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/references')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CONTENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminReferencesController {
  constructor(private readonly ingest: ReferenceIngestService) {}

  @Get('stats')
  @ApiOperation({
    summary: '적재 현황',
    description: '"문헌 1만 건" 이 사실인지 확인하는 창구다. 출처·분류·근거수준별 분포.',
  })
  async stats() {
    return this.ingest.stats();
  }

  @Post('harvest')
  @ApiOperation({
    summary: 'PubMed 수집 실행',
    description:
      '주제별로 perTopic 건씩 받아 저장한다. 주제가 7개라 perTopic=400 이면 한 번에' +
      ' 최대 2,800건이다. 상류 속도제한(키 없이 초당 3회) 때문에 수십 분이 걸리므로' +
      ' 여러 번 나눠 돌려 쌓는다. 이미 있는 것은 갱신되고 중복으로 쌓이지 않는다.',
  })
  async harvest(@Body() body: { perTopic?: number; minYear?: number }) {
    const perTopic = Math.min(Math.max(Number(body?.perTopic) || 200, 1), 2000);
    const minYear =
      Number(body?.minYear) || new Date().getFullYear() - 10;
    try {
      return await this.ingest.harvestNow(perTopic, minYear);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}
