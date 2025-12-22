import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CombosService } from './combos.service';

class CalculateComboDto {
  formulaIds: string[];
}

@ApiTags('combos')
@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Post('calculate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '합방 계산' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        formulaIds: {
          type: 'array',
          items: { type: 'string' },
          description: '합방할 처방 ID 목록',
        },
      },
    },
  })
  async calculateCombo(@Body() dto: CalculateComboDto) {
    return this.combosService.calculateCombo(dto.formulaIds);
  }

  @Get('known')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '알려진 합방 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findKnownCombos(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.combosService.findKnownCombos(+page, +limit);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '합방 상세 조회' })
  async findById(@Param('id') id: string) {
    return this.combosService.findComboById(id);
  }
}
