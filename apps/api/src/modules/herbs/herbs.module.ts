import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HerbsController } from './herbs.controller';
import { HerbsService } from './herbs.service';
import { Herb, HerbCompound, FormulaHerb, Formula } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Herb, HerbCompound, FormulaHerb, Formula])],
  controllers: [HerbsController],
  providers: [HerbsService],
  exports: [HerbsService],
})
export class HerbsModule {}
