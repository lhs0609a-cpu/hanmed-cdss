import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../../database/entities/feedback.entity';

interface ErrorReportInput {
  errorMessage?: string;
  errorStack?: string;
  componentStack?: string;
  userFeedback: string;
  url: string;
  userAgent?: string;
  timestamp: string;
  userId?: string;
}

interface FeatureFeedbackInput {
  featureName: string;
  rating: number;
  comment?: string;
  suggestions?: string;
  userId: string;
}

interface NPSInput {
  score: number;
  reason?: string;
  userId: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  /**
   * 에러 리포트 저장
   */
  async saveErrorReport(input: ErrorReportInput): Promise<void> {
    try {
      const feedback = this.feedbackRepository.create({
        type: 'error_report',
        userId: input.userId || null,
        content: input.userFeedback,
        metadata: {
          errorMessage: input.errorMessage,
          errorStack: input.errorStack?.substring(0, 5000), // 스택 길이 제한
          componentStack: input.componentStack?.substring(0, 2000),
          url: input.url,
          userAgent: input.userAgent,
          reportedAt: input.timestamp,
        },
      });

      await this.feedbackRepository.save(feedback);
      this.logger.log(`에러 리포트 저장: ${input.url}`);
    } catch (error) {
      // 피드백 저장 실패는 사용자 경험에 영향을 주지 않도록 로그만 기록
      this.logger.error('에러 리포트 저장 실패:', error);
    }
  }

  /**
   * 기능 피드백 저장
   */
  async saveFeatureFeedback(input: FeatureFeedbackInput): Promise<void> {
    try {
      const feedback = this.feedbackRepository.create({
        type: 'feature_feedback',
        userId: input.userId,
        content: input.comment || '',
        rating: input.rating,
        metadata: {
          featureName: input.featureName,
          suggestions: input.suggestions,
        },
      });

      await this.feedbackRepository.save(feedback);
      this.logger.log(`기능 피드백 저장: ${input.featureName} (${input.rating}/5)`);
    } catch (error) {
      this.logger.error('기능 피드백 저장 실패:', error);
    }
  }

  /**
   * NPS 점수 저장
   */
  async saveNPS(input: NPSInput): Promise<void> {
    try {
      const feedback = this.feedbackRepository.create({
        type: 'nps',
        userId: input.userId,
        content: input.reason || '',
        rating: input.score,
        metadata: {
          npsCategory:
            input.score >= 9 ? 'promoter' : input.score >= 7 ? 'passive' : 'detractor',
        },
      });

      await this.feedbackRepository.save(feedback);
      this.logger.log(`NPS 저장: ${input.score}`);
    } catch (error) {
      this.logger.error('NPS 저장 실패:', error);
    }
  }

  /**
   * 최근 피드백 조회 (관리자용)
   */
  async getRecentFeedback(limit = 50): Promise<Feedback[]> {
    return this.feedbackRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  /**
   * 에러 리포트 통계 조회
   */
  async getErrorReportStats(days = 7): Promise<{
    total: number;
    byDay: { date: string; count: number }[];
    topUrls: { url: string; count: number }[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const feedbacks = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .where('feedback.type = :type', { type: 'error_report' })
      .andWhere('feedback.createdAt >= :since', { since })
      .getMany();

    // 일별 통계
    const byDayMap = new Map<string, number>();
    const urlCountMap = new Map<string, number>();

    feedbacks.forEach((f) => {
      const date = f.createdAt.toISOString().split('T')[0];
      byDayMap.set(date, (byDayMap.get(date) || 0) + 1);

      const url = (f.metadata as any)?.url || 'unknown';
      urlCountMap.set(url, (urlCountMap.get(url) || 0) + 1);
    });

    return {
      total: feedbacks.length,
      byDay: Array.from(byDayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topUrls: Array.from(urlCountMap.entries())
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
}
