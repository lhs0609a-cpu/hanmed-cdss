import { parseSickXml, SICK_CODE_PATTERN } from './sync-sick-codes';

/**
 * 심평원 질병정보서비스 응답 파싱.
 *
 * 아래 XML 은 지어낸 것이 아니라 실제 응답에서 잘라 온 모양이다
 * (getDissNameCodeList1, sickType=2&medTp=2). 원자료가 바뀌면 여기서 먼저
 * 깨져야 한다 — 15,923쪽이 조용히 빈 이름으로 나가는 것보다 낫다.
 */
const SAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
<body><items>
<item><sickCd>A00</sickCd><sickEngNm>Cholera</sickEngNm><sickNm>콜레라</sickNm></item>
<item><sickCd>A000</sickCd><sickEngNm>Cholera due to Vibrio cholerae 01, biovar cholerae</sickEngNm><sickNm>비브리오 콜레라 01 콜레라형균에 의한 콜레라</sickNm></item>
<item><sickCd>M542</sickCd><sickEngNm>Cervicalgia</sickEngNm><sickNm>경추통</sickNm></item>
</items><numOfRows>3</numOfRows><pageNo>1</pageNo><totalCount>15923</totalCount></body></response>`;

describe('parseSickXml', () => {
  it('코드·한글명·영문명을 뽑는다', () => {
    const rows = parseSickXml(SAMPLE);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      code: 'A00',
      nameKo: '콜레라',
      nameEn: 'Cholera',
    });
    expect(rows[2].nameKo).toBe('경추통');
  });

  it('영문명이 없어도 버리지 않는다 — 코드와 한글명이 본체다', () => {
    const rows = parseSickXml(
      '<item><sickCd>U118</sickCd><sickEngNm></sickEngNm><sickNm>담음</sickNm></item>',
    );
    expect(rows).toEqual([{ code: 'U118', nameKo: '담음', nameEn: '' }]);
  });

  it('한글명이 비면 버린다 — 이름 없는 쪽을 만들지 않는다', () => {
    expect(
      parseSickXml('<item><sickCd>A00</sickCd><sickNm></sickNm></item>'),
    ).toEqual([]);
  });

  it('주소로 쓸 수 없는 코드는 버린다', () => {
    const rows = parseSickXml(
      '<item><sickCd>A 0/0</sickCd><sickNm>이상한것</sickNm></item>' +
        '<item><sickCd>M542</sickCd><sickNm>경추통</sickNm></item>',
    );
    expect(rows.map((r) => r.code)).toEqual(['M542']);
  });

  it('item 이 없으면 빈 배열 — 마지막 쪽에서 멈출 근거가 된다', () => {
    expect(parseSickXml('<body><items></items></body>')).toEqual([]);
  });
});

describe('SICK_CODE_PATTERN', () => {
  it.each(['A00', 'A000', 'M542', 'U1180', 'Z998'])('%s 는 통과', (code) => {
    expect(SICK_CODE_PATTERN.test(code)).toBe(true);
  });

  it.each(['a00', 'A0', '00A', 'A 00', 'A/00', 'A00000000'])(
    '%s 는 거부',
    (code) => {
      expect(SICK_CODE_PATTERN.test(code)).toBe(false);
    },
  );
});
