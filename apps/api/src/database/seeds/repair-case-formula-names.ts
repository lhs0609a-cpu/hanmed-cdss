import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { ClinicalCase } from '../entities/clinical-case.entity';
import { Formula } from '../entities/formula.entity';

/**
 * 치험례의 처방명 오염 정리.
 *
 * 원본 임포트가 원문을 잘못 잘라 herbalFormulas[0].formulaName 에
 * "유명병원", "불안하고", "진행되었고" 같은 문장 조각이 들어가 있다.
 * 처방별 치험례 집계가 이 필드에 의존하므로, 처방 목록의 "치험례 N건" 과
 * 처방 상세의 근거가 통째로 틀어진다.
 *
 * 정리 방식(AI 미사용 — 결정적이고 재현 가능해야 한다):
 *   1) formulas 테이블 429건의 이름/한자를 정답 사전으로 삼는다.
 *   2) 기존 formulaName 이 사전에 있으면 그대로 둔다.
 *   3) 없으면 원문(originalText)에서 사전의 처방명을 찾아 교체한다.
 *      긴 이름부터 매칭한다 — "이중탕" 이 "가감이중탕" 안에 들어 있기 때문.
 *   4) 원문에서도 못 찾으면 빈 문자열로 지운다.
 *      틀린 처방명을 남겨 두는 것보다 없는 편이 낫다 — 집계가 오염된다.
 *
 * 멱등: 몇 번 돌려도 결과가 같다.
 *
 * 실행: npx ts-node -r tsconfig-paths/register src/database/seeds/repair-case-formula-names.ts [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log(`[repair] DB 연결됨${DRY_RUN ? ' (dry-run)' : ''}`);

  try {
    const formulas = await dataSource.getRepository(Formula).find();
    // 이름과 한자 모두 정답으로 인정. 길이 내림차순으로 정렬해 최장 매칭.
    const dictionary = Array.from(
      new Set(
        formulas.flatMap((f) => [f.name, f.hanja].filter(Boolean).map((v) => v.trim())),
      ),
    )
      .filter((n) => n.length >= 2)
      .sort((a, b) => b.length - a.length);
    const dictSet = new Set(dictionary);
    console.log(`[repair] 처방 사전 ${dictionary.length}개`);

    const caseRepo = dataSource.getRepository(ClinicalCase);
    const total = await caseRepo.count();
    console.log(`[repair] 치험례 ${total}건 검사`);

    let kept = 0;
    let replaced = 0;
    let cleared = 0;
    let untouched = 0;
    const samples: string[] = [];

    const PAGE = 500;
    for (let offset = 0; offset < total; offset += PAGE) {
      const rows = await caseRepo.find({
        order: { createdAt: 'ASC' },
        skip: offset,
        take: PAGE,
      });

      for (const row of rows) {
        const formulas0 = Array.isArray(row.herbalFormulas) ? row.herbalFormulas : [];
        if (formulas0.length === 0) {
          untouched++;
          continue;
        }
        const current = (formulas0[0]?.formulaName || '').trim();

        if (current && dictSet.has(current)) {
          kept++;
          continue;
        }

        // 원문에서 실제 처방명 찾기 (최장 매칭)
        const text = row.originalText || '';
        const found = dictionary.find((n) => text.includes(n)) || '';

        if (found === current) {
          kept++;
          continue;
        }

        if (found) {
          replaced++;
          if (samples.length < 12) samples.push(`  "${current}" → "${found}"`);
        } else {
          cleared++;
          if (samples.length < 12 && current) samples.push(`  "${current}" → (삭제)`);
        }

        if (!DRY_RUN) {
          const next = [...formulas0];
          next[0] = { ...next[0], formulaName: found };
          await caseRepo.update({ id: row.id }, { herbalFormulas: next });
        }
      }
      process.stdout.write(`\r  ${Math.min(offset + PAGE, total)}/${total}`);
    }

    console.log('\n=== 결과 ===');
    console.log(`  사전 일치 유지: ${kept}건`);
    console.log(`  원문에서 찾아 교체: ${replaced}건`);
    console.log(`  찾지 못해 삭제: ${cleared}건`);
    console.log(`  처방 정보 없음(건너뜀): ${untouched}건`);
    if (samples.length) {
      console.log('  예시:');
      samples.forEach((s) => console.log(s));
    }
  } finally {
    await dataSource.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[repair] 실패:', e);
    process.exit(1);
  });
