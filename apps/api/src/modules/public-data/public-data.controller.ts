import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PublicDataService } from './public-data.service';

@ApiTags('public-data')
@Controller('public-data')
export class PublicDataController {
  constructor(private readonly publicDataService: PublicDataService) {}

  /**
   * data.go.kr 프록시 — 서버 키로 gov API 를 대신 호출하고 원본 응답을 통과시킨다.
   * 예: GET /api/v1/public-data?endpoint=DRUG_INFO&itemName=타이레놀&type=json
   */
  @Get()
  @Public()
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: '공공데이터포털 프록시 (서버 키 주입)' })
  async proxy(
    @Query('endpoint') endpoint: string,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.publicDataService.proxy(endpoint, query);
    res.status(result.status).type(result.contentType).send(result.body);
  }
}
