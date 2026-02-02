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
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import {
  CreateSupplierDto,
  UpsertInventoryDto,
  CreateTransactionDto,
  RecordPriceDto,
  CreatePurchaseOrderDto,
  SearchInventoryDto,
  ResolveAlertDto,
} from './dto';
import { TransactionType } from '../../database/entities/herb-inventory.entity';

@ApiTags('Inventory Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ============ Suppliers ============

  @Post('suppliers')
  @ApiOperation({ summary: '공급업체 등록' })
  async createSupplier(@Body() dto: CreateSupplierDto) {
    const result = await this.inventoryService.createSupplier(dto);
    return { success: true, data: result };
  }

  @Get('suppliers')
  @ApiOperation({ summary: '공급업체 목록 조회' })
  async getSuppliers() {
    const result = await this.inventoryService.getSuppliers();
    return { success: true, data: result };
  }

  @Get('suppliers/:id')
  @ApiOperation({ summary: '공급업체 상세 조회' })
  @ApiParam({ name: 'id', description: '공급업체 ID' })
  async getSupplier(@Param('id') id: string) {
    const result = await this.inventoryService.getSupplier(id);
    return { success: true, data: result };
  }

  // ============ Inventory ============

  @Post('items')
  @ApiOperation({ summary: '재고 등록/수정' })
  async upsertInventory(
    @Request() req: any,
    @Body() dto: UpsertInventoryDto,
  ) {
    const result = await this.inventoryService.upsertInventory(
      req.user.clinicId || req.user.id,
      {
        ...dto,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    );
    return { success: true, data: result };
  }

  @Get('items')
  @ApiOperation({ summary: '재고 목록 조회' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'lowStockOnly', type: Boolean, required: false })
  @ApiQuery({ name: 'expiringOnly', type: Boolean, required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  async getInventory(
    @Request() req: any,
    @Query() query: SearchInventoryDto,
  ) {
    const result = await this.inventoryService.getInventory(
      req.user.clinicId || req.user.id,
      query,
    );
    return { success: true, data: result };
  }

  @Get('summary')
  @ApiOperation({ summary: '재고 현황 요약' })
  async getInventorySummary(@Request() req: any) {
    const result = await this.inventoryService.getInventorySummary(
      req.user.clinicId || req.user.id,
    );
    return { success: true, data: result };
  }

  // ============ Transactions ============

  @Post('transactions')
  @ApiOperation({ summary: '재고 거래 기록' })
  async recordTransaction(
    @Request() req: any,
    @Body() dto: CreateTransactionDto,
  ) {
    const result = await this.inventoryService.recordTransaction(
      req.user.clinicId || req.user.id,
      req.user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Get('transactions')
  @ApiOperation({ summary: '거래 내역 조회' })
  @ApiQuery({ name: 'inventoryId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'transactionType', enum: TransactionType, required: false })
  async getTransactions(
    @Request() req: any,
    @Query('inventoryId') inventoryId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transactionType') transactionType?: TransactionType,
  ) {
    const result = await this.inventoryService.getTransactions(
      req.user.clinicId || req.user.id,
      {
        inventoryId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        transactionType,
      },
    );
    return { success: true, data: result };
  }

  // ============ Prices ============

  @Post('prices')
  @ApiOperation({ summary: '가격 기록' })
  async recordPrice(@Body() dto: RecordPriceDto) {
    const result = await this.inventoryService.recordPrice(dto);
    return { success: true, data: result };
  }

  @Get('prices/compare/:herbId')
  @ApiOperation({ summary: '공급업체별 가격 비교' })
  @ApiParam({ name: 'herbId', description: '약재 ID' })
  async comparePrices(@Param('herbId') herbId: string) {
    const result = await this.inventoryService.comparePrices(herbId);
    return { success: true, data: result };
  }

  @Get('prices/history/:herbId')
  @ApiOperation({ summary: '가격 추이 조회' })
  @ApiParam({ name: 'herbId', description: '약재 ID' })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'days', type: Number, required: false })
  async getPriceHistory(
    @Param('herbId') herbId: string,
    @Query('supplierId') supplierId?: string,
    @Query('days') days?: number,
  ) {
    const result = await this.inventoryService.getPriceHistory(
      herbId,
      supplierId,
      days ? Number(days) : 90,
    );
    return { success: true, data: result };
  }

  // ============ Alerts ============

  @Get('alerts')
  @ApiOperation({ summary: '재고 알림 조회' })
  @ApiQuery({ name: 'unresolvedOnly', type: Boolean, required: false })
  async getAlerts(
    @Request() req: any,
    @Query('unresolvedOnly') unresolvedOnly?: boolean,
  ) {
    const result = await this.inventoryService.getAlerts(
      req.user.clinicId || req.user.id,
      unresolvedOnly !== false,
    );
    return { success: true, data: result };
  }

  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '알림 해결' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  async resolveAlert(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const result = await this.inventoryService.resolveAlert(id, req.user.id);
    return { success: true, data: result };
  }

  // ============ Purchase Orders ============

  @Post('orders')
  @ApiOperation({ summary: '발주서 생성' })
  async createPurchaseOrder(
    @Request() req: any,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    const result = await this.inventoryService.createPurchaseOrder(
      req.user.clinicId || req.user.id,
      req.user.id,
      {
        ...dto,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
      },
    );
    return { success: true, data: result };
  }

  @Get('orders')
  @ApiOperation({ summary: '발주서 목록 조회' })
  @ApiQuery({ name: 'status', required: false })
  async getPurchaseOrders(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    const result = await this.inventoryService.getPurchaseOrders(
      req.user.clinicId || req.user.id,
      status,
    );
    return { success: true, data: result };
  }

  @Put('orders/:id/status')
  @ApiOperation({ summary: '발주서 상태 변경' })
  @ApiParam({ name: 'id', description: '발주서 ID' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: 'submitted' | 'confirmed' | 'shipped' | 'received' | 'cancelled',
  ) {
    const result = await this.inventoryService.updateOrderStatus(id, status);
    return { success: true, data: result };
  }

  @Post('orders/:id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '발주서 입고 처리' })
  @ApiParam({ name: 'id', description: '발주서 ID' })
  async receiveOrder(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const result = await this.inventoryService.receiveOrder(
      id,
      req.user.clinicId || req.user.id,
      req.user.id,
    );
    return { success: true, data: result };
  }

  // ============ Reports ============

  @Get('reports/usage')
  @ApiOperation({ summary: '사용량 분석' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getUsageAnalysis(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.inventoryService.getUsageAnalysis(
      req.user.clinicId || req.user.id,
      new Date(startDate),
      new Date(endDate),
    );
    return { success: true, data: result };
  }
}
