import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Clinic } from './clinic.entity';
import { Herb } from './herb.entity';
import { User } from './user.entity';

export enum InventoryAlertType {
  LOW_STOCK = 'low_stock',         // 재고 부족
  OUT_OF_STOCK = 'out_of_stock',   // 재고 없음
  EXPIRING_SOON = 'expiring_soon', // 유통기한 임박
  PRICE_CHANGE = 'price_change',   // 가격 변동
  REORDER_POINT = 'reorder_point', // 재주문 시점
}

export enum TransactionType {
  PURCHASE = 'purchase',     // 구매
  USAGE = 'usage',           // 사용
  ADJUSTMENT = 'adjustment', // 조정
  RETURN = 'return',         // 반품
  DISPOSAL = 'disposal',     // 폐기
}

// 약재 공급업체
@Entity('herb_suppliers')
@Index(['isActive'])
export class HerbSupplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  businessNumber: string;  // 사업자등록번호

  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column('text', { nullable: true })
  address: string;

  @Column({ nullable: true })
  website: string;

  // 주요 취급 약재 카테고리
  @Column('simple-array', { nullable: true })
  categories: string[];

  // 거래 조건
  @Column('jsonb', { nullable: true })
  terms: {
    minOrderAmount?: number;      // 최소 주문 금액
    deliveryDays?: number;        // 배송 소요일
    paymentTerms?: string;        // 결제 조건
    discountRate?: number;        // 할인율
  };

  // 평가
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 약재 재고
@Entity('herb_inventory')
@Index(['clinicId'])
@Index(['herbId'])
@Index(['supplierId'])
export class HerbInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column('uuid')
  herbId: string;

  @ManyToOne(() => Herb)
  @JoinColumn({ name: 'herbId' })
  herb: Herb;

  @Column('uuid', { nullable: true })
  supplierId: string;

  @ManyToOne(() => HerbSupplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: HerbSupplier;

  // 재고 수량 (그램)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number;

  // 단위
  @Column({ default: 'g' })
  unit: string;

  // 최소 재고량 (알림 기준)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100 })
  minStockLevel: number;

  // 재주문 시점
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 200 })
  reorderPoint: number;

  // 현재 단가 (그램당)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitPrice: number;

  // 평균 구매가
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgPurchasePrice: number;

  // 유통기한
  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  // 배치/로트 번호
  @Column({ nullable: true })
  batchNumber: string;

  // 보관 위치
  @Column({ nullable: true })
  storageLocation: string;

  // 마지막 입고일
  @Column({ type: 'date', nullable: true })
  lastRestockDate: Date;

  // 마지막 사용일
  @Column({ type: 'date', nullable: true })
  lastUsedDate: Date;

  // 월평균 사용량
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgMonthlyUsage: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 재고 거래 기록
@Entity('herb_inventory_transactions')
@Index(['inventoryId'])
@Index(['clinicId'])
@Index(['transactionDate'])
@Index(['transactionType'])
export class HerbInventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  inventoryId: string;

  @ManyToOne(() => HerbInventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryId' })
  inventory: HerbInventory;

  @Column('uuid')
  clinicId: string;

  @Column('uuid', { nullable: true })
  performedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performedById' })
  performedBy: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  totalAmount: number;

  // 거래 전 수량
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  previousQuantity: number;

  // 거래 후 수량
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  newQuantity: number;

  @Column({ type: 'date' })
  transactionDate: Date;

  // 관련 처방 ID (사용 시)
  @Column('uuid', { nullable: true })
  prescriptionId: string;

  // 관련 발주 ID (구매 시)
  @Column('uuid', { nullable: true })
  purchaseOrderId: string;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 약재 가격 이력
@Entity('herb_price_history')
@Index(['herbId'])
@Index(['supplierId'])
@Index(['recordedAt'])
export class HerbPriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  herbId: string;

  @ManyToOne(() => Herb)
  @JoinColumn({ name: 'herbId' })
  herb: Herb;

  @Column('uuid', { nullable: true })
  supplierId: string;

  @ManyToOne(() => HerbSupplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: HerbSupplier;

  // 가격 (그램당)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  // 이전 가격
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  previousPrice: number;

  // 변동률 (%)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  changeRate: number;

  // 시장 평균가
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  marketAvgPrice: number;

  @Column({ type: 'timestamp' })
  recordedAt: Date;

  // 가격 출처
  @Column({ nullable: true })
  source: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 재고 알림
@Entity('herb_inventory_alerts')
@Index(['clinicId'])
@Index(['inventoryId'])
@Index(['isResolved'])
@Index(['alertType'])
export class HerbInventoryAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column('uuid')
  inventoryId: string;

  @ManyToOne(() => HerbInventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryId' })
  inventory: HerbInventory;

  @Column({
    type: 'enum',
    enum: InventoryAlertType,
  })
  alertType: InventoryAlertType;

  @Column('text')
  message: string;

  // 심각도
  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity: string;

  // 관련 데이터
  @Column('jsonb', { nullable: true })
  data: {
    currentQuantity?: number;
    minLevel?: number;
    expiryDate?: string;
    priceChange?: number;
  };

  // 해결 여부
  @Column({ default: false })
  isResolved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column('uuid', { nullable: true })
  resolvedById: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 발주서
@Entity('herb_purchase_orders')
@Index(['clinicId'])
@Index(['supplierId'])
@Index(['status'])
@Index(['orderDate'])
export class HerbPurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 발주 번호
  @Column({ unique: true })
  orderNumber: string;

  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column('uuid')
  supplierId: string;

  @ManyToOne(() => HerbSupplier)
  @JoinColumn({ name: 'supplierId' })
  supplier: HerbSupplier;

  @Column('uuid')
  orderedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'orderedById' })
  orderedBy: User;

  @Column({
    type: 'enum',
    enum: ['draft', 'submitted', 'confirmed', 'shipped', 'received', 'cancelled'],
    default: 'draft',
  })
  status: string;

  // 발주 항목
  @Column('jsonb')
  items: Array<{
    herbId: string;
    herbName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  totalAmount: number;

  // 배송비
  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  shippingFee: number;

  // 할인
  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  discount: number;

  // 최종 금액
  @Column({ type: 'decimal', precision: 10, scale: 0 })
  finalAmount: number;

  @Column({ type: 'date' })
  orderDate: Date;

  @Column({ type: 'date', nullable: true })
  expectedDeliveryDate: Date;

  @Column({ type: 'date', nullable: true })
  actualDeliveryDate: Date;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
