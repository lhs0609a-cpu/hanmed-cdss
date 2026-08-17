import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 한의사 소유 환자 명부 / 진료 기록 테이블.
 *
 * 그동안 환자 명부(hanmed_patients)와 처방 기록(hanmed_prescriptions)은
 * 브라우저 localStorage 에만 있었다. 다른 PC 에서 로그인하면 비어 있고,
 * 캐시를 지우면 사라지고, 백업 경로가 없었다. 구독료를 받는 서비스에서
 * 성립하지 않는 구조라 서버로 옮긴다.
 *
 * 개인식별정보(이름·전화·생년월일)는 애플리케이션에서 AES-256-GCM 으로
 * 암호화한 뒤 text 로 저장한다. DB 덤프가 유출돼도 평문 환자 명단이 되지 않는다.
 * 검색은 nameSearchToken(HMAC) 으로만 가능하다.
 *
 * 멱등: IF NOT EXISTS 로 만들어 재실행 안전.
 */
export class PractitionerPatientRoster1754000000000 implements MigrationInterface {
  name = 'PractitionerPatientRoster1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practitioner_patients" (
        "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "practitionerId"     uuid NOT NULL,
        "clinicId"           uuid,
        "nameEncrypted"      text NOT NULL,
        "phoneEncrypted"     text,
        "birthDateEncrypted" text,
        "nameSearchToken"    varchar(64),
        "gender"             varchar(8),
        "constitution"       varchar(32),
        "mainComplaint"      text,
        "memo"               text,
        "status"             varchar(16) NOT NULL DEFAULT 'active',
        "lastVisitAt"        timestamptz,
        "totalVisits"        integer NOT NULL DEFAULT 0,
        "createdAt"          timestamptz NOT NULL DEFAULT now(),
        "updatedAt"          timestamptz NOT NULL DEFAULT now(),
        "deletedAt"          timestamptz,
        CONSTRAINT "FK_practitioner_patients_user"
          FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practitioner_patients_owner"
        ON "practitioner_patients" ("practitionerId", "deletedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practitioner_patients_search"
        ON "practitioner_patients" ("practitionerId", "nameSearchToken")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practitioner_visits" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "practitionerId" uuid NOT NULL,
        "patientId"      uuid,
        "visitedAt"      timestamptz NOT NULL,
        "chiefComplaint" text,
        "symptoms"       jsonb NOT NULL DEFAULT '[]'::jsonb,
        "diagnosis"      text,
        "formulaName"    varchar(128),
        "herbs"          jsonb NOT NULL DEFAULT '[]'::jsonb,
        "aiConfidence"   double precision,
        "aiDegraded"     boolean NOT NULL DEFAULT false,
        "notes"          text,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        "updatedAt"      timestamptz NOT NULL DEFAULT now(),
        "deletedAt"      timestamptz,
        CONSTRAINT "FK_practitioner_visits_user"
          FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_practitioner_visits_patient"
          FOREIGN KEY ("patientId") REFERENCES "practitioner_patients"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practitioner_visits_owner"
        ON "practitioner_visits" ("practitionerId", "visitedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practitioner_visits_patient"
        ON "practitioner_visits" ("patientId", "visitedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // visits 가 patients 를 FK 로 물고 있으므로 역순으로 지운다.
    await queryRunner.query(`DROP TABLE IF EXISTS "practitioner_visits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "practitioner_patients"`);
  }
}
