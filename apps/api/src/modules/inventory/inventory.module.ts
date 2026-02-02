import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  HerbSupplier,
  HerbInventory,
  HerbInventoryTransaction,
  HerbPriceHistory,
  HerbInventoryAlert,
  HerbPurchaseOrder,
} from '../../database/entities/herb-inventory.entity';
import { Herb } from '../../database/entities/herb.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HerbSupplier,
      HerbInventory,
      HerbInventoryTransaction,
      HerbPriceHistory,
      HerbInventoryAlert,
      HerbPurchaseOrder,
      Herb,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
