import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 치험례에 노출 제외 사유를 붙인다.
 *
 * 왜 필요한가:
 *   수집 원본이 문서 통째라, 치험례가 아닌 덩어리가 같은 표에 섞여 들어왔다.
 *   방약합편 목차 줄("156. 삼기탕 1-2. 탈항 여 51세 주부 157. 2-1. 단독…"),
 *   처방도표 강의자료("이중탕계열 처방도표 강의용 자료" — 전문 38자),
 *   본초 강좌, 밴드 신변잡기, 반하 채취법 설명. 한의사가 목록에서 이걸
 *   열면 얻을 것이 없다.
 *
 *   길이로만 자를 수 없다. 222자짜리 이진탕 시험복용례는 회차별 반응이
 *   적혀 있어 쓸 만하고, 2,048자짜리 진짜 치험례는 끝에 색인표가 붙어
 *   있을 뿐이다. 그래서 건별로 판정하고 그 사유를 남긴다.
 *
 * 지우지 않는 이유:
 *   판정이 틀릴 수 있고, 파서를 고치면 되살아날 것이 섞여 있다.
 *   색인 줄이 가리키는 원본 사례는 대개 다른 행에 온전히 들어 있어서,
 *   나중에 둘을 이어 붙일 여지도 남는다.
 *
 * 이 DB 는 마이그레이션 이력이 어긋나 있어(DB_MIGRATIONS_RUN=false) 운영에는
 * 같은 문장을 직접 실행해 반영한다. 이 파일은 기록이자, 새 환경을 만들 때
 * 같은 상태가 되게 하는 장치다.
 */
export class CaseExclusion1778000000000 implements MigrationInterface {
  name = 'CaseExclusion1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "excludedReason" varchar(32) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "screenedAt" timestamptz NULL`,
    );
    // 목록·검색이 매번 "excludedReason IS NULL" 로 좁힌다. 대부분의 행이
    // NULL 이라 부분 인덱스로 두면 제외된 쪽만 색인해 훨씬 작다.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_clinical_cases_excluded" ON "clinical_cases" ("excludedReason") WHERE "excludedReason" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clinical_cases_excluded"`);
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "screenedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "excludedReason"`,
    );
  }
}
