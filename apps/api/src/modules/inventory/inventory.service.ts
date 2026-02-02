import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HerbSupplier,
  HerbInventory,
  HerbInventoryTransaction,
  HerbPriceHistory,
  HerbInventoryAlert,
  HerbPurchaseOrder,
  TransactionType,
  InventoryAlertType,
} from '../../database/entities/herb-inventory.entity';
import { Herb } from '../../database/entities/herb.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(HerbSupplier)
    private supplierRepository: Repository<HerbSupplier>,
    @InjectRepository(HerbInventory)
    private inventoryRepository: Repository<HerbInventory>,
    @InjectRepository(HerbInventoryTransaction)
    private transactionRepository: Repository<HerbInventoryTransaction>,
    @InjectRepository(HerbPriceHistory)
    private priceHistoryRepository: Repository<HerbPriceHistory>,
    @InjectRepository(HerbInventoryAlert)
    private alertRepository: Repository<HerbInventoryAlert>,
    @InjectRepository(HerbPurchaseOrder)
    private purchaseOrderRepository: Repository<HerbPurchaseOrder>,
    @InjectRepository(Herb)
    private herbRepository: Repository<Herb>,
  ) {}

  // ============ Suppliers ============

  /**
   * 공급업체 생성
   */
  async createSupplier(data: {
    name: string;
    businessNumber?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    categories?: string[];
  }): Promise<HerbSupplier> {
    const supplier = this.supplierRepository.create(data);
    return this.supplierRepository.save(supplier);
  }

  /**
   * 공급업체 목록 조회
   */
  async getSuppliers(): Promise<HerbSupplier[]> {
    return this.supplierRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * 공급업체 상세 조회
   */
  async getSupplier(supplierId: string): Promise<HerbSupplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new NotFoundException('공급업체를 찾을 수 없습니다.');
    }

    return supplier;
  }

  // ============ Inventory ============

  /**
   * 재고 생성/수정
   */
  async upsertInventory(
    clinicId: string,
    data: {
      herbId: string;
      supplierId?: string;
      quantity: number;
      unit?: string;
      minStockLevel?: number;
      reorderPoint?: number;
      unitPrice?: number;
      expiryDate?: Date;
      batchNumber?: string;
      storageLocation?: string;
    },
  ): Promise<HerbInventory> {
    let inventory = await this.inventoryRepository.findOne({
      where: { clinicId, herbId: data.herbId },
    });

    if (inventory) {
      Object.assign(inventory, data);
    } else {
      inventory = this.inventoryRepository.create({
        clinicId,
        ...data,
        avgPurchasePrice: data.unitPrice || 0,
      });
    }

    const saved = await this.inventoryRepository.save(inventory);

    // 재고 알림 체크
    await this.checkInventoryAlerts(saved);

    return saved;
  }

  /**
   * 재고 목록 조회
   */
  async getInventory(
    clinicId: string,
    options?: {
      keyword?: string;
      lowStockOnly?: boolean;
      expiringOnly?: boolean;
      supplierId?: string;
    },
  ): Promise<HerbInventory[]> {
    const queryBuilder = this.inventoryRepository.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.herb', 'herb')
      .leftJoinAndSelect('inv.supplier', 'supplier')
      .where('inv.clinicId = :clinicId', { clinicId });

    if (options?.keyword) {
      queryBuilder.andWhere('herb.name ILIKE :keyword', { keyword: `%${options.keyword}%` });
    }

    if (options?.lowStockOnly) {
      queryBuilder.andWhere('inv.quantity <= inv.reorderPoint');
    }

    if (options?.expiringOnly) {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      queryBuilder.andWhere('inv.expiryDate <= :expiry', { expiry: thirtyDaysLater });
    }

    if (options?.supplierId) {
      queryBuilder.andWhere('inv.supplierId = :supplierId', { supplierId: options.supplierId });
    }

    return queryBuilder.orderBy('herb.name', 'ASC').getMany();
  }

  /**
   * 재고 거래 기록
   */
  async recordTransaction(
    clinicId: string,
    performedById: string,
    data: {
      inventoryId: string;
      transactionType: TransactionType;
      quantity: number;
      unitPrice?: number;
      notes?: string;
      prescriptionId?: string;
    },
  ): Promise<HerbInventoryTransaction> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id: data.inventoryId, clinicId },
    });

    if (!inventory) {
      throw new NotFoundException('재고를 찾을 수 없습니다.');
    }

    const previousQuantity = Number(inventory.quantity);
    let newQuantity: number;

    // 거래 유형에 따른 수량 변경
    switch (data.transactionType) {
      case TransactionType.PURCHASE:
        newQuantity = previousQuantity + data.quantity;
        inventory.lastRestockDate = new Date();
        break;
      case TransactionType.USAGE:
      case TransactionType.DISPOSAL:
        if (previousQuantity < data.quantity) {
          throw new BadRequestException('재고가 부족합니다.');
        }
        newQuantity = previousQuantity - data.quantity;
        inventory.lastUsedDate = new Date();
        break;
      case TransactionType.ADJUSTMENT:
        newQuantity = data.quantity; // 직접 설정
        break;
      case TransactionType.RETURN:
        newQuantity = previousQuantity + data.quantity;
        break;
      default:
        newQuantity = previousQuantity;
    }

    const totalAmount = data.unitPrice ? data.quantity * data.unitPrice : null;

    const transaction = this.transactionRepository.create({
      inventoryId: data.inventoryId,
      clinicId,
      performedById,
      transactionType: data.transactionType,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalAmount,
      previousQuantity,
      newQuantity,
      transactionDate: new Date(),
      prescriptionId: data.prescriptionId,
      notes: data.notes,
    });

    // 재고 업데이트
    inventory.quantity = newQuantity;

    // 평균 구매가 업데이트 (구매 시)
    if (data.transactionType === TransactionType.PURCHASE && data.unitPrice) {
      const totalValue = Number(inventory.avgPurchasePrice) * previousQuantity + data.unitPrice * data.quantity;
      inventory.avgPurchasePrice = totalValue / newQuantity;
    }

    await this.inventoryRepository.save(inventory);
    const saved = await this.transactionRepository.save(transaction);

    // 재고 알림 체크
    await this.checkInventoryAlerts(inventory);

    return saved;
  }

  /**
   * 거래 내역 조회
   */
  async getTransactions(
    clinicId: string,
    options?: {
      inventoryId?: string;
      startDate?: Date;
      endDate?: Date;
      transactionType?: TransactionType;
    },
  ): Promise<HerbInventoryTransaction[]> {
    const queryBuilder = this.transactionRepository.createQueryBuilder('tx')
      .leftJoinAndSelect('tx.inventory', 'inventory')
      .leftJoinAndSelect('inventory.herb', 'herb')
      .where('tx.clinicId = :clinicId', { clinicId });

    if (options?.inventoryId) {
      queryBuilder.andWhere('tx.inventoryId = :inventoryId', { inventoryId: options.inventoryId });
    }

    if (options?.startDate && options?.endDate) {
      queryBuilder.andWhere('tx.transactionDate BETWEEN :start AND :end', {
        start: options.startDate,
        end: options.endDate,
      });
    }

    if (options?.transactionType) {
      queryBuilder.andWhere('tx.transactionType = :type', { type: options.transactionType });
    }

    return queryBuilder.orderBy('tx.transactionDate', 'DESC').getMany();
  }

  // ============ Prices ============

  /**
   * 가격 기록
   */
  async recordPrice(data: {
    herbId: string;
    supplierId?: string;
    price: number;
    source?: string;
  }): Promise<HerbPriceHistory> {
    // 이전 가격 조회
    const previousPrice = await this.priceHistoryRepository.findOne({
      where: { herbId: data.herbId, supplierId: data.supplierId },
      order: { recordedAt: 'DESC' },
    });

    const changeRate = previousPrice
      ? ((data.price - Number(previousPrice.price)) / Number(previousPrice.price)) * 100
      : null;

    const priceRecord = this.priceHistoryRepository.create({
      herbId: data.herbId,
      supplierId: data.supplierId,
      price: data.price,
      previousPrice: previousPrice?.price,
      changeRate,
      recordedAt: new Date(),
      source: data.source,
    });

    return this.priceHistoryRepository.save(priceRecord);
  }

  /**
   * 가격 비교 (공급업체별)
   */
  async comparePrices(herbId: string): Promise<{
    herb: Herb;
    prices: Array<{
      supplier: HerbSupplier;
      currentPrice: number;
      avgPrice: number;
      priceHistory: HerbPriceHistory[];
    }>;
    marketAvg: number;
  }> {
    const herb = await this.herbRepository.findOne({ where: { id: herbId } });
    if (!herb) {
      throw new NotFoundException('약재를 찾을 수 없습니다.');
    }

    // 공급업체별 가격 조회
    const suppliers = await this.supplierRepository.find({ where: { isActive: true } });
    const prices: Array<{
      supplier: HerbSupplier;
      currentPrice: number;
      avgPrice: number;
      priceHistory: HerbPriceHistory[];
    }> = [];

    let totalPrice = 0;
    let priceCount = 0;

    for (const supplier of suppliers) {
      const history = await this.priceHistoryRepository.find({
        where: { herbId, supplierId: supplier.id },
        order: { recordedAt: 'DESC' },
        take: 10,
      });

      if (history.length > 0) {
        const currentPrice = Number(history[0].price);
        const avgPrice = history.reduce((sum, h) => sum + Number(h.price), 0) / history.length;

        prices.push({
          supplier,
          currentPrice,
          avgPrice,
          priceHistory: history,
        });

        totalPrice += currentPrice;
        priceCount++;
      }
    }

    const marketAvg = priceCount > 0 ? totalPrice / priceCount : 0;

    return { herb, prices, marketAvg };
  }

  /**
   * 가격 추이 조회
   */
  async getPriceHistory(
    herbId: string,
    supplierId?: string,
    days: number = 90,
  ): Promise<HerbPriceHistory[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      herbId,
      recordedAt: MoreThanOrEqual(startDate),
    };

    if (supplierId) {
      where.supplierId = supplierId;
    }

    return this.priceHistoryRepository.find({
      where,
      order: { recordedAt: 'ASC' },
    });
  }

  // ============ Alerts ============

  /**
   * 알림 조회
   */
  async getAlerts(
    clinicId: string,
    unresolvedOnly: boolean = true,
  ): Promise<HerbInventoryAlert[]> {
    const where: any = { clinicId };
    if (unresolvedOnly) {
      where.isResolved = false;
    }

    return this.alertRepository.find({
      where,
      relations: ['inventory', 'inventory.herb'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 알림 해결
   */
  async resolveAlert(alertId: string, resolvedById: string): Promise<HerbInventoryAlert> {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });

    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedById = resolvedById;

    return this.alertRepository.save(alert);
  }

  /**
   * 재고 알림 체크 및 생성
   */
  private async checkInventoryAlerts(inventory: HerbInventory): Promise<void> {
    const alerts: Partial<HerbInventoryAlert>[] = [];

    // 재고 부족 알림
    if (Number(inventory.quantity) <= 0) {
      alerts.push({
        clinicId: inventory.clinicId,
        inventoryId: inventory.id,
        alertType: InventoryAlertType.OUT_OF_STOCK,
        severity: 'critical',
        message: `${inventory.herb?.standardName || '약재'} 재고가 소진되었습니다.`,
        data: { currentQuantity: Number(inventory.quantity) },
      });
    } else if (Number(inventory.quantity) <= Number(inventory.reorderPoint)) {
      alerts.push({
        clinicId: inventory.clinicId,
        inventoryId: inventory.id,
        alertType: InventoryAlertType.REORDER_POINT,
        severity: 'high',
        message: `${inventory.herb?.standardName || '약재'} 재주문 시점에 도달했습니다.`,
        data: {
          currentQuantity: Number(inventory.quantity),
          minLevel: Number(inventory.reorderPoint),
        },
      });
    } else if (Number(inventory.quantity) <= Number(inventory.minStockLevel)) {
      alerts.push({
        clinicId: inventory.clinicId,
        inventoryId: inventory.id,
        alertType: InventoryAlertType.LOW_STOCK,
        severity: 'medium',
        message: `${inventory.herb?.standardName || '약재'} 재고가 부족합니다.`,
        data: {
          currentQuantity: Number(inventory.quantity),
          minLevel: Number(inventory.minStockLevel),
        },
      });
    }

    // 유통기한 알림
    if (inventory.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (new Date(inventory.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );

      if (daysUntilExpiry <= 30) {
        alerts.push({
          clinicId: inventory.clinicId,
          inventoryId: inventory.id,
          alertType: InventoryAlertType.EXPIRING_SOON,
          severity: daysUntilExpiry <= 7 ? 'critical' : 'high',
          message: `${inventory.herb?.standardName || '약재'} 유통기한이 ${daysUntilExpiry}일 남았습니다.`,
          data: { expiryDate: inventory.expiryDate.toISOString() },
        });
      }
    }

    // 기존 미해결 알림과 중복 체크 후 저장
    for (const alertData of alerts) {
      const existing = await this.alertRepository.findOne({
        where: {
          inventoryId: alertData.inventoryId,
          alertType: alertData.alertType,
          isResolved: false,
        },
      });

      if (!existing) {
        const alert = this.alertRepository.create(alertData);
        await this.alertRepository.save(alert);
      }
    }
  }

  // ============ Purchase Orders ============

  /**
   * 발주서 생성
   */
  async createPurchaseOrder(
    clinicId: string,
    orderedById: string,
    data: {
      supplierId: string;
      items: Array<{
        herbId: string;
        herbName: string;
        quantity: number;
        unit?: string;
        unitPrice: number;
      }>;
      shippingFee?: number;
      discount?: number;
      expectedDeliveryDate?: Date;
      notes?: string;
    },
  ): Promise<HerbPurchaseOrder> {
    // 발주 번호 생성
    const orderNumber = await this.generateOrderNumber();

    const items = data.items.map(item => ({
      ...item,
      unit: item.unit || 'g',
      totalPrice: item.quantity * item.unitPrice,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const finalAmount = totalAmount + (data.shippingFee || 0) - (data.discount || 0);

    const order = this.purchaseOrderRepository.create({
      orderNumber,
      clinicId,
      supplierId: data.supplierId,
      orderedById,
      status: 'draft',
      items,
      totalAmount,
      shippingFee: data.shippingFee || 0,
      discount: data.discount || 0,
      finalAmount,
      orderDate: new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      notes: data.notes,
    });

    return this.purchaseOrderRepository.save(order);
  }

  /**
   * 발주서 목록 조회
   */
  async getPurchaseOrders(
    clinicId: string,
    status?: string,
  ): Promise<HerbPurchaseOrder[]> {
    const where: any = { clinicId };
    if (status) where.status = status;

    return this.purchaseOrderRepository.find({
      where,
      relations: ['supplier'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 발주서 상태 변경
   */
  async updateOrderStatus(
    orderId: string,
    status: 'submitted' | 'confirmed' | 'shipped' | 'received' | 'cancelled',
  ): Promise<HerbPurchaseOrder> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('발주서를 찾을 수 없습니다.');
    }

    order.status = status;

    if (status === 'received') {
      order.actualDeliveryDate = new Date();
    }

    return this.purchaseOrderRepository.save(order);
  }

  /**
   * 발주서 입고 처리
   */
  async receiveOrder(
    orderId: string,
    clinicId: string,
    receivedById: string,
  ): Promise<HerbPurchaseOrder> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('발주서를 찾을 수 없습니다.');
    }

    // 각 항목 재고에 추가
    for (const item of order.items) {
      let inventory = await this.inventoryRepository.findOne({
        where: { clinicId, herbId: item.herbId },
      });

      if (!inventory) {
        inventory = this.inventoryRepository.create({
          clinicId,
          herbId: item.herbId,
          supplierId: order.supplierId,
          quantity: 0,
          unit: item.unit,
          unitPrice: item.unitPrice,
        });
        inventory = await this.inventoryRepository.save(inventory);
      }

      await this.recordTransaction(clinicId, receivedById, {
        inventoryId: inventory.id,
        transactionType: TransactionType.PURCHASE,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: `발주서 ${order.orderNumber} 입고`,
      });
    }

    return this.updateOrderStatus(orderId, 'received');
  }

  // ============ Reports ============

  /**
   * 재고 현황 요약
   */
  async getInventorySummary(clinicId: string): Promise<{
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringCount: number;
    unresolvedAlerts: number;
  }> {
    const inventory = await this.inventoryRepository.find({
      where: { clinicId },
    });

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const totalItems = inventory.length;
    const totalValue = inventory.reduce(
      (sum, inv) => sum + Number(inv.quantity) * Number(inv.unitPrice),
      0,
    );
    const lowStockCount = inventory.filter(
      inv => Number(inv.quantity) <= Number(inv.minStockLevel) && Number(inv.quantity) > 0,
    ).length;
    const outOfStockCount = inventory.filter(inv => Number(inv.quantity) <= 0).length;
    const expiringCount = inventory.filter(
      inv => inv.expiryDate && new Date(inv.expiryDate) <= thirtyDaysLater,
    ).length;

    const unresolvedAlerts = await this.alertRepository.count({
      where: { clinicId, isResolved: false },
    });

    return {
      totalItems,
      totalValue,
      lowStockCount,
      outOfStockCount,
      expiringCount,
      unresolvedAlerts,
    };
  }

  /**
   * 사용량 분석
   */
  async getUsageAnalysis(
    clinicId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{
    herbId: string;
    herbName: string;
    totalUsage: number;
    avgDailyUsage: number;
    estimatedDaysRemaining: number;
  }>> {
    const transactions = await this.transactionRepository.find({
      where: {
        clinicId,
        transactionType: TransactionType.USAGE,
        transactionDate: Between(startDate, endDate),
      },
      relations: ['inventory', 'inventory.herb'],
    });

    // 약재별 사용량 집계
    const usageMap = new Map<string, { herbName: string; totalUsage: number; currentStock: number }>();

    for (const tx of transactions) {
      const herbId = tx.inventory.herbId;
      const existing = usageMap.get(herbId) || {
        herbName: tx.inventory.herb?.standardName || '',
        totalUsage: 0,
        currentStock: Number(tx.inventory.quantity),
      };
      existing.totalUsage += Number(tx.quantity);
      usageMap.set(herbId, existing);
    }

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    return Array.from(usageMap.entries()).map(([herbId, data]) => ({
      herbId,
      herbName: data.herbName,
      totalUsage: data.totalUsage,
      avgDailyUsage: data.totalUsage / days,
      estimatedDaysRemaining: data.totalUsage > 0
        ? Math.floor(data.currentStock / (data.totalUsage / days))
        : 999,
    })).sort((a, b) => b.totalUsage - a.totalUsage);
  }

  // ============ Scheduled Tasks ============

  /**
   * 매일 알림 체크
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async dailyAlertCheck(): Promise<void> {
    console.log('Running daily inventory alert check...');

    const inventories = await this.inventoryRepository.find({
      relations: ['herb'],
    });

    for (const inventory of inventories) {
      await this.checkInventoryAlerts(inventory);
    }

    console.log('Daily inventory alert check completed.');
  }

  // ============ Helpers ============

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const count = await this.purchaseOrderRepository.count({
      where: {
        orderDate: Between(
          new Date(today.setHours(0, 0, 0, 0)),
          new Date(today.setHours(23, 59, 59, 999)),
        ),
      },
    });

    return `PO-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
}
