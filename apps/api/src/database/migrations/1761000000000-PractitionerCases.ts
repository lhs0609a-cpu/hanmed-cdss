import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 한의사 본인 치험례 테이블.
 *
 * 이 제품은 치험례를 근거로 처방을 설명하는데, 정작 한의사 자신의 치험례는
 * 브라우저 localStorage 에만 있었다. 캐시를 지우면 사라지고 다른 PC 에서는
 * 안 보였다. 몇 년치 임상 기록을 둘 자리가 아니다.
 *
 * 환자 식별정보 컬럼은 두지 않는다 — 치험례는 나중에 공유될 수 있는 기록이라
 * 애초에 이름·연락처가 섞이지 않게 스키마로 막는다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class PractitionerCases1761000000000 implements MigrationInterface {
  name = 'PractitionerCases1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practitioner_cases" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "practitionerId" uuid NOT NULL,
        "sourceVisitId" uuid,
        "patientAge" smallint,
        "patientGender" varchar(1),
        "patientConstitution" varchar(32),
        "chiefComplaint" text NOT NULL,
        "symptoms" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "diagnosis" text,
        "byeonjeung" varchar(128),
        "formulaName" varchar(128) NOT NULL,
        "herbs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "modifications" text,
        "treatmentDuration" varchar(32),
        "outcome" varchar(16),
        "outcomeDetails" text,
        "notes" text,
        "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "isStarred" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "FK_practitioner_cases_user"
          FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practitioner_cases_owner"
        ON "practitioner_cases" ("practitionerId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "practitioner_cases"`);
  }
}
