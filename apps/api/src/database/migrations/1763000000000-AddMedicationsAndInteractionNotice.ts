import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 복용 양약 목록과 상호작용 설명 기록.
 *
 * 대법원은 양약을 복용 중인 환자에게 한약을 처방할 때 상호작용 위험을 설명할
 * 의무를 인정했다. 그런데 복용 약물은 화면에만 있고 저장되지 않아 다음 진료에서
 * 다시 물어야 했고, 설명했다는 사실도 아무 데도 남지 않았다.
 * 설명의무는 이행 사실이 남아 있지 않으면 다툴 때 방어가 되지 않는다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class AddMedicationsAndInteractionNotice1763000000000
  implements MigrationInterface
{
  name = 'AddMedicationsAndInteractionNotice1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "practitioner_patients"
        ADD COLUMN IF NOT EXISTS "medications" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits"
        ADD COLUMN IF NOT EXISTS "interactionNoticeGivenAt" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "practitioner_patients" DROP COLUMN IF EXISTS "medications"
    `);
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits" DROP COLUMN IF EXISTS "interactionNoticeGivenAt"
    `);
  }
}
