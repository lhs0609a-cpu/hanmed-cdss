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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
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
  constructor(private readonly communityService: CommunityService, private readonly uploadService: UploadService) {}

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
  @ApiQuery({ name: 'excludeTag', required: false, type: String })
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

  @Get('board-counts')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '게시판별 글 수',
    description:
      '첫 화면 게시판 카드에 숫자를 띄운다. 어디에 글이 있는지 들어가 보기 전에 알 수 있어야 한다.',
  })
  async countByBoard(@Request() req) {
    return this.communityService.countByBoard(req.user?.id);
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

  /**
   * 게시글 이미지 업로드.
   *
   * 에디터에서 붙여넣기·드래그로 들어온 이미지를 받는다. 프론트에서 Supabase 로
   * 직접 올리지 않고 여기를 거치는 이유는 secret key 때문이다 — 그 키는 RLS 를
   * 우회하는 관리 권한이라 브라우저로 내보낼 수 없다. 한 번 더 도는 대신
   * 키가 서버에만 남는다.
   */
  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 이미지 업로드' })
  @UseInterceptors(
    FileInterceptor('file', {
      // 디스크를 거치지 않는다. Fly 머신은 파일시스템이 휘발성이고,
      // 임시파일을 남기면 지우는 책임이 생긴다.
      storage: undefined,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @Request() req: any,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('이미지 파일이 없습니다.');
    }
    return this.uploadService.uploadImage(file.buffer, req.user.id);
  }
}
