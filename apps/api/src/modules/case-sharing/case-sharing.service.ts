import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import {
  SharedCase,
  CaseComment,
  CaseVote,
  CaseBookmark,
  CaseMentorship,
  ExpertProfile,
  SharedCaseStatus,
  CaseCategory,
  CaseDifficulty,
} from '../../database/entities/shared-case.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class CaseSharingService {
  constructor(
    @InjectRepository(SharedCase)
    private caseRepository: Repository<SharedCase>,
    @InjectRepository(CaseComment)
    private commentRepository: Repository<CaseComment>,
    @InjectRepository(CaseVote)
    private voteRepository: Repository<CaseVote>,
    @InjectRepository(CaseBookmark)
    private bookmarkRepository: Repository<CaseBookmark>,
    @InjectRepository(CaseMentorship)
    private mentorshipRepository: Repository<CaseMentorship>,
    @InjectRepository(ExpertProfile)
    private expertProfileRepository: Repository<ExpertProfile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // ============ Cases ============

  /**
   * 케이스 생성
   */
  async createCase(
    authorId: string,
    data: {
      title: string;
      content: string;
      category: CaseCategory;
      difficulty?: CaseDifficulty;
      patientInfo: SharedCase['patientInfo'];
      triedTreatments?: SharedCase['triedTreatments'];
      questions?: string[];
      tags?: string[];
    },
  ): Promise<SharedCase> {
    // 작성자 정보로 익명 이름 생성
    const author = await this.userRepository.findOne({ where: { id: authorId } });
    const anonymousName = this.generateAnonymousName(author);

    const sharedCase = this.caseRepository.create({
      authorId,
      anonymousName,
      title: data.title,
      content: data.content,
      category: data.category,
      difficulty: data.difficulty || CaseDifficulty.INTERMEDIATE,
      status: SharedCaseStatus.OPEN,
      patientInfo: data.patientInfo,
      triedTreatments: data.triedTreatments,
      questions: data.questions,
      tags: data.tags,
    });

    const saved = await this.caseRepository.save(sharedCase);

    // AI 분석 실행 (비동기)
    this.analyzeCase(saved.id);

    return saved;
  }

  /**
   * 케이스 목록 조회
   */
  async getCases(options: {
    keyword?: string;
    category?: CaseCategory;
    difficulty?: CaseDifficulty;
    status?: SharedCaseStatus;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ cases: SharedCase[]; total: number; page: number; limit: number }> {
    const { keyword, category, difficulty, status, tags, page = 1, limit = 20 } = options;

    const queryBuilder = this.caseRepository.createQueryBuilder('case');

    if (keyword) {
      queryBuilder.andWhere(
        '(case.title ILIKE :keyword OR case.content ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere('case.category = :category', { category });
    }

    if (difficulty) {
      queryBuilder.andWhere('case.difficulty = :difficulty', { difficulty });
    }

    if (status) {
      queryBuilder.andWhere('case.status = :status', { status });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('case.tags && ARRAY[:...tags]', { tags });
    }

    const [cases, total] = await queryBuilder
      .orderBy('case.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { cases, total, page, limit };
  }

  /**
   * 케이스 상세 조회
   */
  async getCase(caseId: string, viewerId?: string): Promise<SharedCase> {
    const sharedCase = await this.caseRepository.findOne({
      where: { id: caseId },
    });

    if (!sharedCase) {
      throw new NotFoundException('케이스를 찾을 수 없습니다.');
    }

    // 조회수 증가
    await this.caseRepository.increment({ id: caseId }, 'viewCount', 1);

    return sharedCase;
  }

  /**
   * 케이스 상태 변경
   */
  async updateCaseStatus(
    caseId: string,
    userId: string,
    status: SharedCaseStatus,
  ): Promise<SharedCase> {
    const sharedCase = await this.getCase(caseId);

    if (sharedCase.authorId !== userId) {
      throw new ForbiddenException('본인이 작성한 케이스만 수정할 수 있습니다.');
    }

    sharedCase.status = status;
    return this.caseRepository.save(sharedCase);
  }

  /**
   * 유사 케이스 검색
   */
  async findSimilarCases(caseId: string): Promise<SharedCase[]> {
    const targetCase = await this.getCase(caseId);

    // AI 분석 결과 기반 유사 케이스 검색
    if (targetCase.aiAnalysis?.similarCaseIds?.length > 0) {
      return this.caseRepository.find({
        where: { id: In(targetCase.aiAnalysis.similarCaseIds) },
        take: 5,
      });
    }

    // 증상 기반 검색
    const symptoms = targetCase.patientInfo.mainSymptoms;
    const queryBuilder = this.caseRepository.createQueryBuilder('case');

    for (const symptom of symptoms) {
      queryBuilder.orWhere(
        `case.patientInfo->'mainSymptoms' @> '["${symptom}"]'`,
      );
    }

    return queryBuilder
      .andWhere('case.id != :caseId', { caseId })
      .orderBy('case.voteCount', 'DESC')
      .take(5)
      .getMany();
  }

  // ============ Comments ============

  /**
   * 댓글 작성
   */
  async createComment(
    caseId: string,
    authorId: string,
    data: {
      content: string;
      parentId?: string;
      suggestedTreatment?: CaseComment['suggestedTreatment'];
      references?: CaseComment['references'];
    },
  ): Promise<CaseComment> {
    const sharedCase = await this.getCase(caseId);

    const author = await this.userRepository.findOne({ where: { id: authorId } });
    const anonymousName = this.generateAnonymousName(author);

    const comment = this.commentRepository.create({
      caseId,
      authorId,
      anonymousName,
      parentId: data.parentId,
      content: data.content,
      suggestedTreatment: data.suggestedTreatment,
      references: data.references,
    });

    const saved = await this.commentRepository.save(comment);

    // 케이스 댓글 수 증가
    await this.caseRepository.increment({ id: caseId }, 'commentCount', 1);

    // 케이스 상태 업데이트
    if (sharedCase.status === SharedCaseStatus.OPEN) {
      sharedCase.status = SharedCaseStatus.ANSWERED;
      await this.caseRepository.save(sharedCase);
    }

    return saved;
  }

  /**
   * 댓글 목록 조회
   */
  async getComments(caseId: string): Promise<CaseComment[]> {
    return this.commentRepository.find({
      where: { caseId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 답변 채택
   */
  async acceptAnswer(
    caseId: string,
    commentId: string,
    userId: string,
  ): Promise<SharedCase> {
    const sharedCase = await this.getCase(caseId);

    if (sharedCase.authorId !== userId) {
      throw new ForbiddenException('본인이 작성한 케이스의 답변만 채택할 수 있습니다.');
    }

    const comment = await this.commentRepository.findOne({
      where: { id: commentId, caseId },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    // 기존 채택 취소
    await this.commentRepository.update(
      { caseId, isAccepted: true },
      { isAccepted: false },
    );

    // 새 답변 채택
    comment.isAccepted = true;
    await this.commentRepository.save(comment);

    // 케이스 상태 변경
    sharedCase.acceptedAnswerId = commentId;
    sharedCase.status = SharedCaseStatus.RESOLVED;

    // 답변자 통계 업데이트
    await this.updateExpertStats(comment.authorId, 'accepted');

    return this.caseRepository.save(sharedCase);
  }

  // ============ Votes ============

  /**
   * 투표
   */
  async vote(
    userId: string,
    voteType: 'up' | 'down',
    options: { caseId?: string; commentId?: string },
  ): Promise<{ voteCount: number }> {
    const { caseId, commentId } = options;

    // 기존 투표 확인
    const existingVote = await this.voteRepository.findOne({
      where: { userId, caseId, commentId },
    });

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // 같은 투표 취소
        await this.voteRepository.remove(existingVote);
        const change = voteType === 'up' ? -1 : 1;
        if (caseId) {
          await this.caseRepository.increment({ id: caseId }, 'voteCount', change);
        }
        if (commentId) {
          await this.commentRepository.increment({ id: commentId }, 'voteCount', change);
        }
      } else {
        // 투표 변경
        existingVote.voteType = voteType;
        await this.voteRepository.save(existingVote);
        const change = voteType === 'up' ? 2 : -2;
        if (caseId) {
          await this.caseRepository.increment({ id: caseId }, 'voteCount', change);
        }
        if (commentId) {
          await this.commentRepository.increment({ id: commentId }, 'voteCount', change);
        }
      }
    } else {
      // 새 투표
      const vote = this.voteRepository.create({
        userId,
        caseId,
        commentId,
        voteType,
      });
      await this.voteRepository.save(vote);
      const change = voteType === 'up' ? 1 : -1;
      if (caseId) {
        await this.caseRepository.increment({ id: caseId }, 'voteCount', change);
      }
      if (commentId) {
        await this.commentRepository.increment({ id: commentId }, 'voteCount', change);
      }
    }

    // 현재 투표 수 반환
    if (caseId) {
      const c = await this.caseRepository.findOne({ where: { id: caseId } });
      return { voteCount: c?.voteCount || 0 };
    }
    if (commentId) {
      const c = await this.commentRepository.findOne({ where: { id: commentId } });
      return { voteCount: c?.voteCount || 0 };
    }

    return { voteCount: 0 };
  }

  // ============ Bookmarks ============

  /**
   * 북마크 토글
   */
  async toggleBookmark(
    userId: string,
    caseId: string,
    note?: string,
  ): Promise<{ bookmarked: boolean }> {
    const existing = await this.bookmarkRepository.findOne({
      where: { userId, caseId },
    });

    if (existing) {
      await this.bookmarkRepository.remove(existing);
      await this.caseRepository.decrement({ id: caseId }, 'bookmarkCount', 1);
      return { bookmarked: false };
    }

    const bookmark = this.bookmarkRepository.create({
      userId,
      caseId,
      note,
    });
    await this.bookmarkRepository.save(bookmark);
    await this.caseRepository.increment({ id: caseId }, 'bookmarkCount', 1);

    return { bookmarked: true };
  }

  /**
   * 북마크 목록 조회
   */
  async getBookmarks(userId: string): Promise<CaseBookmark[]> {
    return this.bookmarkRepository.find({
      where: { userId },
      relations: ['case'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============ Mentorship ============

  /**
   * 멘토링 요청
   */
  async requestMentorship(
    menteeId: string,
    data: {
      mentorId: string;
      caseId?: string;
      message: string;
    },
  ): Promise<CaseMentorship> {
    // 멘토 프로필 확인
    const mentorProfile = await this.expertProfileRepository.findOne({
      where: { userId: data.mentorId, isAvailableForMentoring: true },
    });

    if (!mentorProfile) {
      throw new BadRequestException('해당 전문가는 멘토링을 제공하지 않습니다.');
    }

    const mentorship = this.mentorshipRepository.create({
      mentorId: data.mentorId,
      menteeId,
      caseId: data.caseId,
      status: 'requested',
      requestMessage: data.message,
      sessions: [],
    });

    return this.mentorshipRepository.save(mentorship);
  }

  /**
   * 멘토링 요청 응답
   */
  async respondToMentorship(
    mentorshipId: string,
    mentorId: string,
    response: { accept: boolean; message?: string },
  ): Promise<CaseMentorship> {
    const mentorship = await this.mentorshipRepository.findOne({
      where: { id: mentorshipId },
    });

    if (!mentorship) {
      throw new NotFoundException('멘토링 요청을 찾을 수 없습니다.');
    }

    if (mentorship.mentorId !== mentorId) {
      throw new ForbiddenException('본인에게 온 요청만 응답할 수 있습니다.');
    }

    mentorship.status = response.accept ? 'accepted' : 'declined';
    mentorship.responseMessage = response.message;

    return this.mentorshipRepository.save(mentorship);
  }

  // ============ Expert Profiles ============

  /**
   * 전문가 프로필 생성/수정
   */
  async upsertExpertProfile(
    userId: string,
    data: {
      yearsOfExperience: number;
      specializations: string[];
      expertSymptoms?: string[];
      bio?: string;
      isAvailableForMentoring?: boolean;
    },
  ): Promise<ExpertProfile> {
    let profile = await this.expertProfileRepository.findOne({
      where: { userId },
    });

    if (profile) {
      Object.assign(profile, data);
    } else {
      profile = this.expertProfileRepository.create({
        userId,
        ...data,
      });
    }

    return this.expertProfileRepository.save(profile);
  }

  /**
   * 전문가 목록 조회
   */
  async getExperts(options?: {
    specialization?: string;
    mentoringOnly?: boolean;
  }): Promise<ExpertProfile[]> {
    const queryBuilder = this.expertProfileRepository.createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user');

    if (options?.specialization) {
      queryBuilder.andWhere(
        ':spec = ANY(profile.specializations)',
        { spec: options.specialization },
      );
    }

    if (options?.mentoringOnly) {
      queryBuilder.andWhere('profile.isAvailableForMentoring = true');
    }

    return queryBuilder
      .orderBy('profile.rating', 'DESC')
      .addOrderBy('profile.acceptedAnswerCount', 'DESC')
      .getMany();
  }

  // ============ Statistics ============

  /**
   * 커뮤니티 통계
   */
  async getStatistics(): Promise<{
    totalCases: number;
    openCases: number;
    resolvedCases: number;
    totalExperts: number;
    totalComments: number;
    topContributors: Array<{ name: string; answerCount: number; acceptedCount: number }>;
  }> {
    const totalCases = await this.caseRepository.count();
    const openCases = await this.caseRepository.count({
      where: { status: SharedCaseStatus.OPEN },
    });
    const resolvedCases = await this.caseRepository.count({
      where: { status: SharedCaseStatus.RESOLVED },
    });
    const totalExperts = await this.expertProfileRepository.count();
    const totalComments = await this.commentRepository.count();

    const topContributors = await this.expertProfileRepository.find({
      relations: ['user'],
      order: { acceptedAnswerCount: 'DESC' },
      take: 10,
    });

    return {
      totalCases,
      openCases,
      resolvedCases,
      totalExperts,
      totalComments,
      topContributors: topContributors.map(p => ({
        name: p.user?.name || '익명',
        answerCount: p.answerCount,
        acceptedCount: p.acceptedAnswerCount,
      })),
    };
  }

  // ============ Private Helpers ============

  private generateAnonymousName(user?: User): string {
    if (!user) return '익명 한의사';

    // 경력 기반 익명 이름 생성
    const createdYear = user.createdAt?.getFullYear() || new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    const estimatedYears = Math.max(1, currentYear - createdYear + 3);

    const titles = ['한의사', '선생님', '원장님'];
    const title = titles[Math.floor(Math.random() * titles.length)];

    return `경력 ${estimatedYears}년차 ${title}`;
  }

  private async analyzeCase(caseId: string): Promise<void> {
    // AI 분석 (비동기로 실행)
    try {
      const sharedCase = await this.caseRepository.findOne({ where: { id: caseId } });
      if (!sharedCase) return;

      // 키워드 추출
      const keywords = this.extractKeywords(sharedCase);

      // 유사 케이스 검색 (간단한 구현)
      const similarCases = await this.caseRepository.find({
        where: { category: sharedCase.category },
        order: { voteCount: 'DESC' },
        take: 5,
      });

      sharedCase.aiAnalysis = {
        keywords,
        suggestedFormulas: [],
        similarCaseIds: similarCases.map(c => c.id).filter(id => id !== caseId),
        confidenceScore: 0.7,
      };

      await this.caseRepository.save(sharedCase);
    } catch (error) {
      console.error('Case analysis error:', error);
    }
  }

  private extractKeywords(sharedCase: SharedCase): string[] {
    const text = `${sharedCase.title} ${sharedCase.content}`;
    // 간단한 키워드 추출 (실제로는 NLP 사용)
    const words = text.split(/\s+/).filter(w => w.length > 2);
    return [...new Set(words)].slice(0, 10);
  }

  private async updateExpertStats(
    userId: string,
    action: 'answer' | 'accepted' | 'helpful',
  ): Promise<void> {
    let profile = await this.expertProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.expertProfileRepository.create({
        userId,
        yearsOfExperience: 1,
        specializations: [],
      });
    }

    if (action === 'answer') {
      profile.answerCount++;
    } else if (action === 'accepted') {
      profile.acceptedAnswerCount++;
    } else if (action === 'helpful') {
      profile.helpfulVoteCount++;
    }

    await this.expertProfileRepository.save(profile);
  }
}
