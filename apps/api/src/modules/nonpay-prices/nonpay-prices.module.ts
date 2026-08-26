import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NonPayPricesService } from './nonpay-prices.service';
import { NonPayPricesSyncService } from './nonpay-prices-sync.service';
import { NonPayPricesController } from './nonpay-prices.controller';
import { NonPayPrice } from '../../database/entities/nonpay-price.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NonPayPrice])],
  controllers: [NonPayPricesController],
  providers: [NonPayPricesService, NonPayPricesSyncService],
  exports: [NonPayPricesService],
})
export class NonPayPricesModule {}
