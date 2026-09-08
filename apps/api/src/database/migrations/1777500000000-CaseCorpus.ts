import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 치험례에 코퍼스 구분을 붙인다.
 *
 * 왜 필요한가:
 *   고전 의안(中醫笈成 CC0, 臨證指南醫案·張聿青醫案 등 7,500건)을 들여오면서
 *   생긴 문제다. 이 자료는 문언문이고, 서술이 "許（左）　天氣溫和，頭暈輒劇…"
 *   처럼 짧다. 한국어 현대 치험례와 같은 목록에 섞으면 한의사가 "역류성
 *   식도염"으로 검색했을 때 읽을 수 없는 한문이 결과에 끼어든다.
 *
 *   그렇다고 버릴 것도 아니다. 약재 구성이 용량·포제까지 붙어 있고 변증이
 *   괄호로 명시돼 있어 처방의 유래를 볼 때 값어치가 있다. 자리를 나눠 준다.
 *
 * 기본값을 'korean' 으로 두는 이유:
 *   기존 8,579건은 전부 한국 현대 임상 기록이다. 새로 들어오는 것만 표시하면
 *   되고, 목록 API 는 이 컬럼으로 기본 필터를 건다 — 아무것도 고르지 않은
 *   한의사에게 보이는 것은 지금까지와 똑같아야 한다.
 *
 * 이 DB 는 마이그레이션 이력이 어긋나 있어(DB_MIGRATIONS_RUN=false) 운영에는
 * 같은 문장을 직접 실행해 반영한다. 이 파일은 기록이자, 새 환경을 만들 때
 * 같은 상태가 되게 하는 장치다.
 */
export class CaseCorpus1777500000000 implements MigrationInterface {
  name = 'CaseCorpus1777500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "corpus" varchar(16) NOT NULL DEFAULT 'korean'`,
    );
    // 목록·검색이 항상 이 컬럼으로 먼저 좁힌다. 인덱스가 없으면 코퍼스가
    // 커질수록 매 조회가 전체 스캔이 된다.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_clinical_cases_corpus" ON "clinical_cases" ("corpus")`,
    );
    // 고전 의안의 출처를 어디서 가져왔고 어떤 저본인지 남긴다.
    // 공중영역 자료라도 출처를 못 대면 임상에서 인용할 수 없다.
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "sourceEdition" varchar(300) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clinical_cases_corpus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "sourceEdition"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "corpus"`,
    );
  }
}
