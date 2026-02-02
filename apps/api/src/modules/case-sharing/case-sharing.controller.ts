import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CaseSharingService } from './case-sharing.service';
import {
  CreateSharedCaseDto,
  CreateCommentDto,
  VoteDto,
  SearchCasesDto,
  RequestMentorshipDto,
  CreateExpertProfileDto,
} from './dto';
import { SharedCaseStatus, CaseCategory, CaseDifficulty } from '../../database/entities/shared-case.entity';

@ApiTags('Case Sharing Network')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases')
export class CaseSharingController {
  constructor(private readonly caseSharingService: CaseSharingService) {}

  // ============ Cases ============

  @Post()
  @ApiOperation({ summary: '케이스 공유', description: '익명으로 케이스를 공유합니다.' })
  async createCase(
    @Request() req: any,
    @Body() dto: CreateSharedCaseDto,
  ) {
    const result = await this.caseSharingService.createCase(req.user.id, dto);
    return { success: true, data: result };
  }

  @Get()
  @ApiOperation({ summary: '케이스 목록 조회' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'category', enum: CaseCategory, required: false })
  @ApiQuery({ name: 'difficulty', enum: CaseDifficulty, required: false })
  @ApiQuery({ name: 'status', enum: SharedCaseStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getCases(@Query() query: SearchCasesDto) {
    const result = await this.caseSharingService.getCases(query);
    return { success: true, data: result };
  }

  @Get('statistics')
  @ApiOperation({ summary: '커뮤니티 통계' })
  async getStatistics() {
    const result = await this.caseSharingService.getStatistics();
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: '케이스 상세 조회' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  async getCase(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const result = await this.caseSharingService.getCase(id, req.user.id);
    return { success: true, data: result };
  }

  @Put(':id/status')
  @ApiOperation({ summary: '케이스 상태 변경' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  async updateCaseStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: SharedCaseStatus,
  ) {
    const result = await this.caseSharingService.updateCaseStatus(id, req.user.id, status);
    return { success: true, data: result };
  }

  @Get(':id/similar')
  @ApiOperation({ summary: '유사 케이스 조회' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  async getSimilarCases(@Param('id') id: string) {
    const result = await this.caseSharingService.findSimilarCases(id);
    return { success: true, data: result };
  }

  // ============ Comments ============

  @Post(':id/comments')
  @ApiOperation({ summary: '댓글/답변 작성' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  async createComment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    const result = await this.caseSharingService.createComment(id, req.user.id, dto);
    return { success: true, data: result };
  }

  @Get(':id/comments')
  @ApiOperation({ summary: '댓글 목록 조회' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  async getComments(@Param('id') id: string) {
    const result = await this.caseSharingService.getComments(id);
    return { success: true, data: result };
  }

  @Post(':id/comments/:commentId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '답변 채택' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  async acceptAnswer(
    @Request() req: any,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.caseSharingService.acceptAnswer(id, commentId, req.user.id);
    return { success: true, data: result };
  }

  // ============ Votes ============

  @Post(':id/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '케이스 투표' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  async voteCase(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: VoteDto,
  ) {
    const result = await this.caseSharingService.vote(req.user.id, dto.voteType, { caseId: id });
    return { success: true, data: result };
  }

  @Post('comments/:commentId/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '댓글 투표' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  async voteComment(
    @Request() req: any,
    @Param('commentId') commentId: string,
    @Body() dto: VoteDto,
  ) {
    const result = await this.caseSharingService.vote(req.user.id, dto.voteType, { commentId });
    return { success: true, data: result };
  }

  // ============ Bookmarks ============

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '북마크 토글' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  async toggleBookmark(
    @Request() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    const result = await this.caseSharingService.toggleBookmark(req.user.id, id, note);
    return { success: true, data: result };
  }

  @Get('user/bookmarks')
  @ApiOperation({ summary: '내 북마크 조회' })
  async getMyBookmarks(@Request() req: any) {
    const result = await this.caseSharingService.getBookmarks(req.user.id);
    return { success: true, data: result };
  }

  // ============ Mentorship ============

  @Post('mentorship/request')
  @ApiOperation({ summary: '멘토링 요청' })
  async requestMentorship(
    @Request() req: any,
    @Body() dto: RequestMentorshipDto,
  ) {
    const result = await this.caseSharingService.requestMentorship(req.user.id, dto);
    return { success: true, data: result };
  }

  @Post('mentorship/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '멘토링 요청 응답' })
  @ApiParam({ name: 'id', description: '멘토링 ID' })
  async respondToMentorship(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { accept: boolean; message?: string },
  ) {
    const result = await this.caseSharingService.respondToMentorship(id, req.user.id, body);
    return { success: true, data: result };
  }

  // ============ Experts ============

  @Get('experts/list')
  @ApiOperation({ summary: '전문가 목록 조회' })
  @ApiQuery({ name: 'specialization', required: false })
  @ApiQuery({ name: 'mentoringOnly', type: Boolean, required: false })
  async getExperts(
    @Query('specialization') specialization?: string,
    @Query('mentoringOnly') mentoringOnly?: boolean,
  ) {
    const result = await this.caseSharingService.getExperts({
      specialization,
      mentoringOnly,
    });
    return { success: true, data: result };
  }

  @Post('experts/profile')
  @ApiOperation({ summary: '전문가 프로필 등록/수정' })
  async upsertExpertProfile(
    @Request() req: any,
    @Body() dto: CreateExpertProfileDto,
  ) {
    const result = await this.caseSharingService.upsertExpertProfile(req.user.id, dto);
    return { success: true, data: result };
  }
}
