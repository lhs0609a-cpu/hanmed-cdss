import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 환자 복약 추적 — 카톡으로 보낸 링크 하나로 자기 상태를 이어서 본다.
 *
 * 지금까지는 안내서가 진료 단위였고(링크가 매번 바뀜), 복용 체크는 환자 기기의
 * localStorage 에만 있었다. 기기를 바꾸면 며칠째인지 사라졌고, 한의사는 환자가
 * 실제로 먹었는지 알 수 없어 "효과가 없다" 가 미복용 때문인지 처방 때문인지
 * 구분할 근거가 없었다.
 *
 * 이 마이그레이션이 더하는 것
 *   1. practitioner_patients.trackToken — 환자 단위 고정 링크(/t/:token)
 *   2. practitioner_patients.notifyConsentAt/notifyOptOutAt — 정통법 제50조
 *   3. medication_guide_doses — 복용 체크를 서버로
 *   4. patient_notify_logs — 발송 이력(중복 발송 차단 + 동의 증빙)
 *   5. medication_guides.dosingStartedOn / linkSentAt / linkSentChannel
 *
 * 멱등: IF NOT EXISTS.
 */
export class PatientTracking1771000000000 implements MigrationInterface {
  name = 'PatientTracking1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1·2. 환자 단위 추적 토큰과 수신 동의 ────────────────────
    await queryRunner.query(`
      ALTER TABLE "practitioner_patients"
        ADD COLUMN IF NOT EXISTS "trackToken"      varchar(64),
        ADD COLUMN IF NOT EXISTS "trackIssuedAt"   timestamptz,
        ADD COLUMN IF NOT EXISTS "trackRevokedAt"  timestamptz,
        ADD COLUMN IF NOT EXISTS "notifyConsentAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "notifyOptOutAt"  timestamptz
    `);
    // 토큰이 겹치면 남의 처방 이력이 열린다. 유니크로 막는다.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_practitioner_patients_track_token"
        ON "practitioner_patients" ("trackToken") WHERE "trackToken" IS NOT NULL
    `);

    // ── 5. 안내서의 복용 시작일·링크 발송 흔적 ──────────────────
    await queryRunner.query(`
      ALTER TABLE "medication_guides"
        ADD COLUMN IF NOT EXISTS "dosingStartedOn" date,
        ADD COLUMN IF NOT EXISTS "linkSentAt"      timestamptz,
        ADD COLUMN IF NOT EXISTS "linkSentChannel" varchar(16)
    `);

    // ── 3. 복용 체크 ────────────────────────────────────────────
    // 하루에 한 줄. 같은 날을 두 번 눌러도 한 줄이어야 순응도가 100%를 넘지 않는다.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "medication_guide_doses" (
        "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guideId"   uuid NOT NULL,
        "takenOn"   date NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_medication_guide_doses_guide"
          FOREIGN KEY ("guideId") REFERENCES "medication_guides"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_medication_guide_doses_day"
        ON "medication_guide_doses" ("guideId", "takenOn")
    `);

    // ── 4. 발송 이력 ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_notify_logs" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "practitionerId" uuid NOT NULL,
        "patientId"      uuid,
        "guideId"        uuid,
        "kind"           varchar(32) NOT NULL,
        "channel"        varchar(16) NOT NULL,
        "status"         varchar(24) NOT NULL,
        "messageId"      varchar(128),
        "error"          text,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_patient_notify_logs_user"
          FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_notify_logs_owner"
        ON "patient_notify_logs" ("practitionerId", "createdAt")
    `);
    // 자동 체크인이 같은 안내서에 두 번 나가지 않게 하는 조회 인덱스.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_notify_logs_guide_kind"
        ON "patient_notify_logs" ("guideId", "kind")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_notify_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medication_guide_doses"`);
    await queryRunner.query(`
      ALTER TABLE "medication_guides"
        DROP COLUMN IF EXISTS "dosingStartedOn",
        DROP COLUMN IF EXISTS "linkSentAt",
        DROP COLUMN IF EXISTS "linkSentChannel"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_practitioner_patients_track_token"`,
    );
    await queryRunner.query(`
      ALTER TABLE "practitioner_patients"
        DROP COLUMN IF EXISTS "trackToken",
        DROP COLUMN IF EXISTS "trackIssuedAt",
        DROP COLUMN IF EXISTS "trackRevokedAt",
        DROP COLUMN IF EXISTS "notifyConsentAt",
        DROP COLUMN IF EXISTS "notifyOptOutAt"
    `);
  }
}
