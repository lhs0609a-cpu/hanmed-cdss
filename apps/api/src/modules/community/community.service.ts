import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  Post,
  PostType,
  PostStatus,
} from '../../database/entities/post.entity';
import { Comment, CommentStatus } from '../../database/entities/comment.entity';
import { Category, CategoryPostType } from '../../database/entities/category.entity';
import { Tag } from '../../database/entities/tag.entity';
import { Bookmark } from '../../database/entities/bookmark.entity';
import { PostLike } from '../../database/entities/post-like.entity';
import { Report, ReportTargetType, ReportReason } from '../../database/entities/report.entity';
import { User, SubscriptionTier } from '../../database/entities/user.entity';
import {
  CreatePostDto,
  UpdatePostDto,
  CreateCommentDto,
  UpdateCommentDto,
  CreateReportDto,
  PostQueryDto,
} from './dto';

/**
 * 게시판 노릇을 하는 예약 태그.
 *
 * post.type 은 Postgres enum 이라 값을 늘리려면 운영 DB 에 ALTER TYPE 이
 * 필요하다. 이 DB 는 마이그레이션 이력이 이미 어긋나 있어 태그로 대신한다.
 * 화면 쪽 SUGGESTION_TAG / CLINICAL_TAG 와 같은 값이어야 한다.
 */
