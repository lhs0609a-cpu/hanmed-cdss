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
        // 정리된 요약이 있으면 제목으로 쓴다. 원문 주소증은 "은 풍치와…" 처럼
        // 문장 중간에서 잘려 시작하는 경우가 많다.
        title:
          c.summaryOneLine ||
          c.chiefComplaint?.slice(0, 80) ||
          '(주소증 미기재)',
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
        // 구조화 요약 — 원문이 한 덩어리라 목록·상세에서 이것부터 보여준다.
        summaryOneLine: c.summaryOneLine || null,
        keyFindings: c.keyFindings || [],
        patternReasoning: c.patternReasoning || null,
        modification: c.modification || null,
        courseSteps: c.courseSteps || [],
        distinctive: c.distinctive || null,
        verifiedFormulaName: c.verifiedFormulaName || null,
        formulaMismatch: c.formulaMismatch === true,
        hasMixedContent: c.hasMixedContent === true,
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

  // 주의: 아래 :id 라우트보다 반드시 위에 있어야 한다.
  // 밑에 두면 'evidence' 가 :id 로 잡혀 uuid 파싱 오류(500)가 난다.
  @Get('evidence')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '처방/변증별 치험례 근거',
    description:
      '처방명 또는 변증명으로 실제 치험례를 모아 건수·경과 분포·성공률과 대표 사례를 돌려준다.' +
      ' 처방 상세, 변증 도우미, 약재 상세 등 어느 화면에서든 같은 근거를 붙이는 데 쓴다.',
  })
  async getEvidence(
    @Query('kind') kind: 'formula' | 'pattern' | 'herb',
    @Query('name') name: string,
    @Query('limit') limit?: string,
  ) {
    return this.casesService.getCaseEvidence({
      kind: kind === 'pattern' || kind === 'herb' ? kind : 'formula',
      name,
      limit: limit ? parseInt(limit, 10) : 5,
    });
  }


  @Get('evidence-counts')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '처방/변증별 치험례 건수 일괄 조회',
    description: '목록 화면에서 카드마다 개별 호출하지 않도록 이름 여러 개의 건수를 한 번에 준다.',
  })
  async getEvidenceCounts(
    @Query('kind') kind: 'formula' | 'pattern' | 'herb',
    @Query('names') names: string,
  ) {
    return this.casesService.getCaseCounts({
      kind: kind === 'pattern' || kind === 'herb' ? kind : 'formula',
      names: (names || '').split(',').map((n) => n.trim()).filter(Boolean),
    });
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
  @ApiOperation({ summary: '(legacy) 증상 기반 단순 검색' })
  async searchByStructured(
    @Body()
    searchDto: {
      // 프론트는 증상을 문자열 배열로도, {name} 객체 배열로도 보낸다.
      symptoms: Array<string | { name?: string }>;
      chiefComplaint?: string;
      diagnosis?: string;
      constitution?: string;
      topK?: number;
    },
  ) {
    // 예전에는 symptoms 를 그대로 join 해서 객체가 오면 쿼리가
    // "[object Object] [object Object]" 가 됐다 — 검색이 항상 헛돌았다.
    // 주소증·변증도 함께 넣어야 유사도가 의미를 갖는다.
    const symptomNames = (searchDto.symptoms || [])
      .map((s) => (typeof s === 'string' ? s : s?.name))
      .filter((s): s is string => !!s && s.trim().length > 0);

    const query = [searchDto.chiefComplaint, ...symptomNames, searchDto.diagnosis]
      .filter((v): v is string => !!v && v.trim().length > 0)
      .join(' ');
    return this.casesService.searchSimilar({
      query,
      topK: searchDto.topK,
      constitution: searchDto.constitution,
    });
  }

  @Post('similar-success-stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '유사 치험례 성공률 통계',
    description:
      '주소증·증상으로 유사 치험례를 모아 치료 결과 분포와 성공률(완치+호전), 상위 처방을 집계한다.' +
      ' 진료 결과 화면의 "유사 환자 통계" 카드가 사용한다.',
  })
  async getSimilarSuccessStats(
    @Body()
    body: {
      chiefComplaint: string;
      symptoms?: Array<{ name: string; severity?: number }>;
      diagnosis?: string;
      constitution?: string;
    },
  ) {
    return this.casesService.getSimilarSuccessStats(body);
  }

  @Post('search-similar')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'AI 유사도 기반 치험례 검색',
    description:
      '쿼리 텍스트를 OpenAI text-embedding-3-small (1536d) 로 임베딩한 뒤,' +
      ' 모든 치험례 임베딩과 코사인 유사도를 계산해 매칭 % 와 함께 상위 N건 반환.',
  })
  async searchSimilar(
    @Body()
    body: {
      query: string;
      topK?: number;
      threshold?: number;
      constitution?: string;
      outcome?: string;
    },
  ) {
    return this.casesService.searchSimilar(body);
  }
}
