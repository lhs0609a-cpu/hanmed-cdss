import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 통증 점수(VAS)·맥진 소견 컬럼.
 *
 * 환자 상세의 '경과 추이' 그래프와 '현재 통증 점수' 카드는 진료 입력 폼에서
 * 받은 값을 쓰는데, 정작 그 값을 어디에도 저장하지 않았다. 새로고침하면 전부
 * 0 으로 돌아와 그래프가 바닥에 붙었다 — 있는 척만 하는 지표였다.
 *
 * 맥진 소견도 같은 이유로 함께 남긴다. 한의사가 매 진료 적는 항목인데
 * 저장이 안 되면 다음 진료에서 대조할 수가 없다.
 *
 * 임상 소견은 개인식별정보가 아니므로 평문으로 둔다(진단·메모와 동일).
 *
 * 멱등: IF NOT EXISTS.
 */
export class AddVisitPainScoreAndPulse1760000000000 implements MigrationInterface {
  name = 'AddVisitPainScoreAndPulse1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits"
        ADD COLUMN IF NOT EXISTS "painScore" smallint,
        ADD COLUMN IF NOT EXISTS "pulseNote" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits"
        DROP COLUMN IF EXISTS "painScore",
        DROP COLUMN IF EXISTS "pulseNote"
    `);
  }
}
