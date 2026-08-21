import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

/**
 * fill-herb-properties 가 이름만 보고 채운 값을 되돌린다.
 *
 * 왜 — 감사해 보니 틀린 것이 많다.
 *   백두옹의 한자가 白豆蔲(백두구)로 들어갔다. 전혀 다른 약재다.
 *   款冬花를 '완지화' 로 읽었다(관동화).
 *   죽여(竹茹)가 해표약, 도인(桃仁)이 소도약, 복신(茯神)이 보양약으로 분류됐다.
 *   효능은 "영양 보충", "진정 효과" 같은 아무 정보 없는 문구다.
 *
 * 원인은 프롬프트에 약재명 한 줄만 넣은 것이다. 근거가 없으니 동음이의를
 * 구별하지 못하고 분류를 찍는다.
 *
 * 빈 칸보다 나쁘다 — 화면의 "-" 는 정보가 없다는 뜻이지만, 죽여가 해표약으로
 * 뜨면 틀린 것을 사실로 보여주는 것이다. 되돌린다.
 *
 * 기준: 식약처 적재(sync-herbs-from-mfds-v2)가 채운 학명·라틴명 등은 건드리지
 * 않는다. 그건 출처가 분명하다. properties/efficacy/category 만 비운다.
 *
 * 실행: ... revert-bad-herb-props.ts [--apply]
 */
const APPLY = process.argv.includes('--apply');

/** A 실행에서 채워진 27종. 로그에서 그대로 옮겼다. */
const FILLED = [
  '조각자', '백복신', '복숭아씨', '백강잠', '백두옹', '완지화', '죽여', '대두',
  '선복화', '천마', '고본', '누로', '목단피', '백미', '봉출', '산조인', '상표초',
  '석고', '속단', '신곡', '오배자', '용안육', '원지', '위령선', '유향', '자완', '패모',
];

(async () => {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();

  const rows = await ds.query(
    `SELECT "id","standardName","category","efficacy" FROM "herbs_master"
      WHERE "standardName" = ANY($1)`,
    [FILLED],
  );
  console.log(`[revert] 대상 ${rows.length}종`);
  for (const r of rows) {
    console.log(`  ${r.standardName}: 분류=${r.category} 효능=${(r.efficacy ?? '-').slice(0, 20)} → 비움`);
  }

  if (APPLY) {
    await ds.query(
      `UPDATE "herbs_master"
          SET "properties" = NULL,
              "meridianTropism" = NULL,
              "efficacy" = NULL,
              "category" = '미분류'
        WHERE "standardName" = ANY($1)`,
      [FILLED],
    );
    console.log(`\n[revert] ${rows.length}종 비움 — 근거 있는 값으로 다시 채울 것`);
  } else {
    console.log('\n[revert] 미리보기 — --apply 로 실행');
  }
  await ds.destroy();
})();
