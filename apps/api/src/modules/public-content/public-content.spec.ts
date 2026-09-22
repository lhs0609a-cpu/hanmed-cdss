import { NotFoundException } from '@nestjs/common';
import { CaseCorpus } from '../../database/entities/clinical-case.entity';
import { PublicContentService } from './public-content.service';
import { CLASSICAL_BOOKS, caseSlug, formulaSlug, parseCaseSlug } from './public-slug';

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

const caseRow = {
  sourceId: 'jicheng-臨證指南醫案-1252',
  recordedYear: 1746,
  sourceEdition: '乾隆丙戌31年刊本',
  chiefComplaint: '濕',
  summaryOneLine: '우씨가 적취에 조열약을 잘못 먹고 유열이 격으로 올라 가감했다',
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
    const service = new PublicContentService(cases, repo([]));
    await service.listCases();
    const where = cases.calls[0].where;
    expect(where.corpus).toBe(CaseCorpus.CLASSICAL);
    expect(where.hasMixedContent).toBe(false);
    expect(where.formulaMismatch).toBe(false);
    expect(where).toHaveProperty('excludedReason');
    expect(where).toHaveProperty('sourceEdition');
  });

  it('티저 칼럼만 읽는다 — 처방·경과·원문은 질의에 들어가지 않는다', async () => {
    const cases = repo([caseRow]);
    const service = new PublicContentService(cases, repo([]));
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
    const service = new PublicContentService(repo([caseRow]), repo([]));
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
    const service = new PublicContentService(repo([]), repo([]));
    await expect(service.getCase('없는책-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getCase('임증지남의안-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('책 필터는 질의에서 걸어 한 쪽 분량이 줄지 않게 한다', async () => {
    const cases = repo([caseRow]);
    const service = new PublicContentService(cases, repo([]));
    await service.listCases(1, 20, '오국통의안');
    expect(JSON.stringify(cases.calls[0].where.sourceId)).toContain('吳鞠通醫案');
    const unknown = await service.listCases(1, 20, '없는책');
    expect(unknown.items).toEqual([]);
    expect(unknown.total).toBe(0);
  });

  it('한 번에 가져갈 수 있는 양을 제한한다', async () => {
    const cases = repo([caseRow]);
    const service = new PublicContentService(cases, repo([]));
    await service.listCases(1, 5000);
    expect(cases.calls[0].take).toBeLessThanOrEqual(50);
    await service.listCases(-3, -1);
    expect(cases.calls[1].skip).toBe(0);
    expect(cases.calls[1].take).toBeGreaterThan(0);
  });

  it('처방도 구성 약재와 금기는 질의하지 않는다', async () => {
    const formulas = repo([formulaRow]);
    const service = new PublicContentService(repo([]), formulas);
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

  it('사이트맵은 주소를 만들 수 있는 것만 싣는다', async () => {
    const service = new PublicContentService(
      repo([caseRow, { ...caseRow, sourceId: 'excel-1562' }]),
      repo([formulaRow, { ...formulaRow, name: '갈근탕 / 계지탕' }]),
    );
    const { cases, formulas } = await service.sitemapEntries();
    expect(cases).toEqual([{ slug: '임증지남의안-1252', lastmod: '2026-09-01' }]);
    expect(formulas).toEqual([{ slug: '소청룡탕', lastmod: '2026-09-01' }]);
  });
});
