import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 면허증 사본 보관 자리를 만든다.
 *
 * 그동안 면허 검수는 사용자가 적어 넣은 번호 문자열만 보고 눌렀다. 번호는
 * 형식만 맞으면 아무 값이나 통과하므로, 검수라기보다 자릿수 확인에 가까웠다.
 * 사본을 받아 두면 사람이 실제로 확인할 근거가 생긴다.
 *
 * 저장하는 값은 Supabase **비공개** 버킷의 오브젝트 경로다. 공개 URL 을 넣지
 * 않는다 — 면허증에는 이름·생년월일·면허번호가 같이 찍혀 있어서 주소만 알면
 * 열리는 자리에 두면 안 된다. 열람은 관리자 요청 때마다 짧게 서명한 URL 로만
 * 내준다.
 *
 * 이 DB 는 마이그레이션 이력이 어긋나 있어(DB_MIGRATIONS_RUN=false) 운영에는
 * 같은 문장을 직접 실행해 반영한다. 이 파일은 기록이자, 새 환경을 만들 때
 * 같은 상태가 되게 하는 장치다.
 */
export class LicenseDocument1777000000000 implements MigrationInterface {
  name = 'LicenseDocument1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "licenseFilePath" text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "licenseFileUploadedAt" timestamp NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "licenseFileUploadedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "licenseFilePath"`,
    );
  }
}
