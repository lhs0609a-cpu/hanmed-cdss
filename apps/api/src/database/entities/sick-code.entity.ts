import { Entity, Column, PrimaryColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 한국표준질병사인분류(KCD) 중 한의과에서 쓰는 상병.
 *
 * 왜 우리가 들고 있는가 — 한의사는 청구 때문에 이 코드를 매일 찾는다.
 * "요통 상병코드" 로 검색해 들어올 자리가 우리에게 없었다. 우리 사이트의
 * 근거 쪽 7만 6천은 이미 답을 아는 사람이 오는 자리인데, 이건 아직 우리를
 * 모르는 사람이 들어오는 입구다.
 *
 * 원자료는 공공데이터포털 B551182 질병정보서비스이고, 한의과 상병은
 * `sickType=2 & medTp=2` 조합으로 15,923건이다. 두 파라미터 중 하나라도
 * 빠지면 0건이 온다 — 필터가 아니라 필수값이다. 응답은 XML 만 준다.
 *
 * 요청 때마다 부르지 않는다. 우리 API 는 도쿄에서 도는데 거기서 data.go.kr
 * 을 부르면 해외 IP 스로틀에 걸린다(비급여에서 겪었다). 미리 받아 여기
 * 담아 두고 화면은 DB 만 읽는다. 갱신은 sync-sick-codes 로 한다.
 *
 * 상위코드를 칼럼으로 두지 않는다. KCD 는 앞 세 글자가 곧 상위 분류라
 * `code` 에서 그대로 구해진다 — 따로 저장하면 원자료가 바뀔 때 두 값이
 * 어긋나고, 어긋난 쪽을 사람이 알아채기 어렵다.
 */
@Entity('sick_codes')
@Index(['nameKo'])
export class SickCode {
  /**
   * KCD 코드. A00 · A000 · M5416 꼴이고 전부 영숫자라 주소에 그대로 쓴다.
   * 실측 15,923건 모두 `[A-Z][0-9A-Z]{2,6}` 을 만족한다.
   */
  @PrimaryColumn({ type: 'varchar', length: 16 })
  code: string;

  /** 한글 상병명. 15,923건 모두 비어 있지 않다. */
  @Column({ type: 'varchar', length: 500 })
  nameKo: string;

  /** 영문 상병명. */
  @Column({ type: 'varchar', length: 700, default: '' })
  nameEn: string;

  /**
   * 글자 수. 3이면 분류(콜레라), 4 이상이면 그 아래 세부 상병이다.
   * 질의에서 자주 갈라 쓰므로 세어 두고 인덱스를 건다.
   */
  @Index()
  @Column({ type: 'smallint' })
  depth: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
