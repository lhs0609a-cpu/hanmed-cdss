import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** 지역 코드 → { 최저, 중간, 평균, 최고 }. 값이 없는 지역은 키 자체가 없다. */
export interface NonPayRegionStat {
  min: number | null;
  median: number | null;
  average: number | null;
  max: number | null;
}

/**
 * 심평원 비급여 진료비용 — 항목별·지역별 가격 통계.
 *
 * 원자료는 공공데이터포털(B551182 비급여진료비정보서비스)에 있고 월 1회 갱신된다.
 * 그런데 우리 API 는 도쿄에서 도는데, 거기서 data.go.kr 을 부르면 5건 받는 데
 * 35초가 걸린다(해외 IP 스로틀로 보인다). 요청 때마다 부르는 건 불가능하다.
 *
 * 그래서 미리 받아 여기에 담아 두고, 화면은 DB 만 읽는다.
 * 갱신은 sync-nonpay-prices 로 한다.
 */
@Entity('nonpay_prices')
@Index(['category'])
export class NonPayPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 심평원 비급여코드 */
  @Column({ type: 'varchar', length: 32, unique: true })
  code: string;

  /** "한방 시술 및 처치료/추나요법/단순추나" 원문 */
  @Column({ type: 'varchar', length: 400 })
  fullName: string;

  /** 분류(첫 조각) — 한방 항목만 담으므로 필터 겸용 */
  @Column({ type: 'varchar', length: 100 })
  category: string;

  /** 화면에 쓰는 이름(분류를 뺀 나머지) */
  @Column({ type: 'varchar', length: 300 })
  name: string;

  /** 심평원 자료 적용시작일 (YYYYMMDD) */
  @Column({ type: 'varchar', length: 8, nullable: true })
  appliedOn: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  regions: Record<string, NonPayRegionStat>;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
