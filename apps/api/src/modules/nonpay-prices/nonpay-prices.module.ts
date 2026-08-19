import { Module } from '@nestjs/common';
import { NonPayPricesService } from './nonpay-prices.service';
import { NonPayPricesController } from './nonpay-prices.controller';

@Module({
  controllers: [NonPayPricesController],
  providers: [NonPayPricesService],
  exports: [NonPayPricesService],
})
export class NonPayPricesModule {}
