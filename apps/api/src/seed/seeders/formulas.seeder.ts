import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Formula } from '../../database/entities/formula.entity';
import { Herb } from '../../database/entities/herb.entity';
import { FormulaHerb } from '../../database/entities/formula-herb.entity';

interface JsonFormula {
  id: string;
  name: string;
  hanja?: string;
  code?: string;
  category: string;
  categoryLabel?: string;
  source?: string;
  composition?: Array<{
    herb: string;
    amount?: string;
    processing?: string | null;
  }>;
  indicationText?: string;
  indications?: string[];
  description?: string;
  dataSource?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  etc: '기타',
  해표: '해표제',
  청열: '청열제',
  보익: '보익제',
  이기: '이기제',
  화담: '화담제',
  이수: '이수제',
  온리: '온리제',
  소도: '소도제',
  고섭: '고섭제',
};

const DATA_SEARCH_PATHS = [
  // 워크스페이스 루트 기준 (로컬 실행)
  path.resolve(__dirname, '../../../../web/public/data/formulas/all-formulas.json'),
  // dist 빌드 기준
  path.resolve(__dirname, '../../../../../web/public/data/formulas/all-formulas.json'),
  // 절대 fallback
  path.resolve(
    process.cwd(),
    '..',
    'web',
    'public',
    'data',
    'formulas',
    'all-formulas.json',
  ),
  path.resolve(process.cwd(), 'data/all-formulas.json'),
];

@Injectable()
export class FormulasSeeder {
  private readonly logger = new Logger(FormulasSeeder.name);

  constructor(
    @InjectRepository(Formula) private formulasRepo: Repository<Formula>,
    @InjectRepository(Herb) private herbsRepo: Repository<Herb>,
    @InjectRepository(FormulaHerb) private formulaHerbsRepo: Repository<FormulaHerb>,
  ) {}

  async run() {
    const data = this.loadJson();
    this.logger.log(`처방 데이터 로드: ${data.length}개`);

    // 1. 약재 unique 추출 → herbs_master 시드
    const uniqueHerbNames = this.extractUniqueHerbs(data);
    this.logger.log(`unique 약재: ${uniqueHerbNames.length}종`);

    const herbIdByName = await this.upsertHerbs(uniqueHerbNames);

    // 2. formulas + formula_herbs 시드
    let inserted = 0;
    let skipped = 0;
    const total = data.length;

    for (let i = 0; i < total; i++) {
      const json = data[i];
      const result = await this.upsertFormula(json, herbIdByName);
      if (result === 'inserted') inserted++;
      else skipped++;

      if ((i + 1) % 200 === 0 || i === total - 1) {
        this.logger.log(`진행: ${i + 1}/${total} (insert=${inserted}, skip=${skipped})`);
      }
    }

    this.logger.log(`✅ formulas 시드 완료: insert=${inserted}, skip=${skipped}`);
  }

  private loadJson(): JsonFormula[] {
    for (const p of DATA_SEARCH_PATHS) {
      if (fs.existsSync(p)) {
        this.logger.log(`데이터 경로: ${p}`);
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw);
      }
    }
    throw new Error(
      `all-formulas.json을 찾을 수 없습니다. 검색 경로:\n${DATA_SEARCH_PATHS.join('\n')}`,
    );
  }

  /** 처방 composition에서 unique 약재명을 뽑는다. "각[수량]" 같은 잡음 제거. */
  private extractUniqueHerbs(data: JsonFormula[]): string[] {
    const set = new Set<string>();
    for (const f of data) {
      for (const c of f.composition || []) {
        const name = this.normalizeHerbName(c.herb);
        if (name) set.add(name);
      }
    }
    return Array.from(set).sort();
  }

  private normalizeHerbName(raw: string | undefined): string {
    if (!raw) return '';
    return raw
      .replace(/各[\d\w]+/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  /** name 기준 idempotent upsert. 반환값: 약재명 → herbId 맵 */
  private async upsertHerbs(names: string[]): Promise<Map<string, string>> {
    if (names.length === 0) return new Map();

    // 이미 있는 것 먼저 조회
    const existing = await this.herbsRepo.find({
      where: { standardName: In(names) },
      select: ['id', 'standardName'],
    });
    const existingMap = new Map(existing.map((h) => [h.standardName, h.id]));

    // 없는 것만 batch insert
    const missing = names.filter((n) => !existingMap.has(n));
    if (missing.length > 0) {
      this.logger.log(`herbs_master 신규 INSERT: ${missing.length}개`);
      const rows = missing.map((name) =>
        this.herbsRepo.create({
          standardName: name,
          category: '미분류',
        }),
      );
      // chunk insert (1000개씩) — Postgres 파라미터 제한 회피
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const saved = await this.herbsRepo.save(chunk);
        for (const h of saved) existingMap.set(h.standardName, h.id);
      }
    } else {
      this.logger.log('herbs_master: 신규 약재 없음 (모두 존재)');
    }

    return existingMap;
  }

  private async upsertFormula(
    json: JsonFormula,
    herbIdByName: Map<string, string>,
  ): Promise<'inserted' | 'skipped'> {
    const name = (json.name || '').trim();
    if (!name) return 'skipped';

    // 중복 체크 (name + hanja 조합)
    const existing = await this.formulasRepo.findOne({
      where: { name, hanja: json.hanja || '' },
    });
    if (existing) return 'skipped';

    const category =
      CATEGORY_MAP[json.category] ||
      json.categoryLabel ||
      json.category ||
      '기타';

    const indication =
      json.indicationText ||
      json.indications?.join(', ') ||
      json.description?.slice(0, 500) ||
      null;

    const formula = this.formulasRepo.create({
      name,
      hanja: json.hanja || '',
      category,
      source: json.source || null,
      indication,
    });
    const savedFormula = await this.formulasRepo.save(formula);

    // formula_herbs 매핑
    const formulaHerbs: FormulaHerb[] = [];
    for (const c of json.composition || []) {
      const herbName = this.normalizeHerbName(c.herb);
      if (!herbName) continue;
      const herbId = herbIdByName.get(herbName);
      if (!herbId) continue;
      formulaHerbs.push(
        this.formulaHerbsRepo.create({
          formulaId: savedFormula.id,
          herbId,
          amount: c.amount || '',
          processingMethod: c.processing || null,
        }),
      );
    }
    if (formulaHerbs.length > 0) {
      await this.formulaHerbsRepo.save(formulaHerbs);
    }

    return 'inserted';
  }
}
