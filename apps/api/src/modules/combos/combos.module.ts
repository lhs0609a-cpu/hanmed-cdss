import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CombosController } from './combos.controller';
import { CombosService } from './combos.service';
import { Formula, FormulaHerb, FormulaCombo } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Formula, FormulaHerb, FormulaCombo])],
  controllers: [CombosController],
  providers: [CombosService],
  exports: [CombosService],
})
export class CombosModule {}
