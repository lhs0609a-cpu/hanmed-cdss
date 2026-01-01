import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import * as fs from 'fs';
import * as path from 'path';

interface FormulaJsonData {
  id: string;
  name: string;
  hanja: string;
  code?: string;
  category: string;
  categoryLabel?: string;
  source: string;
  originalText?: string | null;
  composition: Array<{
    herb: string;
    amount: string;
    processing?: string | null;
  }>;
  compositionText?: string;
  usage?: string;
  indications?: string[];
  indicationText?: string;
  description?: string;
  mechanism?: string | null;
  compositionExplanation?: string;
  comparisons?: Array<{
    targetFormula: string;
    difference: string;
  }>;
  comparisonText?: string;
  cases?: any[];
  contraindications?: string[];
  cautions?: string[];
  dataSource?: string;
  searchKeywords?: string[];
}

async function seedFormulas() {
  console.log('Starting formula seed...');

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    // JSON 파일 읽기
    const dataPath = path.join(__dirname, '../../../../web/src/data/formulas/all-formulas.json');

    if (!fs.existsSync(dataPath)) {
      console.error('all-formulas.json not found at:', dataPath);
      return;
    }

    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const formulas: FormulaJsonData[] = JSON.parse(rawData);
    console.log(`Found ${formulas.length} formulas in JSON file`);

    // 1. 먼저 모든 약재(herb) 수집 및 삽입
    const allHerbs = new Set<string>();
    formulas.forEach(formula => {
      formula.composition?.forEach(comp => {
        if (comp.herb) {
          // 한자명에서 "各五分" 같은 용량 정보 제거
          const cleanHerb = comp.herb.replace(/各[\d\w]+/g, '').trim();
          if (cleanHerb) {
            allHerbs.add(cleanHerb);
          }
        }
      });
    });

    console.log(`Found ${allHerbs.size} unique herbs`);

    // 약재 삽입
    const herbIdMap = new Map<string, string>();

    for (const herbName of allHerbs) {
      try {
        // 이미 존재하는지 확인 (한자명 또는 한글명으로)
        const existing = await dataSource.query(
          `SELECT id FROM herbs_master WHERE hanja_name = $1 OR standard_name = $1 LIMIT 1`,
          [herbName]
        );

        if (existing.length > 0) {
          herbIdMap.set(herbName, existing[0].id);
        } else {
          // 새로 삽입
          const result = await dataSource.query(
            `INSERT INTO herbs_master (standard_name, hanja_name, category, properties)
             VALUES ($1, $1, '미분류', '{}')
             RETURNING id`,
            [herbName]
          );
          herbIdMap.set(herbName, result[0].id);
        }
      } catch (error) {
        console.error(`Error inserting herb ${herbName}:`, error);
      }
    }

    console.log(`Processed ${herbIdMap.size} herbs`);

    // 2. 처방 삽입
    let insertedCount = 0;
    let skippedCount = 0;

    for (const formula of formulas) {
      try {
        // 이미 존재하는지 확인
        const existing = await dataSource.query(
          `SELECT id FROM formulas WHERE name = $1 LIMIT 1`,
          [formula.name]
        );

        let formulaId: string;

        if (existing.length > 0) {
          formulaId = existing[0].id;
          skippedCount++;
        } else {
          // 카테고리 매핑
          let category = formula.category || formula.categoryLabel || '기타';
          if (category === 'etc' || !category) {
            category = '기타';
          }

          // 처방 삽입
          const result = await dataSource.query(
            `INSERT INTO formulas (name, hanja, category, source, indication, pathogenesis, contraindications)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              formula.name,
              formula.hanja || '',
              category,
              formula.source || '',
              formula.indicationText || formula.indications?.join(', ') || '',
              formula.description || '',
              formula.contraindications || null,
            ]
          );
          formulaId = result[0].id;
          insertedCount++;

          // 3. formula_herbs 관계 삽입
          for (const comp of formula.composition || []) {
            const cleanHerb = comp.herb?.replace(/各[\d\w]+/g, '').trim();
            if (!cleanHerb) continue;

            const herbId = herbIdMap.get(cleanHerb);
            if (!herbId) {
              console.warn(`Herb not found: ${cleanHerb}`);
              continue;
            }

            try {
              await dataSource.query(
                `INSERT INTO formula_herbs (formula_id, herb_id, amount, processing_method)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING`,
                [
                  formulaId,
                  herbId,
                  comp.amount || '',
                  comp.processing || null,
                ]
              );
            } catch (err) {
              // 무시 (중복 등)
            }
          }
        }
      } catch (error) {
        console.error(`Error inserting formula ${formula.name}:`, error);
      }
    }

    console.log(`\nSeed completed!`);
    console.log(`  Inserted: ${insertedCount} formulas`);
    console.log(`  Skipped (already exists): ${skippedCount} formulas`);
    console.log(`  Total herbs: ${herbIdMap.size}`);

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seedFormulas();
