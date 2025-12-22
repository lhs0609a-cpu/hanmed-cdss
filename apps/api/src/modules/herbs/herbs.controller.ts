import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { HerbsService } from './herbs.service';

@ApiTags('herbs')
@Controller('herbs')
export class HerbsController {
  constructor(private readonly herbsService: HerbsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '약재 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'nature', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('category') category?: string,
    @Query('nature') nature?: string,
  ) {
    return this.herbsService.findAll(+page, +limit, category, nature);
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '약재 검색' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') query: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.herbsService.search(query, +page, +limit);
  }

  @Get('categories')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '약재 분류 목록 조회' })
  async getCategories() {
    return this.herbsService.getCategories();
  }

  @Get('natures')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '약재 성질 목록 조회 (한/량/평/온/열)' })
  async getNatures() {
    return this.herbsService.getNatures();
  }

  @Get('compounds/search')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '성분 검색' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchCompounds(
    @Query('q') query: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.herbsService.searchCompounds(query, +page, +limit);
  }

  @Get('by-category/:category')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '분류별 약재 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByCategory(
    @Param('category') category: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.herbsService.findByCategory(category, +page, +limit);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '약재 상세 조회 (성분 포함)' })
  async findById(@Param('id') id: string) {
    return this.herbsService.findById(id);
  }

  @Get(':id/compounds')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '약재 성분 목록 조회' })
  async getCompounds(@Param('id') id: string) {
    return this.herbsService.getCompounds(id);
  }
}
