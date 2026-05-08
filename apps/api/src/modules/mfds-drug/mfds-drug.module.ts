import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MfdsDrugService } from './mfds-drug.service';
import { MfdsDrugController } from './mfds-drug.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [MfdsDrugController],
  providers: [MfdsDrugService],
  exports: [MfdsDrugService],
})
export class MfdsDrugModule {}
