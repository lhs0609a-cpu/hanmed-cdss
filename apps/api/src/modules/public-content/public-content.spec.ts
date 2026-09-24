import { NotFoundException } from '@nestjs/common';
import { CaseCorpus } from '../../database/entities/clinical-case.entity';
import { MAX_LIMIT, PublicContentService } from './public-content.service';
import {
  CASE_SOURCE_ID_PATTERN,
  CLASSICAL_BOOKS,
  caseSlug,
  formulaSlug,
  herbSlug,
  journalSlug,
  parseCaseSlug,
  parseReferenceSlug,
  referenceSlug,
  sourceLine,
} from './public-slug';

/** 저장소가 어떤 조건으로 불렸는지 기록하는 가짜. */
function repo(rows: any[]) {
  const calls: any[] = [];
  return {
    calls,
    find: jest.fn(async (options: any) => {
      calls.push(options);
      return rows;
    }),
    findOne: jest.fn(async (options: any) => {
      calls.push(options);
      return rows[0] ?? null;
    }),
    findAndCount: jest.fn(async (options: any) => {
      calls.push(options);
      return [rows, rows.length];
    }),
  } as any;
}

/** Raw() 가 안쪽에 감춰 둔 조건식 생성기를 꺼내 실제 SQL 을 본다. */
function rawSql(operator: any, alias = 'name'): string {
  const generator = operator?._getSql ?? operator?.getSql;
  return typeof generator === 'function' ? String(generator(alias)) : '';
}

/**
 * 저장소를 네 개 다 적지 않아도 되게 하는 도우미. 본초·문헌이 붙으면서
 * 생성자가 길어졌는데, 의안만 보는 시험이 나머지 셋을 적어야 할 이유는 없다.
 */
const svc = (
  cases: any = repo([]),
  formulas: any = repo([]),
  herbs: any = repo([]),
  references: any = repo([]),
) => new PublicContentService(cases, formulas, herbs, references);

