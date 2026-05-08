import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MfdsDurService } from './mfds-dur.service';
import { MfdsDurController } from './mfds-dur.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [MfdsDurController],
  providers: [MfdsDurService],
  exports: [MfdsDurService],
})
export class MfdsDurModule {}
