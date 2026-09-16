/**
 * 中醫笈成(jicheng.tw) 고전 醫案 -> clinical_cases (corpus = classical).
 *
 * 라이선스:
 *   https://jicheng.tw/tcm/copyright.html —
 *   "本站所有對公眾領域文本之篩選、編排、標點、附註等一切編輯，均以CC0授權釋出至公眾領域"
 *   底本은 공중영역 고서이고, 표점·편집은 CC0 다. 상업적 재배포에 제약이 없다.
 *   2026-09 조사에서 확인한 국내외 출처 가운데 라이선스가 가장 깨끗하다.
 *   醫案 계열 87종을 전수 확인했고 자체 저작권 선언이 있는 페이지는 없었다.
 *
 * 왜 corpus 를 나누는가:
 *   문언문이고 서술이 짧아 한국어 현대 치험례와 같은 목록에 섞으면 검색
 *   결과가 읽히지 않는다. 표는 같이 쓰되 축을 나눠, 한의사가 고전을 명시적으로
 *   골랐을 때만 나오게 한다.
 *
 * 실행:
 *   git clone --depth 1 https://gitlab.com/jicheng/jc.data.git
 *   python scripts/extract-jicheng-cases.py <jc.data> apps/ai-engine/data/jicheng_cases.json
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/seed-classical-cases.ts
 */

import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { dataSourceOptions } from '../data-source';
import {
  CaseCorpus,
  ClinicalCase,
  Gender,
} from '../entities/clinical-case.entity';

const DRY_RUN = process.argv.includes('--dry-run');

interface JichengCase {
  id: string;
  book: string;
  author: string | null;
  dynasty: string | null;
  year: number | null;
  source_edition: string | null;
  volume: string | null;
  category: string | null;
  surname: string;
  age: number | null;
  followups: number;
  full_text: string;
}

/**
 * 연도를 모르는 서적이 많다. 청대(1644~1912)의 중간을 넣는 식으로 채우면
 * 연도 필터가 거짓말을 하므로, 왕조만 아는 경우 그 왕조의 시작 연도를 쓰고
 * 그것도 모르면 청대 시작(1644)으로 둔다. recordedYear 가 NOT NULL 이라
 * 비워 둘 수가 없다 — 대신 originalText 머리에 서지사항을 적어 화면에서
 * 실제 출전을 보게 한다.
 */
const DYNASTY_YEAR: Record<string, number> = {
  漢: 25,
  唐: 618,
  宋: 960,
  金: 1115,
  元: 1271,
  明: 1368,
  清: 1644,
  淸: 1644,
  清末: 1875,
  清末民初: 1900,
  民國: 1912,
};

function recordedYear(c: JichengCase): number {
  if (c.year) return c.year;
  if (c.dynasty && DYNASTY_YEAR[c.dynasty]) return DYNASTY_YEAR[c.dynasty];
  return 1644;
}

/**
 * 서지사항을 원문 앞에 붙인다.
 *
 * 고전 의안은 본문만 떼어 놓으면 어느 책 몇 권의 무슨 문(門)인지 알 수 없다.
 * 그 셋이 없으면 인용을 못 하고, 인용을 못 하는 근거는 임상에서 쓸 수 없다.
 */
function withCitation(c: JichengCase): string {
  const cite = [
    c.book,
    c.volume,
    c.category,
    c.author ? `${c.author} 撰` : null,
    c.dynasty,
  ]
    .filter(Boolean)
    .join(' · ');
  return `[${cite}]\n${c.full_text}`;
}

/**
 * 醫案의 변증은 문장 끝 괄호에 적히는 일이 많다 —
 * "…內風襲絡。脈左緩大。（肝腎虛內風動）" 의 괄호 안이 그것이다.
 * 없으면 비워 둔다. 본문을 요약해서 만들어 넣지 않는다.
 */
function patternDiagnosis(text: string): string | null {
  const m = text.match(/（([^）]{2,40})）\s*$/m);
  if (!m) return null;
  const inner = m[1];
  // 약재 용량 괄호("四兩烘")를 변증으로 오인하지 않는다.
  if (/[一二三四五六七八九十]\s*(兩|錢|分|斤|升|片|枚)/.test(inner)) return null;
  return inner;
}

function toEntity(c: JichengCase): Partial<ClinicalCase> {
  const complaint = (c.category || c.volume || c.book).slice(0, 200);
  return {
    sourceId: c.id.slice(0, 250),
    corpus: CaseCorpus.CLASSICAL,
    recordedYear: recordedYear(c),
    recorderName: c.author || c.book,
    sourceEdition: c.source_edition ? c.source_edition.slice(0, 300) : null,
    // 고전 의안은 성별을 적지 않는다. '男/女' 표기가 없으면 미상이다 —
    // 성씨로 추측할 수 있는 것이 아니다.
    patientGender: /婦|女|媼|氏婦/.test(c.full_text.slice(0, 30))
      ? Gender.FEMALE
      : Gender.UNKNOWN,
    patientAgeRange: c.age ? String(c.age) : (null as unknown as string),
    chiefComplaint: complaint || '(문류 미기재)',
    patternDiagnosis: patternDiagnosis(c.full_text) as string,
    originalText: withCitation(c).slice(0, 16000),
    symptoms: [],
    herbalFormulas: [],
  };
}

async function main() {
  const dataPath = path.resolve(
    __dirname,
    '../../../../ai-engine/data/jicheng_cases.json',
  );
  if (!fs.existsSync(dataPath)) {
    throw new Error(
      `파일 없음: ${dataPath}\n` +
        '먼저 실행:\n' +
        '  git clone --depth 1 https://gitlab.com/jicheng/jc.data.git\n' +
        `  python scripts/extract-jicheng-cases.py <jc.data 경로> ${dataPath}`,
    );
  }
  const cases: JichengCase[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`고전 의안 추출 ${cases.length}건`);

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  const repo = dataSource.getRepository(ClinicalCase);

  // sourceId 는 서적명 + 순번이라 유일하다. 여기서는 내용 중복 판정을 하지
  // 않는다 — 한국 현대 치험례와 겹칠 일이 없고, 고전끼리는 같은 의안이
  // 여러 책에 실린 것 자체가 사실(轉載)이라 지울 근거가 없다.
  const rows = cases.map(toEntity);
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (seen.has(r.sourceId!)) return false;
    seen.add(r.sourceId!);
    return true;
  });
  console.log(`중복 id 제거 후 ${unique.length}건`);

  if (DRY_RUN) {
    console.log(unique[0]);
    await dataSource.destroy();
    return;
  }

  const BATCH = 300;
  let upserted = 0;
  for (let i = 0; i < unique.length; i += BATCH) {
    await repo.upsert(unique.slice(i, i + BATCH) as any, {
      conflictPaths: ['sourceId'],
      skipUpdateIfNoValuesChanged: true,
    });
    upserted += Math.min(BATCH, unique.length - i);
    console.log(`  적재 ${upserted}/${unique.length}`);
  }

  const korean = await repo.count({ where: { corpus: CaseCorpus.KOREAN } });
  const classical = await repo.count({
    where: { corpus: CaseCorpus.CLASSICAL },
  });
  console.log(`완료 — 한국 현대 ${korean}건 / 고전 의안 ${classical}건`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
