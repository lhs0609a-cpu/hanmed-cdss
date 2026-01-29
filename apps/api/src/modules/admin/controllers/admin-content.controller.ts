import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminContentService } from '../services/admin-content.service';
import {
  PaginationQueryDto,
  CreateCaseDto,
  UpdateCaseDto,
  CreateFormulaDto,
  UpdateFormulaDto,
  UpdateFormulaHerbsDto,
  CreateHerbDto,
  UpdateHerbDto,
  CreateInteractionDto,
  UpdateInteractionDto,
} from '../dto/admin-content.dto';

@Controller('admin/content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('content_manager', 'admin', 'super_admin')
export class AdminContentController {
  constructor(private readonly contentService: AdminContentService) {}

  // ============ Clinical Cases ============

  @Get('cases')
  async findAllCases(@Query() query: PaginationQueryDto) {
    return this.contentService.findAllCases(query);
  }

  @Post('cases')
  async createCase(@Body() dto: CreateCaseDto, @Request() req: any) {
    return this.contentService.createCase(dto, req.user.id);
  }

  @Patch('cases/:id')
  async updateCase(
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
    @Request() req: any,
  ) {
    return this.contentService.updateCase(id, dto, req.user.id);
  }

  @Delete('cases/:id')
  async deleteCase(@Param('id') id: string, @Request() req: any) {
    return this.contentService.deleteCase(id, req.user.id);
  }

  // ============ Formulas ============

  @Get('formulas')
  async findAllFormulas(@Query() query: PaginationQueryDto) {
    return this.contentService.findAllFormulas(query);
  }

  @Post('formulas')
  async createFormula(@Body() dto: CreateFormulaDto, @Request() req: any) {
    return this.contentService.createFormula(dto, req.user.id);
  }

  @Patch('formulas/:id')
  async updateFormula(
    @Param('id') id: string,
    @Body() dto: UpdateFormulaDto,
    @Request() req: any,
  ) {
    return this.contentService.updateFormula(id, dto, req.user.id);
  }

  @Delete('formulas/:id')
  async deleteFormula(@Param('id') id: string, @Request() req: any) {
    return this.contentService.deleteFormula(id, req.user.id);
  }

  @Put('formulas/:id/herbs')
  async updateFormulaHerbs(
    @Param('id') id: string,
    @Body() dto: UpdateFormulaHerbsDto,
    @Request() req: any,
  ) {
    return this.contentService.updateFormulaHerbs(id, dto, req.user.id);
  }

  // ============ Herbs ============

  @Get('herbs')
  async findAllHerbs(@Query() query: PaginationQueryDto) {
    return this.contentService.findAllHerbs(query);
  }

  @Post('herbs')
  async createHerb(@Body() dto: CreateHerbDto, @Request() req: any) {
    return this.contentService.createHerb(dto, req.user.id);
  }

  @Patch('herbs/:id')
  async updateHerb(
    @Param('id') id: string,
    @Body() dto: UpdateHerbDto,
    @Request() req: any,
  ) {
    return this.contentService.updateHerb(id, dto, req.user.id);
  }

  @Delete('herbs/:id')
  async deleteHerb(@Param('id') id: string, @Request() req: any) {
    return this.contentService.deleteHerb(id, req.user.id);
  }

  // ============ Interactions ============

  @Get('interactions')
  async findAllInteractions(@Query() query: PaginationQueryDto) {
    return this.contentService.findAllInteractions(query);
  }

  @Post('interactions')
  async createInteraction(@Body() dto: CreateInteractionDto, @Request() req: any) {
    return this.contentService.createInteraction(dto, req.user.id);
  }

  @Patch('interactions/:id')
  async updateInteraction(
    @Param('id') id: string,
    @Body() dto: UpdateInteractionDto,
    @Request() req: any,
  ) {
    return this.contentService.updateInteraction(id, dto, req.user.id);
  }

  @Delete('interactions/:id')
  async deleteInteraction(@Param('id') id: string, @Request() req: any) {
    return this.contentService.deleteInteraction(id, req.user.id);
  }
}
