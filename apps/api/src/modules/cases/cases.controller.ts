import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CasesService } from './cases.service';

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '치험례 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'searchField', required: false, type: String })
  @ApiQuery({ name: 'constitution', required: false, type: String })
  @ApiQuery({ name: 'outcome', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('searchField') searchField?: string,
    @Query('constitution') constitution?: string,
    @Query('outcome') outcome?: string,
  ) {
    return this.casesService.findAll(+page, +limit, {
      search,
      searchField,
      constitution,
      outcome,
    });
  }

  @Get('statistics')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '치험례 통계 조회' })
  async getStatistics() {
    return this.casesService.getStatistics();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '치험례 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.casesService.findById(id);
  }

  @Post('search')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '유사 치험례 검색 (AI 기반)' })
  async searchSimilar(
    @Body()
    searchDto: {
      symptoms: string[];
      constitution?: string;
      topK?: number;
    },
  ) {
    return this.casesService.searchSimilar(searchDto);
  }
}
