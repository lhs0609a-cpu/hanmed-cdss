import { Repository } from 'typeorm';
import { ClinicalCase } from '../entities/clinical-case.entity';

/**
 * 치험례 내용 중복 판정.
 *
 * 왜 sourceId 로 안 되는가:
 *   같은 진료가 여러 문서에 실려 있다. 이종대 선생이 밴드에 올린 사례가
 *   방약합편에도 실리고, 고령자채록 모음집은 아예 "방약합편에서 발췌"라고
 *   머리말에 적혀 있다. 출처가 다르니 sourceId 도 다르고, 유니크 제약은
 *   이걸 통과시킨다. 실측으로 방약합편 3,320건 중 1,415건이 이미 DB 에
 *   있었다(2026-09).
 *
 *   같은 진료를 두 번 보여주면 "치험례 1만 건"이라는 숫자만 커지고 한의사는
 *   검색 결과에서 같은 화면을 두 번 읽는다. 그건 자료가 는 게 아니라
 *   검색이 나빠진 것이다.
 */
export class CaseDeduper {
  /** 기존 원문을 공백 제거해 한 덩어리로 이어 붙인 것 */
  private haystack = '';

  private constructor(haystack: string) {
    this.haystack = haystack;
  }

  /**
   * 기존 원문을 전부 메모리에 올린다.
   *
   * 6,454행이 약 12MB 다. 후보마다 LIKE 를 던지면 수천 번의 순차 스캔이 되어
   * 훨씬 느리다. 코퍼스가 10만 건을 넘으면 그때 방식을 바꿔야 한다 —
   * 그 시점이 오면 originalText 정규화 해시 컬럼과 인덱스가 답이다.
   */
  static async load(repo: Repository<ClinicalCase>): Promise<CaseDeduper> {
    const rows = await repo
      .createQueryBuilder('c')
      .select(['c.id', 'c.originalText'])
      .getMany();
    const haystack = rows
      .map((r) => CaseDeduper.normalize(r.originalText || ''))
      .join(' ');
    console.log(
      `  중복판정 기준: 기존 ${rows.length}건 / ${(haystack.length / 1e6).toFixed(1)}MB`,
    );
    return new CaseDeduper(haystack);
  }

  static normalize(text: string): string {
    return text.replace(/\s+/g, '');
  }

  /**
   * 본문 중간 세 군데를 24자씩 뽑아 하나라도 걸리면 같은 사례로 본다.
   *
   * 앞머리를 쓰지 않는 이유: 처방명과 인적사항("○ ○ ○ 남 45세 태음인")은
   * 다른 사례끼리도 닮아서 남의 사례를 중복으로 오인한다. 본문 중간은
   * 그 환자에게만 있는 서술이다.
   */
  isDuplicate(text: string): boolean {
    const norm = CaseDeduper.normalize(text);
    if (norm.length < 150) return false;
    return [0.35, 0.5, 0.65].some((ratio) => {
      const at = Math.floor(norm.length * ratio);
      const probe = norm.slice(at, at + 24);
      return probe.length >= 20 && this.haystack.includes(probe);
    });
  }

  /** 이번 실행에서 새로 넣은 것도 다음 후보의 판정 기준이 되어야 한다. */
  add(text: string): void {
    this.haystack += ' ' + CaseDeduper.normalize(text);
  }
}
