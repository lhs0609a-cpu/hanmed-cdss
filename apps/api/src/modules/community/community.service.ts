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
import { Category } from '../../database/entities/category.entity';
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
    if (createPostDto.isAnonymous && user.subscriptionTier === SubscriptionTier.STARTER) {
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
    const { page = 1, limit = 20, type, category, sortBy = 'latest', search, tag } = query;

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
      qb.andWhere(':tag = ANY(post.tags)', { tag });
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
    if (createCommentDto.isAnonymous && user.subscriptionTier === SubscriptionTier.STARTER) {
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
      where: { postType: type, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  // ===== Tags =====

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
      post: { [SubscriptionTier.STARTER]: 2, [SubscriptionTier.PRO]: 3, [SubscriptionTier.MASTER]: 5 },
      comment: { [SubscriptionTier.STARTER]: 1, [SubscriptionTier.PRO]: 1, [SubscriptionTier.MASTER]: 2 },
      accepted: { [SubscriptionTier.STARTER]: 5, [SubscriptionTier.PRO]: 10, [SubscriptionTier.MASTER]: 20 },
    };
    return pointsMap[action][tier];
  }
}
