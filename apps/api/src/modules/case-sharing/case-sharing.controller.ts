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
@Controller('case-sharing')
export class CaseSharingController {
  constructor(private readonly caseSharingService: CaseSharingService) {}

  // ============ Cases ============

  @Post('cases')
  @ApiOperation({ summary: '케이스 공유' })
  async createCase(@Request() req: any, @Body() dto: CreateSharedCaseDto) {
    const result = await this.caseSharingService.createCase(req.user.id, dto);
    return { success: true, data: result };
  }

  @Get('cases')
  @ApiOperation({ summary: '케이스 목록 조회' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'category', enum: CaseCategory, required: false })
  @ApiQuery({ name: 'difficulty', enum: CaseDifficulty, required: false })
  @ApiQuery({ name: 'status', enum: SharedCaseStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getCases(@Query() query: SearchCasesDto) {
    const result = await this.caseSharingService.getCases(query);
    const cases = result.cases || [];
    const total = result.total || 0;
    const page = result.page || 1;
    const limit = result.limit || 20;
    return {
      success: true,
      data: { cases, total, page, hasMore: page * limit < total },
    };
  }

  @Get('cases/featured')
  @ApiOperation({ summary: '추천 케이스 조회' })
  async getFeaturedCases() {
    const result = await this.caseSharingService.getFeaturedCases();
    return { success: true, data: result };
  }

  @Get('cases/bookmarked')
  @ApiOperation({ summary: '북마크한 케이스' })
  async getBookmarkedCases(@Request() req: any) {
    const result = await this.caseSharingService.getBookmarks(req.user.id);
    return { success: true, data: result };
  }

  @Get('cases/mine')
  @ApiOperation({ summary: '내가 작성한 케이스' })
  async getMyCases(@Request() req: any) {
    const result = await this.caseSharingService.getMyCases(req.user.id);
    return { success: true, data: result };
  }

  @Get('cases/similar')
  @ApiOperation({ summary: '유사 케이스 검색 (증상 기반)' })
  async getSimilarBySymptoms(
    @Query('symptoms') symptoms?: string,
    @Query('constitution') constitution?: string,
  ) {
    const symptomList = symptoms ? symptoms.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const result = await this.caseSharingService.findSimilarBySymptoms(symptomList, constitution);
    return { success: true, data: result };
  }

  @Get('cases/statistics')
  @ApiOperation({ summary: '케이스 통계' })
  async getCasesStatistics() {
    const result = await this.caseSharingService.getStatistics();
    return { success: true, data: result };
  }

  @Get('cases/:id')
  @ApiOperation({ summary: '케이스 상세 조회' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  async getCase(@Request() req: any, @Param('id') id: string) {
    const result = await this.caseSharingService.getCase(id, req.user.id);
    return { success: true, data: result };
  }

  @Put('cases/:id')
  @ApiOperation({ summary: '케이스 수정' })
  @ApiParam({ name: 'id', description: '케이스 ID' })
  async updateCase(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateSharedCaseDto>,
  ) {
    const result = await this.caseSharingService.updateCase(id, req.user.id, dto);
    return { success: true, data: result };
  }

  @Put('cases/:id/status')
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

  @Post('cases/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '케이스 발행 (드래프트 → 공개)' })
  async publishCase(@Request() req: any, @Param('id') id: string) {
    const result = await this.caseSharingService.updateCaseStatus(
      id,
      req.user.id,
      SharedCaseStatus.OPEN,
    );
    return { success: true, data: result };
  }

  @Get('cases/:id/similar')
  @ApiOperation({ summary: '특정 케이스 기준 유사 케이스' })
  async getSimilarById(@Param('id') id: string) {
    const result = await this.caseSharingService.findSimilarCases(id);
    return { success: true, data: result };
  }

  // ============ Comments ============

  @Post('cases/:id/comments')
  @ApiOperation({ summary: '댓글 작성' })
  async createComment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    const result = await this.caseSharingService.createComment(id, req.user.id, dto);
    return { success: true, data: result };
  }

  @Get('cases/:id/comments')
  @ApiOperation({ summary: '댓글 목록 조회' })
  async getComments(@Param('id') id: string) {
    const result = await this.caseSharingService.getComments(id);
    return { success: true, data: result };
  }

  @Post('cases/:id/comments/:commentId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '답변 채택' })
  async acceptAnswer(
    @Request() req: any,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.caseSharingService.acceptAnswer(id, commentId, req.user.id);
    return { success: true, data: result };
  }

  // ============ Likes / Votes ============

  @Post('cases/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '케이스 좋아요 토글' })
  async toggleLike(@Request() req: any, @Param('id') id: string) {
    const result = await this.caseSharingService.toggleLike(req.user.id, id);
    return { success: true, data: result };
  }

  @Post('cases/:id/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '케이스 투표' })
  async voteCase(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: VoteDto,
  ) {
    const result = await this.caseSharingService.vote(req.user.id, dto.voteType, { caseId: id });
    return { success: true, data: result };
  }

  @Post('cases/comments/:commentId/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '댓글 투표' })
  async voteComment(
    @Request() req: any,
    @Param('commentId') commentId: string,
    @Body() dto: VoteDto,
  ) {
    const result = await this.caseSharingService.vote(req.user.id, dto.voteType, { commentId });
    return { success: true, data: result };
  }

  // ============ Bookmarks ============

  @Post('cases/:id/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '북마크 토글' })
  async toggleBookmark(
    @Request() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    const result = await this.caseSharingService.toggleBookmark(req.user.id, id, note);
    return { success: true, data: result };
  }

  // ============ Mentorship ============

  @Post('mentorship/request')
  @ApiOperation({ summary: '멘토링 요청' })
  async requestMentorship(@Request() req: any, @Body() dto: RequestMentorshipDto) {
    const result = await this.caseSharingService.requestMentorship(req.user.id, dto);
    return { success: true, data: result };
  }

  @Post('mentorship/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '멘토링 요청 응답' })
  async respondToMentorship(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { accept: boolean; message?: string },
  ) {
    const result = await this.caseSharingService.respondToMentorship(id, req.user.id, body);
    return { success: true, data: result };
  }

  @Get('mentorship/mine')
  @ApiOperation({ summary: '내 멘토링 (mentee 입장)' })
  async getMyMentorships(@Request() req: any) {
    const result = await this.caseSharingService.getMyMentorships(req.user.id);
    return { success: true, data: result };
  }

  @Get('mentorship/requests')
  @ApiOperation({ summary: '내가 받은 멘토링 요청 (mentor 입장)' })
  async getMentorshipRequests(@Request() req: any) {
    const result = await this.caseSharingService.getMentorshipRequests(req.user.id);
    return { success: true, data: result };
  }

  // ============ Experts ============

  @Get('experts')
  @ApiOperation({ summary: '전문가 목록' })
  @ApiQuery({ name: 'specialty', required: false })
  @ApiQuery({ name: 'availableOnly', type: Boolean, required: false })
  async getExperts(
    @Query('specialty') specialty?: string,
    @Query('availableOnly') availableOnly?: boolean,
  ) {
    const result = await this.caseSharingService.getExperts({
      specialization: specialty,
      mentoringOnly: availableOnly,
    });
    return { success: true, data: result };
  }

  @Get('experts/:id')
  @ApiOperation({ summary: '전문가 상세' })
  async getExpert(@Param('id') id: string) {
    const result = await this.caseSharingService.getExpert(id);
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

  // ============ Stats / Tags ============

  @Get('statistics')
  @ApiOperation({ summary: '커뮤니티 통계' })
  async getStatistics() {
    const result = await this.caseSharingService.getStatistics();
    return { success: true, data: result };
  }

  @Get('tags/popular')
  @ApiOperation({ summary: '인기 태그' })
  async getPopularTags() {
    const result = await this.caseSharingService.getPopularTags();
    return { success: true, data: result };
  }
}
