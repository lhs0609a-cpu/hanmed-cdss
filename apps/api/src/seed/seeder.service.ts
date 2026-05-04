import { Injectable, Logger } from '@nestjs/common';
import { FormulasSeeder } from './seeders/formulas.seeder';
import { CasesSeeder } from './seeders/cases.seeder';
import { InteractionsSeeder } from './seeders/interactions.seeder';

export type SeedTarget = 'all' | 'formulas' | 'herbs' | 'cases' | 'interactions';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly formulasSeeder: FormulasSeeder,
    private readonly casesSeeder: CasesSeeder,
    private readonly interactionsSeeder: InteractionsSeeder,
  ) {}

  async run(target: SeedTarget) {
    // 의존성 순서: herbs는 formulas 안에서 함께 처리됨 (formula_herbs를 위해 동시 생성).
    // interactions는 herbs 이후, cases는 마지막(가장 큰 작업).
    if (target === 'all' || target === 'formulas' || target === 'herbs') {
      this.logger.log('━━━ formulas + herbs_master + formula_herbs ━━━');
      await this.formulasSeeder.run();
    }

    if (target === 'all' || target === 'interactions') {
      this.logger.log('━━━ drug_herb_interactions (curated) ━━━');
      await this.interactionsSeeder.run();
    }

    if (target === 'all' || target === 'cases') {
      this.logger.log('━━━ clinical_cases ━━━');
      await this.casesSeeder.run();
    }
  }
}
