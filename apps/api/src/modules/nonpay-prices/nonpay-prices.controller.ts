import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { NonPayPricesService } from './nonpay-prices.service';

/**
 * 환자가 진료 전에 보는 화면에서 쓰므로 인증을 걸지 않는다.
 * 심평원이 이미 공개한 통계이고, 개별 한의원 정보는 다루지 않는다.
 */
@ApiTags('nonpay-prices')
@Controller('public/nonpay-prices')
export class NonPayPricesController {
  constructor(private readonly service: NonPayPricesService) {}

  @Public()
  @Get('regions')
  @ApiOperation({ summary: '지역 목록' })
  regions() {
    return this.service.listRegions();
  }

  @Public()
  @Get('korean-medicine')
  @ApiOperation({
    summary: '한방 비급여 항목의 지역별 가격 (최저·중간·평균·최고)',
    description:
      '건강보험심사평가원 비급여진료비정보서비스의 지역별 통계. 개별 의료기관 정보는 제공하지 않는다.',
  })
  koreanMedicine(@Query('region') region?: string) {
    return this.service.getKoreanMedicinePrices(region || 'All');
  }
}
