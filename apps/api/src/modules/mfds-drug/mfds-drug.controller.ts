import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MfdsDrugService } from './mfds-drug.service';

@ApiTags('식약처 의약품 허가정보')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mfds-drug')
export class MfdsDrugController {
  constructor(private readonly mfdsDrugService: MfdsDrugService) {}

  @Get('search')
  @ApiOperation({
    summary: '의약품 제품 허가 목록 검색',
    description: '제품명/주성분명/제조사 등으로 식약처 허가받은 의약품 목록 조회',
  })
  @ApiQuery({ name: 'item_name', required: false, description: '제품명 (부분 일치)' })
  @ApiQuery({ name: 'entp_name', required: false, description: '제조사명' })
  @ApiQuery({ name: 'item_ingr_name', required: false, description: '주성분명' })
  @ApiQuery({ name: 'permit_kind_name', required: false, description: '허가종류 (신고/허가)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchProducts(
    @Query('item_name') itemName?: string,
    @Query('entp_name') entpName?: string,
    @Query('item_ingr_name') itemIngrName?: string,
    @Query('permit_kind_name') permitKindName?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.mfdsDrugService.searchProducts({
      itemName,
      entpName,
      itemIngrName,
      permitKindName,
      pageNo: Number(page) || 1,
      numOfRows: Math.min(100, Number(limit) || 20),
    });
    return { success: true, data: result };
  }

  @Get('detail')
  @ApiOperation({
    summary: '의약품 제품 허가 상세 정보',
    description:
      '효능효과/용법용량/사용상 주의사항/성상/저장방법/유효기간 등 상세 정보',
  })
  @ApiQuery({ name: 'item_seq', required: false, description: '제품 일련번호 (item_name과 둘 중 하나 필수)' })
  @ApiQuery({ name: 'item_name', required: false, description: '제품명 (부분 일치)' })
  async getProductDetail(
    @Query('item_seq') itemSeq?: string,
    @Query('item_name') itemName?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.mfdsDrugService.getProductDetail({
      itemSeq,
      itemName,
      numOfRows: Math.min(20, Number(limit) || 5),
    });
    return { success: true, data: result };
  }

  @Get(':itemSeq/component')
  @ApiOperation({
    summary: '의약품 제품 주성분 상세',
    description: '제품의 주성분 분량/단위/규격 정보',
  })
  @ApiParam({ name: 'itemSeq', description: '제품 일련번호' })
  async getMainComponent(@Param('itemSeq') itemSeq: string) {
    const result = await this.mfdsDrugService.getMainComponentDetail({
      itemSeq,
      numOfRows: 50,
    });
    return { success: true, data: result };
  }
}
