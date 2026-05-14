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
    const raw = await this.casesService.findAll(+page, +limit, {
      search,
      searchField,
      constitution,
      outcome,
    });

    // 프론트 CaseFromAPI shape 으로 변환 — DB 엔티티 컬럼명을 그대로 노출하지 않고
    // UI 가 기대하는 평탄한 객체로 매핑한다.
    const data = (raw.data || []).map((c: any) => {
      const firstFormula = Array.isArray(c.herbalFormulas) && c.herbalFormulas.length > 0
        ? c.herbalFormulas[0]
        : null;
      const symptomNames = Array.isArray(c.symptoms)
        ? c.symptoms.map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean)
        : [];
      return {
        id: c.id,
        title: c.chiefComplaint?.slice(0, 80) || '(주소증 미기재)',
        chiefComplaint: c.chiefComplaint || '',
        symptoms: symptomNames,
        formulaName: firstFormula?.formulaName || '',
        formulaHanja: firstFormula?.formulaHanja || '',
        constitution: c.patientConstitution || '',
        diagnosis: c.patternDiagnosis || '',
        patientAge: c.patientAgeRange ? parseInt(String(c.patientAgeRange), 10) || null : null,
        patientGender: c.patientGender || null,
        outcome: c.treatmentOutcome || null,
        result: c.clinicalNotes || '',
        originalText: c.originalText || '',
        dataSource: c.recorderName || '온고지신 DB',
      };
    });

    return {
      data,
      meta: raw.meta,
    };
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
