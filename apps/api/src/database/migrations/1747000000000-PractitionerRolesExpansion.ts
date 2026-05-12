import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 한의원 직원 역할(PractitionerRole) enum 확장.
 * 2,000명 동시 사용 환경에서 직역별 권한 분리가 필요하다.
 *
 * 기존: 'owner', 'practitioner'
 * 추가: 'receptionist', 'billing', 'nurse', 'viewer'
 *
 * Postgres enum 은 ALTER TYPE ... ADD VALUE 로 한 값씩만 추가 가능하다.
 * (Postgres 12+ 에서는 트랜잭션 외부에서만 가능 — TypeORM 마이그레이션은
 *  기본적으로 트랜잭션을 사용하지 않거나 명시적으로 끄는 방식 필요.)
 */
export class PractitionerRolesExpansion1747000000000 implements MigrationInterface {
  name = 'PractitionerRolesExpansion1747000000000';

  // ALTER TYPE ... ADD VALUE 는 트랜잭션 내부에서 사용한 enum 을 그 트랜잭션 내에서
  // 사용할 수 없는 제약이 있어, 트랜잭션을 끄고 실행한다.
  transaction = false as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // enum 타입 이름은 컬럼/테이블에 따라 'clinic_practitioners_role_enum' 형태로 자동 생성됨.
    const enumName = 'clinic_practitioners_role_enum';

    // enum 자체가 없으면 생성 (synchronize=true 환경 첫 부팅 보호)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumName}') THEN
          CREATE TYPE "${enumName}" AS ENUM ('owner', 'practitioner');
        END IF;
      END $$;
    `);

    // 각 값을 IF NOT EXISTS 로 추가
    const newValues = ['receptionist', 'billing', 'nurse', 'viewer'];
    for (const value of newValues) {
      await queryRunner.query(`
        ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${value}'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres 는 enum 값 제거를 직접 지원하지 않는다.
    // 롤백 시: 1) 타입 재생성, 2) 컬럼 캐스팅, 3) 옛 타입 drop, 4) 새 타입 rename.
    const enumName = 'clinic_practitioners_role_enum';
    const tmpName = `${enumName}_old`;

    // 새 값을 사용 중인 row 가 있으면 'practitioner' 로 강등
    await queryRunner.query(`
      UPDATE "clinic_practitioners"
      SET "role" = 'practitioner'
      WHERE "role" IN ('receptionist', 'billing', 'nurse', 'viewer')
    `);

    await queryRunner.query(`ALTER TYPE "${enumName}" RENAME TO "${tmpName}"`);
    await queryRunner.query(`
      CREATE TYPE "${enumName}" AS ENUM ('owner', 'practitioner')
    `);
    await queryRunner.query(`
      ALTER TABLE "clinic_practitioners"
      ALTER COLUMN "role" TYPE "${enumName}"
      USING "role"::text::"${enumName}"
    `);
    await queryRunner.query(`DROP TYPE "${tmpName}"`);
  }
}
