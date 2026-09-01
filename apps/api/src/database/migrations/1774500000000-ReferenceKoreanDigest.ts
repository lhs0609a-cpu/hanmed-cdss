import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 문헌에 한국어 구조 요약 칸을 만든다.
 *
 * 커뮤니티 문헌 소개글 한가운데에 영문 초록이 그대로 박혀 있었다. 한글
 * 게시판인데 본문의 절반이 영어라, 원장이 열어 보고 "이거 전부 해석해서
 * 우리 콘텐츠로 넣어야 하는 것 아니냐" 고 했다. 맞는 말이다 — 읽히지 않는
 * 영어를 붙여 놓는 것은 콘텐츠가 아니라 자리 채우기다.
 *
 * summaryKo 로는 모자란다. 평균 166자짜리 3~4문장이라 목록에서 훑기에는
 * 맞지만 상세 화면 한 편을 채우지는 못한다. 원문 초록은 평균 1,913자다.
 *
 * 초록을 통째로 번역하지 않는 이유는 두 가지다.
 *
 *   저작권 — 초록의 저작권은 대개 출판사에 있다. 출처를 밝힌 짧은 인용은
 *   저작권법 제28조의 정당한 범위로 볼 여지가 있지만 전문 번역은 2차적
 *   저작물 작성이라 그렇지 않다. 우리가 다시 쓴 요약은 우리 글이다.
 *
 *   오역 — 초록에는 용량과 시술 프로토콜이 들어 있다. 옮기다 한 글자만
 *   틀려도 그걸 보고 처방하는 사람이 생긴다. 그래서 이 칸에도 용량은
 *   넣지 않고, 필요한 사람은 원문으로 가게 한다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class ReferenceKoreanDigest1774500000000 implements MigrationInterface {
  name = 'ReferenceKoreanDigest1774500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clinical_references"
        ADD COLUMN IF NOT EXISTS "abstractKo" text
    `);
    // 구조 요약이 아직 없는 것을 골라내는 질의가 적재 내내 돈다.
    // 번역은 끝났는데 구조 요약만 없는 것이 대상이다.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reference_no_digest"
        ON "clinical_references" ("evidenceType")
        WHERE "abstractKo" IS NULL AND "summaryKo" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reference_no_digest"`);
    await queryRunner.query(
      `ALTER TABLE "clinical_references" DROP COLUMN IF EXISTS "abstractKo"`,
    );
  }
}
