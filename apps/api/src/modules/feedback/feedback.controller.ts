import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FeedbackService } from './feedback.service';

interface ErrorReportDto {
  errorMessage?: string;
  errorStack?: string;
  componentStack?: string;
  userFeedback: string;
  url: string;
  userAgent?: string;
  timestamp: string;
}

interface FeatureFeedbackDto {
  featureName: string;
  rating: number;
  comment?: string;
  suggestions?: string;
}

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('error-report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '에러 리포트 제출',
    description: '사용자가 경험한 에러에 대한 피드백을 수집합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        errorMessage: { type: 'string' },
        errorStack: { type: 'string' },
        componentStack: { type: 'string' },
        userFeedback: { type: 'string' },
        url: { type: 'string' },
        userAgent: { type: 'string' },
        timestamp: { type: 'string' },
      },
      required: ['userFeedback', 'url', 'timestamp'],
    },
  })
  async submitErrorReport(
    @Body() dto: ErrorReportDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    await this.feedbackService.saveErrorReport({
      ...dto,
      userId,
    });

    return {
      success: true,
      message: '피드백이 전송되었습니다. 감사합니다!',
    };
  }

  @Post('feature')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '기능 피드백 제출',
    description: '특정 기능에 대한 사용자 피드백을 수집합니다.',
  })
  async submitFeatureFeedback(
    @Body() dto: FeatureFeedbackDto,
    @Request() req: any,
  ) {
    await this.feedbackService.saveFeatureFeedback({
      ...dto,
      userId: req.user.id,
    });

    return {
      success: true,
      message: '피드백 감사합니다!',
    };
  }

  @Post('nps')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'NPS 점수 제출',
    description: 'Net Promoter Score를 수집합니다.',
  })
  async submitNPS(
    @Body() dto: { score: number; reason?: string },
    @Request() req: any,
  ) {
    await this.feedbackService.saveNPS({
      ...dto,
      userId: req.user.id,
    });

    return {
      success: true,
      message: '피드백 감사합니다!',
    };
  }
}
