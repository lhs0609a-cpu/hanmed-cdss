import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 환자용 복약 안내서와 자가 기록.
 *
 * 한방의료 기피 이유 상위가 "얼마인지 모른다 / 뭘 먹는지 모른다 / 안전한지
 * 모른다 / 왜 이 약인지 모른다" 였다. 소비자원 처리 건에서 진료기록부에
 * 한약 처방이 적혀 있던 경우는 10%, 자료 제출 요구 시 70%가 영업비밀이라며
 * 공개를 거절했다. 선납 후 일부만 받은 상태의 환불 분쟁에서 제대로 환불된
 * 건은 1건뿐이었다.
 *
 * 링크를 아는 사람은 누구나 열 수 있는 문서이므로 환자 식별정보 컬럼은
 * 두지 않는다 — 스키마로 막는다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class MedicationGuides1765000000000 implements MigrationInterface {
  name = 'MedicationGuides1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "medication_guides" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "token"          varchar(64) NOT NULL UNIQUE,
        "practitionerId" uuid NOT NULL,
        "visitId"        uuid,
        "patientId"      uuid,
        "clinicName"     varchar(120),
        "formulaName"    varchar(128) NOT NULL,
        "herbs"          jsonb NOT NULL DEFAULT '[]'::jsonb,
        "evidence"       jsonb,
        "interactions"   jsonb NOT NULL DEFAULT '[]'::jsonb,
        "instructions"   text,
        "cautions"       text,
        "totalDays"      smallint,
        "dispensedDays"  smallint,
        "costItems"      jsonb NOT NULL DEFAULT '[]'::jsonb,
        "totalCost"      integer,
        "revokedAt"      timestamptz,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        "updatedAt"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_medication_guides_user"
          FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_medication_guides_owner"
        ON "medication_guides" ("practitionerId", "createdAt")
    `);
    // 진료 하나당 안내서 하나 — 새로 만들면 기존 것을 갱신한다.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_medication_guides_visit"
        ON "medication_guides" ("visitId") WHERE "visitId" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "medication_guide_reports" (
        "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guideId"       uuid NOT NULL,
        "symptomScore"  smallint,
        "adverseFlags"  jsonb NOT NULL DEFAULT '[]'::jsonb,
        "note"          text,
        "reviewedAt"    timestamptz,
        "reportedAt"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_medication_guide_reports_guide"
          FOREIGN KEY ("guideId") REFERENCES "medication_guides"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_medication_guide_reports_guide"
        ON "medication_guide_reports" ("guideId", "reportedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "medication_guide_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medication_guides"`);
  }
}
