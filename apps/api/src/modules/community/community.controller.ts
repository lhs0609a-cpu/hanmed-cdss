import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CommunityService } from './community.service';
import {
  CreatePostDto,
  UpdatePostDto,
  CreateCommentDto,
  UpdateCommentDto,
  CreateReportDto,
  PostQueryDto,
} from './dto';
import { PostType } from '../../database/entities/post.entity';
import { ReportTargetType } from '../../database/entities/report.entity';

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ===== Posts =====

  @Post('posts')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 작성' })
  async createPost(@Request() req, @Body() createPostDto: CreatePostDto) {
    return this.communityService.createPost(req.user.id, createPostDto);
  }

  @Get('posts')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: PostType })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['latest', 'popular', 'views', 'comments'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  async findAllPosts(@Query() query: PostQueryDto) {
    return this.communityService.findAllPosts(query);
  }

  @Get('posts/trending')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '인기 게시글 조회' })
  async getTrendingPosts(@Query('limit') limit = 10) {
    return this.communityService.findAllPosts({
      limit: +limit,
      sortBy: 'popular',
    });
  }

  @Get('posts/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  async findPostById(@Param('id') id: string, @Request() req) {
    return this.communityService.findPostById(id, req.user?.id);
  }

  @Put('posts/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 수정' })
  async updatePost(
    @Param('id') id: string,
    @Request() req,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.communityService.updatePost(id, req.user.id, updatePostDto);
  }

  @Delete('posts/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 삭제' })
  async deletePost(@Param('id') id: string, @Request() req) {
    return this.communityService.deletePost(id, req.user.id);
  }

  @Post('posts/:id/like')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 좋아요 토글' })
  async toggleLike(@Param('id') id: string, @Request() req) {
    return this.communityService.toggleLike(id, req.user.id);
  }

  @Post('posts/:id/bookmark')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 북마크 토글' })
  async toggleBookmark(@Param('id') id: string, @Request() req) {
    return this.communityService.toggleBookmark(id, req.user.id);
  }

  @Post('posts/:id/report')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 신고' })
  async reportPost(
    @Param('id') id: string,
    @Request() req,
    @Body() createReportDto: CreateReportDto,
  ) {
    return this.communityService.createReport(
      req.user.id,
      ReportTargetType.POST,
      id,
      createReportDto,
    );
  }

  // ===== Comments =====

  @Post('posts/:postId/comments')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 작성' })
  async createComment(
    @Param('postId') postId: string,
    @Request() req,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.communityService.createComment(postId, req.user.id, createCommentDto);
  }

  @Get('posts/:postId/comments')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 목록 조회' })
  async findComments(@Param('postId') postId: string) {
    return this.communityService.findCommentsByPostId(postId);
  }

  @Put('comments/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 수정' })
  async updateComment(
    @Param('id') id: string,
    @Request() req,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.communityService.updateComment(id, req.user.id, updateCommentDto);
  }

  @Delete('comments/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 삭제' })
  async deleteComment(@Param('id') id: string, @Request() req) {
    return this.communityService.deleteComment(id, req.user.id);
  }

  @Post('comments/:id/accept')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '답변 채택 (Q&A)' })
  async acceptAnswer(@Param('id') id: string, @Request() req) {
    return this.communityService.acceptAnswer(id, req.user.id);
  }

  @Post('comments/:id/report')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 신고' })
  async reportComment(
    @Param('id') id: string,
    @Request() req,
    @Body() createReportDto: CreateReportDto,
  ) {
    return this.communityService.createReport(
      req.user.id,
      ReportTargetType.COMMENT,
      id,
      createReportDto,
    );
  }

  // ===== Categories =====

  @Get('categories')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '카테고리 목록 조회' })
  async findAllCategories() {
    return this.communityService.findAllCategories();
  }

  @Get('categories/type/:type')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시판 유형별 카테고리 조회' })
  async findCategoriesByType(@Param('type') type: PostType) {
    return this.communityService.findCategoriesByType(type);
  }

  // ===== Tags =====

  @Get('tags')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '인기 태그 목록' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findPopularTags(@Query('limit') limit = 20) {
    return this.communityService.findPopularTags(+limit);
  }

  @Get('tags/search')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '태그 검색 (자동완성)' })
  @ApiQuery({ name: 'q', required: true, type: String })
  async searchTags(@Query('q') query: string) {
    return this.communityService.searchTags(query);
  }

  // ===== Bookmarks =====

  @Get('bookmarks')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 북마크 목록' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserBookmarks(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.communityService.getUserBookmarks(req.user.id, +page, +limit);
  }
}
