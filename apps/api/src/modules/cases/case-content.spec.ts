import {
  toTeaserCase,
  toFullCase,
  embedZeroWidthWatermark,
  extractZeroWidthWatermark,
  buildWatermarkLabel,
  LOCKED_CASE_FIELDS,
  DISTINCTIVE_TEASER_CHARS,
} from './case-content';
import { ClinicalCase } from '../../database/entities/clinical-case.entity';

/**
 * 치험례 본문 보호의 두 축을 검증한다.
 *
 *  1. 미끼 변환이 잠금 필드를 절대 흘리지 않는다 — 이게 새면 방어 전체가 무의미하다.
 *  2. 워터마크가 심어지고 다시 뽑힌다 — 왕복이 깨지면 유출본을 받아도 역추적을 못 한다.
 *
 * 워터마크 왕복은 특히 회귀에 약하다. 제로폭 문자는 눈에 안 보여서 코드를 만지다
 * 깨져도 화면에서는 아무 이상이 없다. 유출 사고가 나서야 안 되는 걸 알게 된다.
 */

const sampleCase = (): ClinicalCase =>
  ({
    id: 'case-1',
    sourceId: 'src-1',
    summaryOneLine: '소음인 노인의 만성 딸꾹질을 정향시체산으로 잡은 사례',
    chiefComplaint: '은 풍치와 함께 딸꾹질이 멎지 않아',
    patternDiagnosis: '위한증',
    treatmentOutcome: '완치',
    patientGender: 'M',
    patientAgeRange: '65',
    patientConstitution: '소음인',
    keyFindings: ['설담백', '맥침지'],
    recorderName: '온고지신 DB',
    recordedYear: 1998,
    symptoms: [{ name: '딸꾹질' }, '오한'],
    herbalFormulas: [{ formulaName: '정향시체산', formulaHanja: '丁香柿蒂散' }],
    verifiedFormulaName: '정향시체산',
    formulaMismatch: false,
    hasMixedContent: false,
    // 잠금 대상
    originalText: '초진 ① 딸꾹질이 밤새 멎지 않는다.\n\n재진 ② 복약 후 잦아들었다.',
    patternReasoning: '중초가 허한하여 위기가 상역한 것으로 본다.',
    modification: '오한이 심해 건강을 증량했다.',
    courseSteps: [{ step: '3일', change: '딸꾹질 간격이 벌어짐' }],
    // 60자 컷을 실제로 타도록 넉넉히 길게 — 짧으면 통째로 나가서 검증이 무의미해진다.
    distinctive:
      '딸꾹질만 보고 위열로 접근하기 쉬우나 설담백·맥침지가 한증을 가리킨다는 점이 이 사례의 갈림길이다. 위열로 보고 죽여·석고를 쓰면 오히려 중초가 더 차가워져 딸꾹질이 굳어진다.',
    clinicalNotes: '7일 복약 후 소실, 3개월 추적에서 재발 없음.',
  }) as unknown as ClinicalCase;

describe('toTeaserCase', () => {
  it('잠금 필드를 하나도 담지 않는다', () => {
    const teaser = toTeaserCase(sampleCase()) as unknown as Record<string, unknown>;
    for (const field of LOCKED_CASE_FIELDS) {
      expect(teaser).not.toHaveProperty(field);
    }
  });

  it('감별 포인트는 앞부분만 흘리고 전문은 주지 않는다', () => {
    const c = sampleCase();
    const teaser = toTeaserCase(c);
    expect(teaser.distinctivePreview).not.toBeNull();
    expect(teaser.distinctivePreview!.length).toBeLessThanOrEqual(
      DISTINCTIVE_TEASER_CHARS + 1, // 말줄임표 한 글자
    );
    expect(teaser.distinctivePreview).not.toBe(c.distinctive);
    expect(teaser.locked).toBe(true);
  });

  it('요약이 있으면 잘린 주소증 대신 요약을 제목으로 쓴다', () => {
    const teaser = toTeaserCase(sampleCase());
    expect(teaser.title).toBe('소음인 노인의 만성 딸꾹질을 정향시체산으로 잡은 사례');
  });

  it('엔티티에 새 컬럼이 생겨도 화이트리스트 밖이면 나가지 않는다', () => {
    const c = { ...sampleCase(), 어떤새컬럼: '민감한 값' } as unknown as ClinicalCase;
    expect(toTeaserCase(c)).not.toHaveProperty('어떤새컬럼');
  });
});

describe('제로폭 워터마크', () => {
  const traceId = 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

  it('심은 뒤 다시 뽑으면 traceId 앞 8자가 나온다', () => {
    const marked = embedZeroWidthWatermark('환자는 65세 남성이다.', traceId);
    expect(extractZeroWidthWatermark(marked)).toBe('a1b2c3d4');
  });

  it('보이는 글자는 하나도 바꾸지 않는다 — 처방·용량이 틀어지면 임상 사고다', () => {
    const text = '정향시체산 3첩, 건강 8g 증량.';
    const marked = embedZeroWidthWatermark(text, traceId);
    // 제로폭 문자만 걷어내면 원문과 완전히 같아야 한다.
    expect(marked.replace(/[\u200B\u200C\u200D]/g, '')).toBe(text);
  });

  it('문단 일부만 복사해 가도 복원된다', () => {
    const marked = embedZeroWidthWatermark(
      '첫 문단이다.\n\n둘째 문단이다.\n\n셋째 문단이다.',
      traceId,
    );
    // 가운데 문단만 잘라 간 사본
    const middle = marked.slice(marked.indexOf('둘째') - 20, marked.indexOf('셋째'));
    expect(extractZeroWidthWatermark(middle)).toBe('a1b2c3d4');
  });

  it('워터마크가 없는 텍스트에서는 null 을 준다', () => {
    expect(extractZeroWidthWatermark('그냥 옮겨 적은 텍스트')).toBeNull();
    expect(extractZeroWidthWatermark('')).toBeNull();
  });
});

describe('toFullCase', () => {
  const watermark = {
    label: '홍길동 · 면허 12345 · 온고지신',
    issuedAt: '2026-08-28T00:00:00.000Z',
    traceId: 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  };

  it('본문에 열람자 워터마크를 심어 내보낸다', () => {
    const full = toFullCase(sampleCase(), watermark);
    expect(extractZeroWidthWatermark(full.originalText)).toBe('a1b2c3d4');
    expect(extractZeroWidthWatermark(full.patternReasoning!)).toBe('a1b2c3d4');
    expect(full.locked).toBe(false);
    expect(full.watermark).toEqual(watermark);
  });

  it('미끼 필드도 그대로 함께 준다 — 프론트가 두 응답을 합치지 않아도 되게', () => {
    const full = toFullCase(sampleCase(), watermark);
    expect(full.title).toBe(toTeaserCase(sampleCase()).title);
    expect(full.distinctive).toBe(sampleCase().distinctive);
  });
});

describe('buildWatermarkLabel', () => {
  it('이름과 면허번호를 함께 박는다 — 화면 촬영본에서 사람을 특정하는 근거', () => {
    expect(buildWatermarkLabel({ name: '홍길동', licenseNumber: '12345' })).toBe(
      '홍길동 · 면허 12345 · 온고지신',
    );
  });

  it('이름이 없으면 이메일로 대신한다', () => {
    expect(buildWatermarkLabel({ email: 'a@b.com' })).toBe('a@b.com · 온고지신');
  });
});