const caseRow = {
  sourceId: 'jicheng-臨證指南醫案-1252',
  recordedYear: 1746,
  sourceEdition: '乾隆丙戌31年刊本',
  chiefComplaint: '濕',
  summaryOneLine: '우씨가 적취에 조열약을 잘못 먹고 유열이 격으로 올라 가감했다',
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

const herbRow = {
  standardName: '위령선',
  hanjaName: '威靈仙',
  aliases: ['철선련', '으아리뿌리'],
  category: '거풍습약',
  scientificName: 'Clematis terniflora var. mandshurica (Rupr.) Ohwi',
  latinName: 'Clematidis Radix',
  englishName: 'Clematis Root',
  medicinalPart: '뿌리 및 뿌리줄기',
  pharmacopoeia: 'KP/KHP',
  taxonomy: '미나리아재비과 (Ranunculaceae)',
  properties: { text: '性은 溫성하고 味는 辛鹹하다.' },
  meridianTropism: ['방광경'],
  efficacy: '祛風除濕, 通絡止痛.',
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

const referenceRow = {
  source: 'kci',
  externalId: 'ART000856342',
  title: 'Effect of Acupuncture on Chronic Low Back Pain',
  titleKo: '만성 요통에 대한 침 치료의 효과',
  summaryKo: '만성 요통 환자를 대상으로 침 치료군과 대조군을 비교한 연구다.',
  abstract: 'PUBLISHER ABSTRACT TEXT',
  abstractKo: '배경·방법·결과·한계를 정리한 구조 요약.',
  authors: ['홍길동'],
  journal: '대한침구의학회지',
  publishedYear: 2024,
  doi: '10.1234/abcd',
  url: 'https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART000856342',
  keywords: ['acupuncture', 'low back pain'],
  category: 'acupuncture',
  evidenceType: 'rct',
  language: 'ko',
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

const formulaRow = {
  name: '소청룡탕',
  hanja: '小靑龍湯',
  aliases: ['소청용탕'],
  category: '해표제',
  source: '상한론',
  indication: '오한 발열, 해수 천식',
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

describe('공개 주소', () => {
  it('책과 번호를 함께 써야 서로 다른 기록이 같은 주소로 뭉개지지 않는다', () => {
    expect(caseSlug('jicheng-臨證指南醫案-1252')).toBe('임증지남의안-1252');
    expect(caseSlug('jicheng-吳鞠通醫案-1252')).toBe('오국통의안-1252');
    expect(caseSlug('jicheng-臨證指南醫案-1252')).not.toBe(
      caseSlug('jicheng-吳鞠通醫案-1252'),
    );
  });

  it('공개 대상 7종을 모두 되돌릴 수 있다', () => {
    for (const book of CLASSICAL_BOOKS) {
      const slug = caseSlug(`jicheng-${book.hanja}-7`);
      expect(slug).toBe(`${book.korean}-7`);
      expect(parseCaseSlug(slug!)).toBe(`jicheng-${book.hanja}-7`);
    }
  });

  it('모르는 책과 한국 임상 기록은 주소를 갖지 못한다', () => {
    expect(caseSlug('jicheng-未知醫案-1')).toBeNull();
    expect(caseSlug('excel-1562')).toBeNull();
    expect(caseSlug('jicheng-臨證指南醫案-abc')).toBeNull();
  });

  it('조작된 주소로 다른 기록을 긁을 수 없다', () => {
    for (const bad of [
      '임증지남의안-1252; DROP TABLE',
      '없는책-1',
      '임증지남의안-',
      '-1252',
      '임증지남의안-99999999999',
      '../../etc/passwd',
    ])
      expect(parseCaseSlug(bad)).toBeNull();
  });

  it('경로를 깨뜨리는 처방 이름은 공개하지 않는다', () => {
    expect(formulaSlug('소청룡탕')).toBe('소청룡탕');
    expect(formulaSlug('가미소요산(합)')).toBe('가미소요산(합)');
    expect(formulaSlug('갈근탕 / 계지탕')).toBeNull();
    expect(formulaSlug('?a=1')).toBeNull();
    expect(formulaSlug('  ')).toBeNull();
  });
});

describe('공개 콘텐츠', () => {
  it('고전 의안만, 심사와 출처를 통과한 것만 읽는다', async () => {
    const cases = repo([caseRow]);
    const service = svc(cases, repo([]));
    await service.listCases();
    const where = cases.calls[0].where;
    expect(where.corpus).toBe(CaseCorpus.CLASSICAL);
    expect(where.hasMixedContent).toBe(false);
    expect(where.formulaMismatch).toBe(false);
    expect(where).toHaveProperty('excludedReason');
    // 책은 질의에서 건다. 읽어 온 뒤 자바스크립트로 확인하면 total 과
    // items 가 어긋나고, 그 숫자를 믿는 쪽은 끝나지 않는 쪽 넘기기를 돈다.
    expect(rawSql(where.sourceId, '"sourceId"')).toContain(':casePattern');
  });

  it('확인한 책만 공개한다 — 목록에 없는 책은 질의가 거른다', () => {
    const pattern = new RegExp(CASE_SOURCE_ID_PATTERN);
    expect(pattern.test('jicheng-臨證指南醫案-1252')).toBe(true);
    expect(pattern.test('jicheng-張聿青醫案-7')).toBe(true);
    // 저자를 원 자료가 비워 둔 책. 확인 전에는 공개하지 않는다.
    expect(pattern.test('jicheng-曹滄洲醫案-1')).toBe(false);
    expect(pattern.test('jicheng-環溪草堂醫案-1')).toBe(false);
    expect(pattern.test('excel-1562')).toBe(false);
  });

  it('영인본 표기가 없으면 저자와 연도로 출처를 적는다', () => {
    // 그 칸은 원 자료가 영인본을 적어 줬을 때만 찬다. 없다고 출처를 비우면
    // 문헌 기록이 아니라 출처 불명의 글이 된다.
    expect(sourceLine('jicheng-臨證指南醫案-1', '乾隆丙戌31年刊本')).toBe(
      '乾隆丙戌31年刊本',
    );
    expect(sourceLine('jicheng-張聿青醫案-1', null)).toBe('張聿青, 1897');
    expect(sourceLine('jicheng-劍慧草堂醫案-1', null)).toBe('臥雲山人');
    expect(sourceLine('jicheng-曹滄洲醫案-1', null)).toBeNull();
  });

  it('티저 칼럼만 읽는다 — 처방·경과·원문은 질의에 들어가지 않는다', async () => {
    const cases = repo([caseRow]);
    const service = svc(cases, repo([]));
    await service.getCase('임증지남의안-1252');
    const select: string[] = cases.calls[0].select;
    for (const gated of [
      'herbalFormulas',
      'courseSteps',
      'originalText',
      'translationKo',
      'modification',
      'patternReasoning',
      'clinicalNotes',
      'keyFindings',
      'distinctive',
    ])
      expect(select).not.toContain(gated);
  });

  it('응답에 가려야 할 내용이 실리지 않는다', async () => {
    const service = svc(repo([caseRow]), repo([]));
    const teaser = await service.getCase('임증지남의안-1252');
    const body = JSON.stringify(teaser);
    expect(teaser.title).toBe(caseRow.summaryOneLine);
    expect(teaser.book).toBe('임증지남의안');
    for (const key of [
      'herbalFormulas',
      'courseSteps',
      'originalText',
      'translationKo',
      'patientGender',
      'patientAgeRange',
    ])
      expect(body).not.toContain(key);
    expect(teaser.locked.length).toBeGreaterThan(0);
  });

  it('없는 주소는 404 — 무엇이 있는지 알려주지 않는다', async () => {
    const service = svc(repo([]), repo([]));
    await expect(service.getCase('없는책-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getCase('임증지남의안-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('책 필터는 질의에서 걸어 한 쪽 분량이 줄지 않게 한다', async () => {
    const cases = repo([caseRow]);
    const service = svc(cases, repo([]));
    await service.listCases(1, 20, '오국통의안');
    expect(JSON.stringify(cases.calls[0].where.sourceId)).toContain('吳鞠通醫案');
    const unknown = await service.listCases(1, 20, '없는책');
    expect(unknown.items).toEqual([]);
    expect(unknown.total).toBe(0);
  });

  it('한 번에 가져갈 수 있는 양을 제한한다', async () => {
    const cases = repo([caseRow]);
    const service = svc(cases, repo([]));
    await service.listCases(1, 5000);
    // 상한 값을 시험에 베껴 두면 값을 올릴 때 시험이 같이 안 바뀌어
    // "제한한다" 는 이름만 남고 실제로는 아무것도 확인하지 않게 된다.
    expect(cases.calls[0].take).toBe(MAX_LIMIT);
    await service.listCases(-3, -1);
    expect(cases.calls[1].skip).toBe(0);
    expect(cases.calls[1].take).toBeGreaterThan(0);
  });

  it('처방도 구성 약재와 금기는 질의하지 않는다', async () => {
    const formulas = repo([formulaRow]);
    const service = svc(repo([]), formulas);
    const teaser = await service.getFormula('소청룡탕');
    const select: string[] = formulas.calls[0].select;
    for (const gated of [
      'formulaHerbs',
      'pathogenesis',
      'contraindications',
      'modifications',
      'insuranceCode',
    ])
      expect(select).not.toContain(gated);
    expect(teaser.indication).toBe(formulaRow.indication);
    expect(JSON.stringify(teaser)).not.toContain('pathogenesis');
  });

  it('처방 목록은 주소를 만들 수 있는 것만 세도록 질의에서 거른다', async () => {
    // 한자 이름을 걸러 내는 일을 질의가 해야 한다. 읽어 온 뒤 걸러 내면
    // total 이 404 인데 items 는 386 이 되고, 그 숫자를 믿는 쪽은 끝까지
    // 채우지 못해 멈추지 않는다.
    const formulas = repo([formulaRow]);
    const service = svc(repo([]), formulas);
    const listed = await service.listFormulas(1, 50);
    const where = formulas.calls[0].where;
    expect(where?.name).toBeDefined();
    // Raw() 는 조건식을 만드는 함수를 안쪽(_getSql)에 담는다. value 로 꺼내면
    // 이 버전에서는 함수가 아니라 파라미터 객체가 나와, 조건을 한 줄도 보지
    // 않은 채 빈 문자열을 비교하며 통과하는 시험이 된다.
    const sql = rawSql(where.name);
    expect(sql).toContain('btrim');
    expect(sql).toContain(':pattern');
    expect(listed.total).toBe(listed.items.length);

    // 사이트맵도 같은 조건으로 물어야 두 숫자가 어긋나지 않는다.
    const sitemapFormulas = repo([formulaRow]);
    await svc(repo([]), sitemapFormulas).sitemapEntries();
    expect(sitemapFormulas.calls[0].where?.name).toBeDefined();
  });

  it('본초도 용량과 배합 금기는 질의하지 않는다', async () => {
    const herbs = repo([herbRow]);
    const teaser = await svc(repo([]), repo([]), herbs).getHerb('위령선');
    const select: string[] = herbs.calls[0].select;
    for (const gated of [
      'contraindications',
      'activeCompounds',
      'compounds',
      'formulaHerbs',
      'pubmedReferences',
    ])
      expect(select).not.toContain(gated);
    expect(teaser.latinName).toBe('Clematidis Radix');
    expect(teaser.locked.length).toBeGreaterThan(0);
  });

  it('출판사 초록은 공개 응답에 실리지 않는다', async () => {
    // 초록 저작권은 대개 출판사에 있다. 인증한 한의사에게만 보인다는 결정이
    // 화면이 아니라 질의에서 지켜지는지 본다 — 화면에서 감추면 응답에는
    // 그대로 실려 나가고, 개발자도구만 열면 보인다.
    const references = repo([referenceRow]);
    const teaser = await svc(repo([]), repo([]), repo([]), references).getReference(
      'kci-ART000856342',
    );
    const select: string[] = references.calls[0].select;
    expect(select).not.toContain('abstract');
    expect(select).not.toContain('abstractKo');
    const body = JSON.stringify(teaser);
    expect(body).not.toContain('PUBLISHER ABSTRACT TEXT');
    // 우리가 쓴 한국어 요약은 우리 것이라 내보낸다 — 네이버가 읽을 본문이다.
    expect(teaser.summaryKo).toBe(referenceRow.summaryKo);
    expect(teaser.url).toContain('kci.go.kr');
  });

  it('조작된 문헌 주소로 다른 자료를 긁을 수 없다', () => {
    expect(referenceSlug('kci', 'ART000856342')).toBe('kci-ART000856342');
    expect(referenceSlug('hira', '2024-1')).toBeNull();
    expect(parseReferenceSlug('kci-ART000856342')).toEqual({
      source: 'kci',
      externalId: 'ART000856342',
    });
    for (const bad of [
      'pubmed-../../etc/passwd',
      'oasis-1',
      'pubmed-',
      '-123',
      "kci-ART1'; DROP TABLE",
    ])
      expect(parseReferenceSlug(bad)).toBeNull();
  });

  it('경로를 깨뜨리는 약재 이름은 공개하지 않는다', () => {
    expect(herbSlug('위령선')).toBe('위령선');
    expect(herbSlug('당귀(참당귀)')).toBe('당귀(참당귀)');
    expect(herbSlug('감초, 자감초')).toBeNull();
    expect(herbSlug('  ')).toBeNull();
  });

  it('학술지 이름은 공백을 허용하되 앞뒤 공백은 거른다', () => {
    // 영문 학술지는 공백이 이름의 일부다. 막으면 절반이 주소를 못 갖는다.
    expect(journalSlug('대한한방내과학회지')).toBe('대한한방내과학회지');
    expect(journalSlug('Journal of Ethnopharmacology')).toBe(
      'Journal of Ethnopharmacology',
    );
    // 앞뒤 공백만 다른 이름을 그대로 두면 같은 목록이 두 쪽이 된다.
    expect(journalSlug(' Phytotherapy Research')).toBeNull();
    expect(journalSlug('Phytotherapy Research ')).toBeNull();
    expect(journalSlug('학회지/부록')).toBeNull();
    expect(journalSlug('?a=1')).toBeNull();
    // 프리렌더가 주소마다 폴더를 만든다. 윈도가 폴더 이름에 못 쓰는 글자가
    // 섞이면 빌드가 그 자리에서 선다 — 실제로 세웠다.
    expect(
      journalSlug('Phytomedicine : international journal of phytotherapy'),
    ).toBeNull();
    expect(journalSlug('Medicine.')).toBeNull();
  });

  it('주소에서 온 학술지 이름은 규칙을 통과한 것만 질의에 넣는다', async () => {
    const references = repo([referenceRow]);
    const service = svc(repo([]), repo([]), repo([]), references);
    await service.listReferences(1, 20, { journal: '대한한방내과학회지' });
    expect(references.calls[0].where.journal).toBe('대한한방내과학회지');
    await service.listReferences(1, 20, { journal: '학회지/../etc' });
    expect(references.calls[1].where.journal).toBeUndefined();
  });

  it('사이트맵은 주소를 만들 수 있는 것만 싣는다', async () => {
    const service = svc(
      repo([caseRow, { ...caseRow, sourceId: 'excel-1562' }]),
      repo([formulaRow, { ...formulaRow, name: '갈근탕 / 계지탕' }]),
      repo([herbRow, { ...herbRow, standardName: '감초, 자감초' }]),
      repo([referenceRow, { ...referenceRow, source: 'oasis' }]),
    );
    const { cases, formulas, herbs, references } = await service.sitemapEntries();
    expect(cases).toEqual([{ slug: '임증지남의안-1252', lastmod: '2026-09-01' }]);
    expect(formulas).toEqual([{ slug: '소청룡탕', lastmod: '2026-09-01' }]);
    expect(herbs).toEqual([{ slug: '위령선', lastmod: '2026-09-01' }]);
    expect(references).toEqual([
      { slug: 'kci-ART000856342', lastmod: '2026-09-01' },
    ]);
  });
});
