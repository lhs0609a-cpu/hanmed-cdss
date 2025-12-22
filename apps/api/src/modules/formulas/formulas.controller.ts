import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FormulasService } from './formulas.service';

@ApiTags('formulas')
@Controller('formulas')
export class FormulasController {
  constructor(private readonly formulasService: FormulasService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '처방 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('category') category?: string,
  ) {
    return this.formulasService.findAll(+page, +limit, category);
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '처방 검색' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') query: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.formulasService.search(query, +page, +limit);
  }

  @Get('categories')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '처방 분류 목록 조회' })
  async getCategories() {
    return this.formulasService.getCategories();
  }

  @Get('by-category/:category')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '분류별 처방 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByCategory(
    @Param('category') category: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.formulasService.findByCategory(category, +page, +limit);
  }

  @Get('by-herb/:herbId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 약재가 포함된 처방 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByHerb(
    @Param('herbId') herbId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.formulasService.findByHerb(herbId, +page, +limit);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '처방 상세 조회' })
  async findById(@Param('id') id: string) {
    return this.formulasService.findById(id);
  }
}
