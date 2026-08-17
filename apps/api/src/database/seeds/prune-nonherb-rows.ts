import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';
import { FormulaHerb } from '../entities/formula-herb.entity';

/**
 * 약재가 아닌 행 제거.
 *
 * all-formulas.json 의 composition[].herb 에는 약재명뿐 아니라 용량·조제 지시가
 * 통째로 들어 있는 항목이 섞여 있다 — "一兩七錢", "一具", "一兩熔化服" 같은 것들.
 * 초기 시드가 이를 약재로 등록해 약재 검색 첫 페이지가 숫자 문자열로 채워졌다.
 *
 * 판정 기준(보수적으로):
 *   - 수사(一二三…)나 아라비아 숫자로 시작하면 약재명일 수 없다.
 *   - 문자열 전체가 수사·단위·조제어로만 이루어져 있으면 약재명이 아니다.
 *   - 사람이 큐레이션한 행(category != '미분류')은 건드리지 않는다.
 *
 * 멱등: 대상이 없으면 아무 일도 하지 않는다.
 */

const LEADING_NUMERAL = /^[一二三四五六七八九十百千半兩\d]/u;
// 수사·단위·조제 동사만으로 구성된 문자열
const ONLY_MEASURE = /^[一二三四五六七八九十百千半各同兩錢分片枚斤升合匙貼具個㕮咀熔化服水煎去滓溫服空心\d\s]+$/u;

// 방약합편 편제 표기("中統二", "上統") 등 약재가 아닌 문서 마커
const DOC_MARKER = /(上統|中統|下統|統[一二三四五六七八九十百\d])/u;

function isNotHerb(name: string): boolean {
  const n = (name || '').trim();
  if (!n) return true;
  if (LEADING_NUMERAL.test(n)) return true;
  if (ONLY_MEASURE.test(n)) return true;
  if (DOC_MARKER.test(n)) return true;
  // 한국 임상에서 쓰는 본초명은 길어야 5자(車前子·五味子·白茯神…).
  // 6자 이상은 원문 문장 조각이 약재 칸에 들어온 것이다("久則大風悉去").
  if (n.length >= 6) return true;
  return false;
}

async function prune(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('[prune] DB 연결됨');

  try {
    const herbRepo = dataSource.getRepository(Herb);
    const linkRepo = dataSource.getRepository(FormulaHerb);

    const all = await herbRepo.find();
    const targets = all.filter(
      (h) => h.category === '미분류' && isNotHerb(h.standardName),
    );
    console.log(`[prune] 전체 ${all.length}종 중 비약재 후보 ${targets.length}종`);

    let removedLinks = 0;
    for (const herb of targets) {
      // 링크 제거 — 이 행은 처방 구성에서도 의미가 없다(용량 문자열이 약재 칸에 들어간 것).
      const links = await linkRepo.find({ where: { herbId: herb.id } });
      for (const l of links) {
        await linkRepo.delete({ id: l.id });
        removedLinks++;
      }
      // 레거시 스네이크 FK 도 함께 끊는다.
      await dataSource.query(`DELETE FROM "formula_herbs" WHERE herb_id = $1`, [herb.id]);
      await dataSource
        .query(`DELETE FROM "herb_compounds" WHERE herb_id = $1`, [herb.id])
        .catch(() => undefined);
      await dataSource
        .query(`DELETE FROM "drug_herb_interactions" WHERE herb_id = $1`, [herb.id])
        .catch(() => undefined);
      await herbRepo.delete({ id: herb.id });
      console.log(`  삭제: ${herb.standardName}`);
    }

    const remaining = await herbRepo.count();
    console.log(
      `[prune] 비약재 ${targets.length}종 삭제 · 링크 ${removedLinks}건 정리 · 남은 약재 ${remaining}종`,
    );
  } finally {
    await dataSource.destroy();
  }
}

prune()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[prune] 실패:', e);
    process.exit(1);
  });
