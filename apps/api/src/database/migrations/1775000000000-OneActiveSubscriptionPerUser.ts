import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 한 사람에게 살아 있는 구독은 하나뿐이도록 DB 가 보장한다.
 *
 * 자동갱신과 결제 재시도가 성공한 뒤 낡은 구독 객체를 그대로 저장하고
 * 있었다. 결제 처리는 트랜잭션 안에서 기존 구독을 CANCELED 로 바꾸고 새
 * 기간의 구독을 만드는데, 크론 루프가 들고 있던 객체는 아직 status=ACTIVE
 * 에 옛 기간이 담긴 상태다. 그걸 save 하면 방금 정리한 행이 되살아난다.
 *
 * 그러면 한 사람에게 ACTIVE 구독이 둘이 되고, 그중 하나는 기간이 이미
 * 지난 채라 다음날 자동갱신 크론이 다시 집어서 또 결제한다. 매일. 카드는
 * 매일 긁히는데 화면에는 구독이 정상으로 보인다.
 *
 * 코드는 고쳤다. 그래도 이 인덱스를 두는 이유는 돈 문제이기 때문이다.
 * 코드는 다음 사람이 또 고칠 수 있지만 인덱스는 조용히 뚫리지 않는다.
 * 같은 실수를 하면 저장이 실패하고, 실패는 로그에 남는다.
 *
 * 부분 인덱스를 쓴다. 취소·만료된 구독은 사람마다 여러 개 쌓이는 것이
 * 정상이라 전체에 유니크를 걸 수 없다.
 */
export class OneActiveSubscriptionPerUser1775000000000
  implements MigrationInterface
{
  name = 'OneActiveSubscriptionPerUser1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 혹시 이미 중복이 있으면 인덱스가 안 걸린다. 오래된 것부터 정리한다 —
    // 마지막에 만들어진 것이 지금 기간이 살아 있는 구독이다.
    await queryRunner.query(`
      UPDATE "subscriptions" s
         SET "status" = 'canceled',
             "canceledAt" = COALESCE(s."canceledAt", NOW())
       WHERE s."status" = 'active'
         AND s."id" NOT IN (
           SELECT DISTINCT ON ("userId") "id"
             FROM "subscriptions"
            WHERE "status" = 'active'
            ORDER BY "userId", "currentPeriodEnd" DESC, "createdAt" DESC
         )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_subscription_one_active_per_user"
        ON "subscriptions" ("userId")
        WHERE "status" = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_subscription_one_active_per_user"`,
    );
  }
}
