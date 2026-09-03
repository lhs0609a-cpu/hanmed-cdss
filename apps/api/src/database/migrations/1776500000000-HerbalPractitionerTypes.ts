import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 가입 직역에 한약사와 한약업자를 더한다.
 *
 * 약재를 다루는 직역인데 가입 자체가 막혀 있었다. 약재 검색·상호작용·본초
 * 문헌은 이들이 매일 쓰는 것이고, 우리 자료실의 절반이 본초 문헌이다.
 *
 * 진료 권한은 주지 않는다. 한약사는 한약 조제·판매를, 한약업자는 허가받은
 * 범위의 혼합 판매를 한다. 진단과 처방은 의료행위라 둘 다 할 수 없다.
 * practitionerType 이 PRACTITIONER 인지로 갈리는 기능(처방 저장, 진료 차트,
 * 보험청구)이 그대로 닫히므로 따로 막을 코드가 없다.
 *
 * ALTER TYPE ... ADD VALUE 는 되돌릴 수 없다. Postgres 는 enum 값 삭제를
 * 지원하지 않는다 — 타입을 새로 만들고 컬럼을 옮겨 붙여야 하는데, 그 값을
 * 쓰는 행이 하나라도 있으면 그것부터 정리해야 한다. down 은 아무것도 하지
 * 않는다. 잘못 만든 값이 남는 것보다 조용히 남겨 두는 편이 안전하다.
 *
 * 이 DB 는 마이그레이션 이력이 어긋나 있어(DB_MIGRATIONS_RUN=false) 운영에는
 * 2026-09-03 에 같은 문장을 직접 실행해 반영했다. 이 파일은 기록이자,
 * 새 환경을 만들 때 같은 상태가 되게 하는 장치다.
 */
export class HerbalPractitionerTypes1776500000000 implements MigrationInterface {
  name = 'HerbalPractitionerTypes1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "users_practitionertype_enum" ADD VALUE IF NOT EXISTS 'herbal_pharmacist'`,
    );
    await queryRunner.query(
      `ALTER TYPE "users_practitionertype_enum" ADD VALUE IF NOT EXISTS 'herb_dealer'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres 는 enum 값 삭제를 지원하지 않는다. 위 주석 참고.
  }
}
