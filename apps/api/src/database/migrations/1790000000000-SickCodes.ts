import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 한의과 상병(KCD) 저장 테이블.
 *
 * 원자료는 공공데이터포털 질병정보서비스에 있고 XML 로만 온다. 우리 API 가
 * 도는 도쿄에서 부르면 해외 IP 스로틀에 걸리므로 요청 때마다 부를 수 없다.
 * 미리 받아 둔다 — 비급여 가격과 같은 이유, 같은 방식이다.
 *
 * code 를 기본키로 삼는다. 심평원이 주는 식별자가 이미 유일하고, 그 값이
 * 그대로 주소가 된다. uuid 를 따로 두면 같은 것을 두 이름으로 부르게 된다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class SickCodes1790000000000 implements MigrationInterface {
  name = 'SickCodes1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sick_codes" (
        "code"      varchar(16) PRIMARY KEY,
        "nameKo"    varchar(500) NOT NULL,
        "nameEn"    varchar(700) NOT NULL DEFAULT '',
        "depth"     smallint NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    // 상병명으로 찾는 길. 한국어 주제 허브가 이 이름을 되짚는다.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sick_codes_nameKo"
        ON "sick_codes" ("nameKo")
    `);
    // 분류(3글자)와 세부를 가르는 질의가 잦다.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sick_codes_depth"
        ON "sick_codes" ("depth")
    `);
    /**
     * 상위코드는 칼럼이 아니라 식이다. 앞 세 글자가 곧 상위 분류라
     * 저장하면 원자료가 바뀔 때 두 값이 어긋난다. 대신 그 식에 인덱스를
     * 걸어 "이 분류의 하위 상병" 질의가 순차 스캔으로 떨어지지 않게 한다.
     */
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sick_codes_parent"
        ON "sick_codes" ((left("code", 3)))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sick_codes"`);
  }
}
