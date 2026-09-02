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
    const { page = 1, limit = 20, type, category, sortBy = 'latest', search, tag, authorId } = query;

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

    // 정렬
    switch (sortBy) {
      case 'popular':
        qb.orderBy('post.likeCount', 'DESC');
        break;
      case 'views':
        qb.orderBy('post.viewCount', 'DESC');
        break;
      case 'comments':
        qb.orderBy('post.commentCount', 'DESC');
        break;
      default:
        qb.orderBy('post.createdAt', 'DESC');
    }

    // 고정 게시글 우선
    qb.addOrderBy('post.isPinned', 'DESC');

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
  async countByBoard(): Promise<{
    byType: Record<string, number>;
    suggestions: number;
    clinical: number;
    total: number;
  }> {
    const rows = await this.postsRepository
      .createQueryBuilder('post')
      .select('post.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('post.status = :status', { status: PostStatus.ACTIVE })
      .groupBy('post.type')
      .getRawMany<{ type: string; count: string }>();

    const byType: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const n = parseInt(r.count, 10) || 0;
      byType[r.type] = n;
      total += n;
    }

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

    return { byType, suggestions, clinical, total };
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

  private sanitizePost(post: Post): Post {
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
    return post;
  }

  private sanitizeComment(comment: Comment): Comment {
    const sanitized = { ...comment };

    if (comment.isAnonymous) {
      sanitized.author = {
        id: '',
        name: comment.anonymousNickname || '익명',
        isLicenseVerified: false,
      } as User;
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
