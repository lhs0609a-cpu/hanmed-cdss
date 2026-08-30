import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 문헌 자료실.
 *
 * 커뮤니티에 한의사가 볼 것이 없다는 문제를 게시글을 지어내서 풀지 않는다.
 * 대신 출처가 있는 실물 문헌을 모아 검색되게 한다 — PubMed·KCI·OASIS 논문,
 * 심평원 급여기준·심사지침, 식약처 한약재 안전성 정보.
 *
 * 게시판(posts)과 분리한 이유는 reference.entity.ts 에 적어 두었다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class ClinicalReferences1773500000000 implements MigrationInterface {
  name = 'ClinicalReferences1773500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, values] of [
      ['reference_source_enum', "'pubmed','kci','oasis','hira','mfds'"],
      [
        'reference_category_enum',
        "'acupuncture','herbal','diagnosis','rehab','safety','admin','other'",
      ],
      [
        'reference_evidence_type_enum',
        "'systematic_review','rct','observational','case_report','guideline','review','unknown'",
      ],
    ]) {
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "${name}" AS ENUM (${values});
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clinical_references" (
        "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "source"              "reference_source_enum" NOT NULL,
        "externalId"          varchar(128) NOT NULL,
        "title"               varchar(500) NOT NULL,
        "titleKo"             varchar(500),
        "abstract"            text,
        "authors"             text[] NOT NULL DEFAULT '{}',
        "journal"             varchar(300),
        "publishedAt"         date,
        "publishedYear"       int,
        "doi"                 varchar(200),
        "url"                 varchar(1000) NOT NULL,
        "keywords"            text[] NOT NULL DEFAULT '{}',
        "category"            "reference_category_enum" NOT NULL DEFAULT 'other',
        "evidenceType"        "reference_evidence_type_enum" NOT NULL DEFAULT 'unknown',
        "language"            varchar(8) NOT NULL DEFAULT 'en',
        "contentHash"         varchar(64) NOT NULL,
        "featuredInCommunity" boolean NOT NULL DEFAULT false,
        "createdAt"           timestamptz NOT NULL DEFAULT now(),
        "updatedAt"           timestamptz NOT NULL DEFAULT now()
      )
    `);

    // 재수집이 중복을 쌓지 않게 하는 핵심 제약. 수집기는 이 키로 upsert 한다.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reference_source_external"
        ON "clinical_references" ("source", "externalId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reference_source"
        ON "clinical_references" ("source")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reference_category_published"
        ON "clinical_references" ("category", "publishedAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reference_evidence_published"
        ON "clinical_references" ("evidenceType", "publishedAt" DESC)
    `);
    // 같은 논문이 PubMed 와 KCI 에 각각 올라온다. 화면에서 중복으로 보이지
    // 않게 묶으려면 이 인덱스가 필요하다.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reference_content_hash"
        ON "clinical_references" ("contentHash")
    `);

    // ── 여기부터는 성능용 보조 인덱스다 ──────────────────────────
    //
    // 하나가 실패해도 마이그레이션 전체를 되돌리지 않는다. 위의 테이블과 유니크
    // 제약은 없으면 기능이 깨지지만, 아래 인덱스는 없으면 느려질 뿐이다.
    // 그 둘을 같은 강도로 다룰 이유가 없다. 인덱스 하나가 거절당하면
    // 마이그레이션이 통째로 롤백되고, 앱이 못 떠서 배포가 조용히 구버전으로
    // 남는다 — 헬스체크는 구버전이 응답하므로 초록색이고, 그래서 알아채기까지
    // 오래 걸린다. 느려지는 것과 못 뜨는 것은 감수할 수 있는 실패가 다르다.
    const optionalIndex = async (label: string, sql: string) => {
      await queryRunner.query(`
        DO $$ BEGIN
          ${sql}
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE '${label} 인덱스를 만들지 못했습니다(검색이 느려질 뿐 기능은 동작): %', SQLERRM;
        END $$;
      `);
    };

    // 검색이 안 되면 1만 건은 자산이 아니라 짐이다.
    //
    // 'simple' 사전을 쓴다. 한국어 형태소 사전이 서버에 깔려 있지 않고,
    // 'english' 사전을 한국어에 씌우면 어간 추출이 엉뚱하게 걸린다. simple 은
    // 공백으로만 끊어 한국어 단어를 원형 그대로 남기므로, 한글은 부분일치를
    // 못 하는 대신 오검색이 없다. 영문은 어차피 원형 검색으로 대부분 잡힌다.
    //
    // keywords 를 이 식에 넣지 않는다. array_to_string 은 IMMUTABLE 이 아니라
    // STABLE 이고(원소 타입의 출력 함수에 기대므로), 인덱스 식에는 IMMUTABLE
    // 함수만 쓸 수 있다. 키워드는 아래 배열 인덱스로 따로 받는다.
    await optionalIndex(
      '전문검색',
      `CREATE INDEX IF NOT EXISTS "IDX_reference_fts"
         ON "clinical_references"
         USING GIN (
           to_tsvector('simple',
             coalesce("title", '') || ' ' ||
             coalesce("titleKo", '') || ' ' ||
             coalesce("abstract", '')
           )
         );`,
    );

    // 키워드(MeSH)는 배열 그대로 인덱싱해 && / @> 로 찾는다.
    await optionalIndex(
      '키워드',
      `CREATE INDEX IF NOT EXISTS "IDX_reference_keywords"
         ON "clinical_references" USING GIN ("keywords");`,
    );

    // 한글 부분일치(LIKE '%관절%')를 감당하려면 트라이그램이 필요하다.
    // 확장 생성에는 권한이 필요해서 관리형 DB 에서는 막혀 있을 수 있다.
    await optionalIndex(
      '제목 부분일치',
      `CREATE EXTENSION IF NOT EXISTS pg_trgm;
       CREATE INDEX IF NOT EXISTS "IDX_reference_title_trgm"
         ON "clinical_references" USING GIN ("title" gin_trgm_ops);
       CREATE INDEX IF NOT EXISTS "IDX_reference_title_ko_trgm"
         ON "clinical_references" USING GIN ("titleKo" gin_trgm_ops);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "clinical_references"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reference_evidence_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reference_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reference_source_enum"`);
  }
}
