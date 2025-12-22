import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormulasController } from './formulas.controller';
import { FormulasService } from './formulas.service';
import { Formula, FormulaHerb, Herb } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Formula, FormulaHerb, Herb])],
  controllers: [FormulasController],
  providers: [FormulasService],
  exports: [FormulasService],
})
export class FormulasModule {}
