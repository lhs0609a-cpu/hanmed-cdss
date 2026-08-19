import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 지운 환자의 진료 기록을 함께 내린다.
 *
 * 환자를 삭제해도 진료는 그대로 남아 있었다. 이름을 못 찾으니 대시보드
 * 경과 확인 목록에 "이름 없는 진료" 로 떠다녔다 — 지운 환자가 화면에
 * 계속 나오는 셈이다. 앞으로는 삭제 시 함께 내리고, 이미 쌓인 것도 정리한다.
 *
 * 익명 상담(patientId IS NULL)은 건드리지 않는다.
 */
export class SoftDeleteOrphanVisits1764000000000 implements MigrationInterface {
  name = 'SoftDeleteOrphanVisits1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "practitioner_visits" v
         SET "deletedAt" = NOW()
       WHERE v."deletedAt" IS NULL
         AND v."patientId" IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM "practitioner_patients" p
            WHERE p."id" = v."patientId" AND p."deletedAt" IS NOT NULL
         )
    `);
  }

  public async down(): Promise<void> {
    // 되돌리지 않는다 — 어떤 행이 이 마이그레이션으로 내려갔는지 구분할 수 없다.
  }
}
