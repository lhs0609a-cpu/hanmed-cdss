import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Formula } from '../entities/formula.entity';
import { Herb } from '../entities/herb.entity';
import { FormulaHerb } from '../entities/formula-herb.entity';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 처방 카탈로그 적재 — apps/web/src/data/formulas/all-formulas.json → formulas / herbs_master / formula_herbs
 *
 * 원시 SQL 로 컬럼명을 직접 적던 버전은 스키마와 어긋나 있었다
 * (standard_name vs "standardName", processing_method vs "processingMethod").
 * 그래서 시드가 조용히 실패했고 운영의 처방·약재 테이블이 빈 채로 남아 있었다.
 * 지금은 엔티티/리포지토리를 통해 넣는다 — 컬럼명은 ORM 이 만들어주므로 다시 어긋날 수 없다.
 *
 * 멱등: 이미 있는 처방/약재는 건너뛴다. 몇 번 돌려도 안전.
 */

interface FormulaJsonData {
  name: string;
  hanja?: string;
  category?: string;
  categoryLabel?: string;
  source?: string;
  composition?: Array<{ herb: string; amount?: string; processing?: string | null }>;
  indications?: string[];
  indicationText?: string;
  description?: string;
  mechanism?: string | null;
  contraindications?: string[];
}

/** "各五分" 같은 용량 표기를 약재명에서 걷어낸다. */
function cleanHerbName(raw: string): string {
  return raw.replace(/各[\d\w]+/g, '').trim();
}

async function seedFormulas(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('[seed] DB 연결됨');

  try {
    const dataPath = path.join(
      __dirname,
      '../../../../web/src/data/formulas/all-formulas.json',
    );
    if (!fs.existsSync(dataPath)) {
      throw new Error(`all-formulas.json 을 찾을 수 없습니다: ${dataPath}`);
    }

    const formulas: FormulaJsonData[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`[seed] JSON 처방 ${formulas.length}건`);

    const herbRepo = dataSource.getRepository(Herb);
    const formulaRepo = dataSource.getRepository(Formula);
    const formulaHerbRepo = dataSource.getRepository(FormulaHerb);

    // 1) 약재 — 처방 구성에 등장하는 모든 약재를 먼저 확보한다.
    const herbNames = new Set<string>();
    for (const f of formulas) {
      for (const c of f.composition ?? []) {
        const name = cleanHerbName(c.herb ?? '');
        if (name) herbNames.add(name);
      }
    }
    console.log(`[seed] 고유 약재 ${herbNames.size}종`);

    const herbIdByName = new Map<string, string>();
    let newHerbs = 0;
    for (const name of herbNames) {
      const existing = await herbRepo.findOne({ where: { standardName: name } });
      if (existing) {
        herbIdByName.set(name, existing.id);
        continue;
      }
      // 성질·귀경 등 상세는 별도 시드(seed-formula-properties)에서 채운다.
      // 여기서는 처방 구성이 깨지지 않도록 최소 레코드만 만든다.
      const saved = await herbRepo.save(
        herbRepo.create({ standardName: name, hanjaName: name, category: '미분류' }),
      );
      herbIdByName.set(name, saved.id);
      newHerbs++;
    }
    console.log(`[seed] 약재 신규 ${newHerbs}건 / 전체 ${herbIdByName.size}건`);

    // 2) 처방 + 구성
    let newFormulas = 0;
    let skipped = 0;
    let links = 0;

    for (const f of formulas) {
      if (!f.name) continue;

      let formula = await formulaRepo.findOne({ where: { name: f.name } });
      if (formula) {
        skipped++;
      } else {
        const category =
          !f.category || f.category === 'etc' ? f.categoryLabel || '기타' : f.category;
        formula = await formulaRepo.save(
          formulaRepo.create({
            name: f.name,
            hanja: f.hanja || '',
            category,
            source: f.source || '',
            indication: f.indicationText || (f.indications ?? []).join(', ') || '',
            pathogenesis: f.mechanism || f.description || '',
            contraindications: f.contraindications ?? [],
          }),
        );
        newFormulas++;
      }

      for (const c of f.composition ?? []) {
        const herbName = cleanHerbName(c.herb ?? '');
        const herbId = herbName ? herbIdByName.get(herbName) : undefined;
        if (!herbId) continue;

        const already = await formulaHerbRepo.findOne({
          where: { formulaId: formula.id, herbId },
        });
        if (already) continue;

        await formulaHerbRepo.save(
          formulaHerbRepo.create({
            formulaId: formula.id,
            herbId,
            amount: c.amount || '',
            processingMethod: c.processing || undefined,
          }),
        );
        links++;
      }
    }

    console.log(
      `[seed] 처방 신규 ${newFormulas}건 · 기존 ${skipped}건 · 구성 연결 ${links}건 추가`,
    );
  } finally {
    await dataSource.destroy();
  }
}

seedFormulas()
  .then(() => {
    console.log('[seed] 완료');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed] 실패:', err);
    process.exit(1);
  });
