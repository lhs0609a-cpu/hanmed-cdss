import { PostType } from '../../entities/enums';

/** 시드 글 하나. 조회수·좋아요는 두지 않는다 — 없는 인기를 만들지 않는다. */
export interface SeedPost {
  type: `${PostType}`;
  /** 제목이 곧 멱등 키다. 같은 제목이 이미 있으면 건너뛴다. */
  title: string;
  /** 마크다운 본문. 출처는 아래 sources 로 따로 두고 저장 시 말미에 붙인다. */
  content: string;
  tags: string[];
  /** 고정글. 캘린더 한 편에만 쓴다 — 여러 개 고정하면 고정의 의미가 없다. */
  isPinned?: boolean;
  /** 1차 출처. 링크가 없는 것(법령·통계)은 label 만 둔다. */
  sources: Array<{ label: string; url?: string }>;
}