const RESERVED_BOARD_TAGS = ['건의사항', '임상정보'];

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(Bookmark)
    private bookmarksRepository: Repository<Bookmark>,
    @InjectRepository(PostLike)
    private likesRepository: Repository<PostLike>,
    @InjectRepository(Report)
    private reportsRepository: Repository<Report>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * 시드 글을 쓴 계정(운영팀) id.
   *
   * 종합 게시판에서 사람이 올린 글을 위로 올리는 데 쓴다. 계정 id 를
   * 코드에 박지 않고 role 로 찾는다 — 운영 계정이 늘거나 바뀌어도 따라간다.
   * 자주 바뀌지 않으니 프로세스 안에서 캐시한다.
   */
  private seedAuthorIdsCache: { ids: string[]; at: number } | null = null;

  private async getSeedAuthorIds(): Promise<string[]> {
    const TTL = 10 * 60 * 1000;
    if (this.seedAuthorIdsCache && Date.now() - this.seedAuthorIdsCache.at < TTL) {
      return this.seedAuthorIdsCache.ids;
    }
    const rows = await this.usersRepository.find({
      where: { role: 'content_manager' as User['role'] },
      select: { id: true },
    });
    const ids = rows.map((r) => r.id);
    this.seedAuthorIdsCache = { ids, at: Date.now() };
    return ids;
  }

  // ===== Posts =====

  async createPost(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 익명 게시 권한 확인
    if (createPostDto.isAnonymous && user.subscriptionTier === SubscriptionTier.FREE) {
      throw new ForbiddenException('익명 게시는 Pro 이상 구독자만 가능합니다.');
    }

    // 익명 닉네임 생성
    let anonymousNickname: string | undefined;
    if (createPostDto.isAnonymous) {
      const hash = crypto
        .createHash('sha256')
        .update(userId + new Date().toISOString().slice(0, 10))
        .digest('hex')
        .slice(0, 4);
      anonymousNickname = `익명의 한의사 #${hash.toUpperCase()}`;
    }

    // 태그 처리
    if (createPostDto.tags?.length) {
      await this.processTagsUsage(createPostDto.tags);
    }

    const post = this.postsRepository.create({
      ...createPostDto,
      authorId: userId,
      anonymousNickname,
    });

    const savedPost = await this.postsRepository.save(post);

    // 사용자 게시글 수 증가
    await this.usersRepository.increment({ id: userId }, 'postCount', 1);

    // 기여도 포인트 추가
    const points = this.getContributionPoints('post', user.subscriptionTier);
    await this.usersRepository.increment({ id: userId }, 'contributionPoints', points);

    return savedPost;
  }

  async findAllPosts(query: PostQueryDto) {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      sortBy = 'latest',
      search,
      tag,
      excludeTag,
      authorId,
      authorKind,
    } = query;

    const qb = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.linkedCase', 'linkedCase')
      .where('post.status = :status', { status: PostStatus.ACTIVE });

    // 필터링
    if (type) {
      qb.andWhere('post.type = :type', { type });
    }

    if (category) {
      qb.andWhere('category.slug = :category', { category });
    }

    if (search) {
      qb.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (tag) {
      // tags 는 simple-array — 실제 컬럼은 콤마로 이어붙인 text 다.
      // 배열 연산자(= ANY)를 그대로 쓰면 "requires array on right side" 로 터진다.
      // 부분일치(LIKE)로 때우면 '건의' 가 '건의사항' 을 잡아 다른 글까지 끌려온다.
      qb.andWhere(
        ":tag = ANY(string_to_array(COALESCE(post.tags, ''), ','))",
        { tag },
      );
    }

    if (excludeTag) {
      // 태그가 없는 글까지 빠지지 않게 COALESCE 로 빈 배열을 만든다.
      qb.andWhere(
        "NOT (:excludeTag = ANY(string_to_array(COALESCE(post.tags, ''), ',')))",
        { excludeTag },
      );
    }

    if (authorId) {
      qb.andWhere('post.authorId = :authorId', { authorId });
    }

    // 예약 태그로 모으는 게시판은 유형 목록에서 뺀다.
    //
    // 건의사항과 임상정보는 별도 post.type 이 없다. Postgres enum 이라
    // 값을 늘리려면 운영 DB 에 ALTER TYPE 이 필요해서 태그로 모은다.
    // 그런데 태그만 붙이면 원래 유형 게시판에도 그대로 남는다 — 문헌
    // 소개 2천 편을 임상정보로 옮겨도 전문 포럼에 똑같이 2천 편이 보인다.
    //
    // 그래서 유형으로 걸러 보는 중이고 태그 조건이 따로 없을 때만 뺀다.
    // 전체 목록(유형 없음)에서는 빼지 않는다 — 거기서까지 숨기면 글이
    // 어디에도 안 보이는 곳이 생긴다.
    if (type && !tag) {
      qb.andWhere(
        `NOT (post.tags IS NOT NULL AND string_to_array(post.tags, ',') && :reserved)`,
        { reserved: RESERVED_BOARD_TAGS },
      );
    }

    // 사람이 올린 글이 먼저다. 게시판을 가리지 않는다.
    //
    // 운영팀 시드가 최신순 위쪽을 다 차지하면, 눌러 들어온 사람은 동료가 쓴
    // 글을 한 편도 못 본다. 게시판이 살아 있는지 아닌지가 여기서 갈린다.
    // 처음에는 종합 게시판에만 걸었는데, 문헌·큐레이션을 Q&A 와 케이스
    // 토론까지 부으면 같은 일이 그 게시판들에서 벌어진다.
    //
    // 조인한 열로 정렬하면 페이지네이션이 만드는 DISTINCT 하위 질의와
    // 부딪히므로 posts 테이블만 보고 판단한다.
    const seedAuthorIds = await this.getSeedAuthorIds();
    const userFirst = seedAuthorIds.length > 0;

    // 누가 쓴 글만 볼지 고를 수 있게 한다.
    //
    //   human  동료 한의사가 쓴 글만
    //   team   운영팀이 정리해 둔 것만
    //
    // 시드가 사람 글보다 백 배 많은 게시판에서는 이 필터가 없으면 "사람
    // 글만 모아 보기" 가 아예 불가능하다.
    if (authorKind && userFirst) {
      qb.andWhere(
        authorKind === 'human'
          ? `post."authorId" NOT IN (:...seedAuthorIds)`
          : `post."authorId" IN (:...seedAuthorIds)`,
        { seedAuthorIds },
      );
    }

    // 고정 글이 맨 위. 그다음이 사람 글, 그다음이 고른 정렬이다.
    //
    // 예전에는 고정을 맨 마지막 addOrderBy 로 붙여서 앞선 정렬이 같을 때만
    // 효과가 있었다. 화면이 받아 온 20개를 다시 정렬해 가리고 있었을 뿐,
    // 2페이지로 밀린 공지는 어디에도 안 보였다.
    qb.orderBy('post.isPinned', 'DESC');

    if (userFirst) {
      // 정렬식을 먼저 select 에 올리고 그 별칭으로 정렬한다.
      //
      // ORDER BY 에 CASE 를 그대로 쓰면 목록이 통째로 500 이 난다.
      // skip/take 로 페이지를 자를 때 TypeORM 이 DISTINCT 하위 질의를
      // 만드는데, 그 안에서는 select 에 없는 식을 못 찾아
      // '"CASE WHEN post" alias was not found' 로 터진다. 조인(author,
      // category, linkedCase)이 있는 질의라 이 경로를 항상 탄다.
      qb.addSelect(
        `CASE WHEN post."authorId" IN (:...seedAuthorIds) THEN 1 ELSE 0 END`,
        'human_first',
      )
        .setParameter('seedAuthorIds', seedAuthorIds)
        .addOrderBy('human_first', 'ASC');
    }

    switch (sortBy) {
      case 'popular':
        qb.addOrderBy('post.likeCount', 'DESC');
        break;
      case 'views':
        qb.addOrderBy('post.viewCount', 'DESC');
        break;
      case 'comments':
        qb.addOrderBy('post.commentCount', 'DESC');
        break;
      default:
        qb.addOrderBy('post.createdAt', 'DESC');
    }
    // 같은 값이면 최신 글이 위로. 정렬이 흔들리면 페이지를 넘길 때 같은
    // 글이 두 번 보인다.
    if (sortBy !== 'latest') qb.addOrderBy('post.createdAt', 'DESC');

    const [posts, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // 익명 게시글 작성자 정보 숨기기
    const sanitizedPosts = posts.map((post) => this.sanitizePost(post));

    return {
      data: sanitizedPosts,
      meta: {
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPostById(id: string, userId?: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id, status: PostStatus.ACTIVE },
      relations: ['author', 'category', 'linkedCase', 'attachments'],
    });

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    // 조회수 증가
    await this.postsRepository.increment({ id }, 'viewCount', 1);

    return this.sanitizePost(post);
  }

  async updatePost(id: string, userId: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.authorId !== userId) throw new ForbiddenException('수정 권한이 없습니다.');

    // 태그 처리
    if (updatePostDto.tags?.length) {
      await this.processTagsUsage(updatePostDto.tags);
    }

    Object.assign(post, updatePostDto);
    return this.postsRepository.save(post);
  }

  async deletePost(id: string, userId: string): Promise<void> {
    const post = await this.postsRepository.findOne({ where: { id } });

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.authorId !== userId) throw new ForbiddenException('삭제 권한이 없습니다.');

    post.status = PostStatus.DELETED;
    await this.postsRepository.save(post);

    // 사용자 게시글 수 감소
    await this.usersRepository.decrement({ id: userId }, 'postCount', 1);
  }

  // ===== Comments =====

  async createComment(
    postId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 익명 댓글 권한 확인
    if (createCommentDto.isAnonymous && user.subscriptionTier === SubscriptionTier.FREE) {
      throw new ForbiddenException('익명 댓글은 Pro 이상 구독자만 가능합니다.');
    }

    // 익명 닉네임 생성
    let anonymousNickname: string | undefined;
    if (createCommentDto.isAnonymous) {
      const hash = crypto
        .createHash('sha256')
        .update(userId + new Date().toISOString().slice(0, 10))
        .digest('hex')
        .slice(0, 4);
      anonymousNickname = `익명의 한의사 #${hash.toUpperCase()}`;
    }

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      postId,
      authorId: userId,
      anonymousNickname,
    });

    const savedComment = await this.commentsRepository.save(comment);

    // 게시글 댓글 수 증가
    await this.postsRepository.increment({ id: postId }, 'commentCount', 1);

    // 사용자 댓글 수 증가
    await this.usersRepository.increment({ id: userId }, 'commentCount', 1);

    // 기여도 포인트 추가
    const points = this.getContributionPoints('comment', user.subscriptionTier);
    await this.usersRepository.increment({ id: userId }, 'contributionPoints', points);

    return savedComment;
  }

  async findCommentsByPostId(postId: string) {
    const comments = await this.commentsRepository.find({
      where: { postId, status: CommentStatus.ACTIVE, parentId: undefined },
      relations: ['author', 'replies', 'replies.author'],
      order: { createdAt: 'ASC' },
    });

    return comments.map((comment) => this.sanitizeComment(comment));
  }

  async updateComment(id: string, userId: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({ where: { id } });

    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.authorId !== userId) throw new ForbiddenException('수정 권한이 없습니다.');

    comment.content = updateCommentDto.content;
    return this.commentsRepository.save(comment);
  }

  async deleteComment(id: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({ where: { id } });

    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.authorId !== userId) throw new ForbiddenException('삭제 권한이 없습니다.');

    comment.status = CommentStatus.DELETED;
    await this.commentsRepository.save(comment);

    // 게시글 댓글 수 감소
    await this.postsRepository.decrement({ id: comment.postId }, 'commentCount', 1);

    // 사용자 댓글 수 감소
    await this.usersRepository.decrement({ id: userId }, 'commentCount', 1);
  }

  async acceptAnswer(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: ['post'],
    });

    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.post.authorId !== userId) {
      throw new ForbiddenException('게시글 작성자만 답변을 채택할 수 있습니다.');
    }
    if (comment.post.type !== PostType.QNA) {
      throw new BadRequestException('Q&A 게시글에서만 답변을 채택할 수 있습니다.');
    }

    // 기존 채택 취소
    await this.commentsRepository.update(
      { postId: comment.postId },
      { isAcceptedAnswer: false },
    );

    // 새 답변 채택
    comment.isAcceptedAnswer = true;
    await this.commentsRepository.save(comment);

    // 게시글 해결 상태 업데이트
    await this.postsRepository.update(
      { id: comment.postId },
      { isSolved: true, acceptedAnswerId: commentId },
    );

    // 답변자 채택 수 및 기여도 증가
    const answerer = await this.usersRepository.findOne({ where: { id: comment.authorId } });
    if (answerer) {
      const points = this.getContributionPoints('accepted', answerer.subscriptionTier);
      await this.usersRepository.increment({ id: comment.authorId }, 'acceptedAnswerCount', 1);
      await this.usersRepository.increment({ id: comment.authorId }, 'contributionPoints', points);
    }
  }

  // ===== Likes & Bookmarks =====

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean }> {
    const existing = await this.likesRepository.findOne({
      where: { postId, userId },
    });

    if (existing) {
      await this.likesRepository.remove(existing);
      await this.postsRepository.decrement({ id: postId }, 'likeCount', 1);
      return { liked: false };
    } else {
      await this.likesRepository.save({ postId, userId });
      await this.postsRepository.increment({ id: postId }, 'likeCount', 1);

      // 게시글 작성자에게 기여도 포인트 추가
      const post = await this.postsRepository.findOne({ where: { id: postId } });
      if (post && post.authorId !== userId) {
        await this.usersRepository.increment({ id: post.authorId }, 'contributionPoints', 1);
      }

      return { liked: true };
    }
  }

  async toggleBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    const existing = await this.bookmarksRepository.findOne({
      where: { postId, userId },
    });

    if (existing) {
      await this.bookmarksRepository.remove(existing);
      await this.postsRepository.decrement({ id: postId }, 'bookmarkCount', 1);
      return { bookmarked: false };
    } else {
      await this.bookmarksRepository.save({ postId, userId });
      await this.postsRepository.increment({ id: postId }, 'bookmarkCount', 1);
      return { bookmarked: true };
    }
  }

  async getUserBookmarks(userId: string, page = 1, limit = 20) {
    const [bookmarks, total] = await this.bookmarksRepository.findAndCount({
      where: { userId },
      relations: ['post', 'post.author', 'post.category'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: bookmarks.map((b) => this.sanitizePost(b.post)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===== Categories =====

  async findAllCategories() {
    return this.categoriesRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async findCategoriesByType(type: PostType) {
    return this.categoriesRepository.find({
      where: { postType: type as unknown as CategoryPostType, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  // ===== Tags =====

  /**
   * 게시판별 글 수.
   *
   * 왜 필요했나: 커뮤니티 첫 화면의 게시판 카드가 이름만 보여 줬다. 어디에
   * 글이 있는지 알 수 없으니 하나씩 눌러 보고 비어 있으면 되돌아 나온다.
   * 전문 포럼에 2천 편이 있고 케이스 토론이 비어 있다는 것을 들어가기 전에
   * 알 수 있어야 한다.
   *
   * 한 번의 GROUP BY 로 끝낸다. 카드마다 따로 세면 화면 하나에 요청이
   * 여섯 번 나간다.
   *
   * 삭제·신고된 글은 빼고 센다. 목록에 안 보이는 글을 세면 카드에 적힌
   * 숫자와 실제로 열리는 글 수가 어긋난다.
   */
  async countByBoard(userId?: string): Promise<{
    byType: Record<string, number>;
    suggestions: number;
    clinical: number;
    bookmarks: number;
    total: number;
  }> {
    // 목록과 같은 규칙으로 센다.
    //
    // 예약 태그로 옮긴 글을 목록에서는 빼면서 집계에서는 안 뺐다. 전문
    // 포럼 카드가 1,999편이라고 하는데 눌러 들어가면 13편이 나왔다.
    // 숫자가 거짓말을 하면 나머지 숫자도 못 믿게 된다.
    const rows = await this.postsRepository
      .createQueryBuilder('post')
      .select('post.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('post.status = :status', { status: PostStatus.ACTIVE })
      .andWhere(
        `NOT (post.tags IS NOT NULL AND string_to_array(post.tags, ',') && :reserved)`,
        { reserved: RESERVED_BOARD_TAGS },
      )
      .groupBy('post.type')
      .getRawMany<{ type: string; count: string }>();

    // 글이 없는 유형도 0 으로 채운다.
    //
    // GROUP BY 는 행이 있는 유형만 돌려준다. 케이스 토론처럼 아직 글이
    // 없는 게시판은 키가 아예 빠지고, 화면은 값이 없으니 숫자를 안 그렸다.
    // 다른 카드에는 숫자가 있는데 하나만 비어 있으면 고장으로 보인다.
    // 0 은 모르는 것이 아니라 아는 값이다.
    const byType: Record<string, number> = {};
    for (const t of Object.values(PostType)) byType[t] = 0;
    for (const r of rows) {
      byType[r.type] = parseInt(r.count, 10) || 0;
    }

    // 전체 건수는 예약 태그 글까지 센다. 전체 목록에는 그 글들도 나온다 —
    // 유형별 합계와 다른 것이 맞다.
    const total = await this.postsRepository.count({
      where: { status: PostStatus.ACTIVE },
    });

    // 건의사항과 임상정보는 별도 유형이 아니라 예약 태그다
    // (CommunityPage 의 SUGGESTION_TAG / CLINICAL_TAG). 목록 조회와 같은
    // 방식으로 센다 — LIKE 로 때우면 '건의' 가 '건의사항' 을 잡아 엉뚱한
    // 글까지 딸려 온다.
    const countByTag = (tag: string) =>
      this.postsRepository
        .createQueryBuilder('post')
        .where('post.status = :status', { status: PostStatus.ACTIVE })
        .andWhere(":tag = ANY(string_to_array(COALESCE(post.tags, ''), ','))", {
          tag,
        })
        .getCount();

    const [suggestions, clinical] = await Promise.all([
      countByTag('건의사항'),
      countByTag('임상정보'),
    ]);

    // 북마크는 사람마다 다르다. 로그인한 사람의 것만 센다.
    //
    // 예전에는 "서버가 합계로 세지 않는다" 는 이유로 숫자를 안 띄웠다.
    // 다시 보니 셀 수 있는 값이었다 — 못 세는 것과 안 센 것은 다르다.
    const bookmarks = userId
      ? await this.bookmarksRepository.count({ where: { userId } })
      : 0;

    return { byType, suggestions, clinical, bookmarks, total };
  }

  async findPopularTags(limit = 20) {
    return this.tagsRepository.find({
      order: { usageCount: 'DESC' },
      take: limit,
    });
  }

  async searchTags(query: string) {
    return this.tagsRepository
      .createQueryBuilder('tag')
      .where('tag.name ILIKE :query', { query: `%${query}%` })
      .orderBy('tag.usageCount', 'DESC')
      .take(10)
      .getMany();
  }

  // ===== Reports =====

  async createReport(
    userId: string,
    targetType: ReportTargetType,
    targetId: string,
    createReportDto: CreateReportDto,
  ): Promise<Report> {
    const report = this.reportsRepository.create({
      reporterId: userId,
      targetType,
      targetId,
      reason: createReportDto.reason as ReportReason,
      description: createReportDto.description,
    });

    return this.reportsRepository.save(report);
  }

  // ===== Helper Methods =====

  /**
   * 작성자에서 화면이 쓰는 것만 남긴다.
   *
   * relations: ['author'] 와 leftJoinAndSelect 는 users 행을 통째로 실어
   * 나른다. 그대로 응답에 실리면 passwordHash(bcrypt), totpSecretEncrypted,
   * twoFaBackupCodesEncrypted, tossBillingKey, 이메일, 면허 정보까지
   * 로그인한 아무나 목록 API 한 번으로 가져갈 수 있다.
   *
   * 엔티티에 select:false 를 걸면 로그인·2FA·결제까지 한꺼번에 영향을 받는다
   * (그 필드들을 읽는 곳이 44군데다). 그래서 나가는 길목에서 좁힌다 —
   * 모든 반환 경로가 sanitizePost / sanitizeComment 를 지난다.
   *
   * 프런트 CommunityAuthor 가 쓰는 필드만 남긴다.
   */
  private publicAuthor(author?: User | null): User | undefined {
    if (!author) return author ?? undefined;
    return {
      id: author.id,
      name: author.name,
      isLicenseVerified: author.isLicenseVerified,
      subscriptionTier: author.subscriptionTier,
      contributionPoints: author.contributionPoints,
      acceptedAnswerCount: author.acceptedAnswerCount,
      specialization: author.specialization,
      role: author.role,
    } as User;
  }

  private sanitizePost(post: Post): Post {
    if (!post) return post;

    if (post.isAnonymous) {
      return {
        ...post,
        author: {
          id: '',
          name: post.anonymousNickname || '익명',
          isLicenseVerified: false,
        } as User,
      };
    }

    return { ...post, author: this.publicAuthor(post.author) } as Post;
  }

  private sanitizeComment(comment: Comment): Comment {
    const sanitized = { ...comment };

    if (comment.isAnonymous) {
      sanitized.author = {
        id: '',
        name: comment.anonymousNickname || '익명',
        isLicenseVerified: false,
      } as User;
    } else {
      sanitized.author = this.publicAuthor(comment.author) as User;
    }

    if (comment.replies) {
      sanitized.replies = comment.replies.map((reply) => this.sanitizeComment(reply));
    }

    return sanitized;
  }

  private async processTagsUsage(tags: string[]) {
    for (const tagName of tags) {
      const existing = await this.tagsRepository.findOne({ where: { name: tagName } });
      if (existing) {
        await this.tagsRepository.increment({ id: existing.id }, 'usageCount', 1);
      } else {
        await this.tagsRepository.save({ name: tagName, usageCount: 1 });
      }
    }
  }

  private getContributionPoints(action: 'post' | 'comment' | 'accepted', tier: SubscriptionTier): number {
    const pointsMap = {
      post: { [SubscriptionTier.FREE]: 2, [SubscriptionTier.PROFESSIONAL]: 3, [SubscriptionTier.CLINIC]: 5 },
      comment: { [SubscriptionTier.FREE]: 1, [SubscriptionTier.PROFESSIONAL]: 1, [SubscriptionTier.CLINIC]: 2 },
      accepted: { [SubscriptionTier.FREE]: 5, [SubscriptionTier.PROFESSIONAL]: 10, [SubscriptionTier.CLINIC]: 20 },
    };
    return pointsMap[action][tier];
  }
}
