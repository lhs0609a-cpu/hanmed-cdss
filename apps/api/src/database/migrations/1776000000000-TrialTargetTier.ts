import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 체험이 끝나면 어느 플랜으로 결제할지 기억한다.
 *
 * 지금까지 무료 체험은 카드 없이 시작하고, 끝나면 그냥 Free 로 내려갔다.
 * 체험을 왜 하는지 생각하면 앞뒤가 안 맞는다 — 써 보고 마음에 들면 결제로
 * 이어져야 하는데, 14일 뒤에 조용히 기능이 꺼지고 다시 결제 화면을 찾아
 * 들어와야 했다. 그 사이에 대부분은 돌아오지 않는다.
 *
 * 이제 체험 시작에 카드 등록을 받고, 끝나는 날 자동으로 결제한다. 그러려면
 * 어느 플랜으로 결제할지 알아야 하는데 Subscription 에 티어 칸이 없었다.
 * user.subscriptionTier 를 쓸 수는 없다 — 체험 중에는 그 값이 체험용
 * 등급(Professional)이라 원래 고른 플랜을 알 수 없다.
 *
 * 문자열로 둔다. Postgres enum 으로 만들면 나중에 플랜을 늘릴 때 운영 DB 에
 * ALTER TYPE 이 필요한데, 이 DB 는 마이그레이션 이력이 이미 어긋나 있다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class TrialTargetTier1776000000000 implements MigrationInterface {
  name = 'TrialTargetTier1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
        ADD COLUMN IF NOT EXISTS "trialTargetTier" varchar(32)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "trialTargetTier"`,
    );
  }
}
