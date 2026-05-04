import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formula } from '../database/entities/formula.entity';
import { Herb } from '../database/entities/herb.entity';
import { FormulaHerb } from '../database/entities/formula-herb.entity';
import { ClinicalCase } from '../database/entities/clinical-case.entity';
import { DrugHerbInteraction } from '../database/entities/drug-herb-interaction.entity';
import { SeederService } from './seeder.service';
import { FormulasSeeder } from './seeders/formulas.seeder';
import { CasesSeeder } from './seeders/cases.seeder';
import { InteractionsSeeder } from './seeders/interactions.seeder';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Formula,
      Herb,
      FormulaHerb,
      ClinicalCase,
      DrugHerbInteraction,
    ]),
  ],
  providers: [SeederService, FormulasSeeder, CasesSeeder, InteractionsSeeder],
  exports: [SeederService],
})
export class SeederModule {}
