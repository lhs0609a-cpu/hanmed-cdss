import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * patient_prescriptions 에 clinicId 추가 — 테넌트 격리(IDOR 방어).
 *
 * 배경: PatientPrescriptionsService.create 는 clinicId 를 인자로 받으면서도
 * 엔티티에 저장하지 않아, 처방이 어느 한의원 소유인지 DB 에 남지 않았다.
 * 그 결과 처방 수정 엔드포인트가 소유 검증 없이 id 만으로 처방을 수정할 수 있었다.
 * 이 컬럼과 인덱스를 추가하고, 이후 create 는 clinicId 를 채우며 update 는 이 값으로 필터한다.
 *
 * 기존 행(clinicId NULL)은 소유 한의원이 불명이므로 clinic 스코프 수정 API 로는
 * 접근되지 않는다(안전 측 실패). 필요 시 record→clinicId 백필을 별도 수행한다.
 *
 * 멱등: IF NOT EXISTS 로 재실행 안전.
 */
export class AddPrescriptionClinicId1752000000000 implements MigrationInterface {
  name = 'AddPrescriptionClinicId1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "patient_prescriptions"
      ADD COLUMN IF NOT EXISTS "clinicId" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_prescriptions_clinicId"
      ON "patient_prescriptions" ("clinicId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_patient_prescriptions_clinicId"
    `);
    await queryRunner.query(`
      ALTER TABLE "patient_prescriptions" DROP COLUMN IF EXISTS "clinicId"
    `);
  }
}
