import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublicDataController } from './public-data.controller';
import { PublicDataService } from './public-data.service';

@Module({
  imports: [ConfigModule],
  controllers: [PublicDataController],
  providers: [PublicDataService],
})
export class PublicDataModule {}
