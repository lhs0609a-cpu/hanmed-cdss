import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../../../database/entities/herb-inventory.entity';

// 공급업체 생성 DTO
export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  categories?: string[];
}

// 재고 생성/수정 DTO
export class UpsertInventoryDto {
  @ApiProperty()
  @IsUUID()
  herbId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ default: 'g' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageLocation?: string;
}

// 재고 거래 DTO
export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  inventoryId: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  prescriptionId?: string;
}

// 가격 기록 DTO
export class RecordPriceDto {
  @ApiProperty()
  @IsUUID()
  herbId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

// 발주 항목 DTO
export class PurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  herbId: string;

  @ApiProperty()
  @IsString()
  herbName: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ default: 'g' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

// 발주서 생성 DTO
export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  supplierId: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  shippingFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// 재고 검색 DTO
export class SearchInventoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lowStockOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  expiringOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

// 가격 비교 DTO
export class ComparePricesDto {
  @ApiProperty()
  @IsUUID()
  herbId: string;
}

// 알림 해결 DTO
export class ResolveAlertDto {
  @ApiProperty()
  @IsUUID()
  alertId: string;
}
