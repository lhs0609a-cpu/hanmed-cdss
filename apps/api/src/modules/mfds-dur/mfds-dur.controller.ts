import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  MfdsDurService,
  DurTypeName,
  DurProductItem,
} from './mfds-dur.service';

@ApiTags('식약처 DUR (의약품안전사용)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mfds-dur')
export class MfdsDurController {
  constructor(private readonly mfdsDurService: MfdsDurService) {}

  @Get('product')
  @ApiOperation({
    summary: '품목 단위 DUR 통합 조회',
    description:
      'item_seq 또는 item_name 으로 해당 의약품의 모든 DUR 플래그 조회. ' +
      '응답을 type_name 으로 그룹핑하여 반환.',
  })
  @ApiQuery({ name: 'item_seq', required: false })
  @ApiQuery({ name: 'item_name', required: false })
  @ApiQuery({ name: 'type_name', required: false })
  async getProductDurFlags(
    @Query('item_seq') itemSeq?: string,
    @Query('item_name') itemName?: string,
    @Query('type_name') typeName?: DurTypeName,
    @Query('limit') limit?: string,
  ) {
    const result = await this.mfdsDurService.getProductDurFlags({
      itemSeq,
      itemName,
      typeName,
      numOfRows: Math.min(100, Number(limit) || 50),
    });

    // 클라이언트 편의를 위해 type_name 별로 그룹핑
    const grouped: Record<string, DurProductItem[]> = {};
    for (const item of result.items) {
      const t = item.TYPE_NAME || '기타';
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(item);
    }

    return {
      success: true,
      data: {
        totalCount: result.totalCount,
        items: result.items,
        grouped,
        types: Object.keys(grouped),
      },
    };
  }

  @Get('ingredient/usjnt-taboo')
  @ApiOperation({ summary: '병용금기 성분 조회' })
  async getUsjntTaboo(
    @Query('item_name') itemName?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.mfdsDurService.getUsjntTaboo({
      itemName,
      numOfRows: Math.min(100, Number(limit) || 20),
    });
    return { success: true, data: result };
  }

  @Get('ingredient/pwnm-taboo')
  @ApiOperation({ summary: '임부금기 성분 조회' })
  async getPwnmTaboo(
    @Query('item_name') itemName?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.mfdsDurService.getPwnmTaboo({
      itemName,
      numOfRows: Math.min(100, Number(limit) || 20),
    });
    return { success: true, data: result };
  }

  @Get('ingredient/odsn-atent')
  @ApiOperation({ summary: '노인주의 성분 조회' })
  async getOdsnAtent(
    @Query('item_name') itemName?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.mfdsDurService.getOdsnAtent({
      itemName,
      numOfRows: Math.min(100, Number(limit) || 20),
    });
    return { success: true, data: result };
  }

  @Get('ingredient/spcify-agrde-taboo')
  @ApiOperation({ summary: '특정연령대금기 성분 조회' })
  async getSpcifyAgrdeTaboo(
    @Query('item_name') itemName?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.mfdsDurService.getSpcifyAgrdeTaboo({
      itemName,
      numOfRows: Math.min(100, Number(limit) || 20),
    });
    return { success: true, data: result };
  }
}
