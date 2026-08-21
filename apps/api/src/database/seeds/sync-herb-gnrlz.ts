import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';
import axios from 'axios';

/**
 * 식약처 생약 종합정보에서 성미·효능·독성을 가져온다.
 *
 * 왜 중요한가 — 성미·귀경을 모델로 채우려다 두 번 실패했다. 이름만 주니
 * 백두옹의 한자가 白豆蔲(백두구)로 들어가고, 죽여가 해표약, 도인이 소도약이
 * 됐다. 학명을 근거로 붙여도 목과의 효능에 프롬프트 예시가 그대로 복사돼
 * 나왔다. 27종을 채웠다가 전부 되돌렸다.
 *
 * 이건 문헌 값이다. 대한민국약전·생약규격집에서 온다.
 *
 *   NATURE  性은 平하고 味는 甘·辛하다.
 *   USES    淸熱解毒, 種子-活血明目.
 *
 * 다만 양이 적다 — 337건 중 성미·효능이 있는 것은 132건뿐이다. 금기
 * (F_CONTRAINDI)는 필드만 있고 337건 전부 비어 있다. 기대했던 것과 다르다.
 * 약재 금기는 여전히 출처가 없다.
 *
 * 오퍼레이션명은 공식 문서(IROS_19_생약종합정보_v2.1.docx)에서 확인했다.
 * 추측으로 15가지를 넣어 봤지만 전부 빗나갔다 — 실제 이름은 getMedicalHerbList
 * 로 서비스명과 아무 관계가 없었다. 문서를 먼저 볼 것.
 *
 * 덮어쓰지 않는다 — 이미 값이 있는 칸은 두고 빈 칸만 메운다.
 *
 * 실행: ... sync-herb-gnrlz.ts [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const BASE =
  'https://apis.data.go.kr/1471057/HbdcGnrlzInfoService/getMedicalHerbList';

function clean(v?: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === 'None' || s === 'null' || s === '-') return null;
  return s;
}

/** "자운영(紫雲英)" 에서 한글명만 뽑는다. */
function koreanOnly(raw: string): string {
  return raw.replace(/[(（][^)）]*[)）]/g, '').trim();
}

async function main(): Promise<void> {
  const key = process.env.PUBLIC_DATA_API_KEY || process.env.MFDS_API_KEY;
  if (!key) {
    console.error('PUBLIC_DATA_API_KEY 가 필요합니다.');
    process.exit(1);
  }

  // 한 번에 500건을 부르면 연결이 끊긴다(ECONNRESET). 항목마다 본문이 길어
  // 응답이 크기 때문이다. 100건씩 나눠 받는다.
  const items: Array<Record<string, unknown>> = [];
  for (let page = 1; ; page++) {
    const res = await axios.get(
      `${BASE}?serviceKey=${key}&type=json&pageNo=${page}&numOfRows=100`,
      { timeout: 60000 },
    );
    const raw = res.data?.body?.items;
    const list: Array<Record<string, unknown>> = Array.isArray(raw)
      ? raw
      : raw
        ? [raw]
        : [];
    items.push(...list);
    if (list.length < 100) break;
  }
  console.log(`[gnrlz] 생약 종합정보 ${items.length}건`);

  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  const repo = ds.getRepository(Herb);
  const herbs = await repo.find();
  const byName = new Map<string, Herb>();
  for (const h of herbs) if (h.standardName) byName.set(h.standardName.trim(), h);

  let nature = 0;
  let uses = 0;
  let toxic = 0;
  let matched = 0;
  const samples: string[] = [];

  for (const it of items) {
    const nameRaw = clean(it.MEDHRB_NAME) ?? clean(it.NAME);
    if (!nameRaw) continue;
    const herb = byName.get(koreanOnly(nameRaw));
    if (!herb) continue;
    matched++;

    let touched = false;

    // 성미 — "性은 平하고 味는 甘·辛하다." 를 그대로 담는다. 파싱해서
    // nature/flavor 로 쪼개면 원문이 사라진다. 화면에서 문장으로 읽는 편이 낫다.
    const natureText = clean(it.NATURE);
    if (natureText && !herb.properties?.nature) {
      herb.properties = {
        ...(herb.properties ?? {}),
        source: '대한민국약전·생약규격집',
        text: natureText,
      } as Herb['properties'];
      nature++;
      touched = true;
    }

    const usesText = clean(it.USES);
    if (usesText && !herb.efficacy) {
      herb.efficacy = usesText;
      uses++;
      touched = true;
    }

    // 독성 — 있는 것만. 안전 항목이라 없는 것을 만들지 않는다.
    const toxSymptoms = clean(it.TOXIC_SYMPTOMS);
    const toxFlag = clean(it.TOX_YN);
    if ((toxSymptoms || toxFlag) && !herb.contraindications?.length) {
      const notes = [
        toxFlag ? `독성 여부: ${toxFlag}` : null,
        toxSymptoms ? `중독 증상: ${toxSymptoms}` : null,
        clean(it.DETOXICATION) ? `해독: ${clean(it.DETOXICATION)}` : null,
        clean(it.ADV_EFFECT) ? `이상반응: ${clean(it.ADV_EFFECT)}` : null,
      ].filter(Boolean) as string[];
      if (notes.length) {
        herb.contraindications = notes as unknown as Herb['contraindications'];
        toxic++;
        touched = true;
      }
    }

    if (touched) {
      if (!DRY_RUN) await repo.save(herb);
      if (samples.length < 6) {
        samples.push(`  ${herb.standardName}: ${natureText ?? '-'} / ${usesText ?? '-'}`);
      }
    }
  }

  console.log(
    `\n[gnrlz] ${DRY_RUN ? '미리보기' : '완료'} — 마스터와 맞은 약재 ${matched}종`,
  );
  console.log(`  성미 ${nature}종 · 효능 ${uses}종 · 독성정보 ${toxic}종`);
  console.log(samples.join('\n'));
  await ds.destroy();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[gnrlz] 실패:', e?.message ?? e);
    process.exit(1);
  });
