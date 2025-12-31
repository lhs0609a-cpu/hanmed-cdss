import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class SearchClinicsDto {
  @ApiPropertyOptional({ description: '검색 키워드 (이름, 주소)' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '현재 위도' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '현재 경도' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '검색 반경 (km)', default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radius?: number = 5;

  @ApiPropertyOptional({ description: '전문 분야 필터' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  specialties?: string[];

  @ApiPropertyOptional({ description: 'HanMed 인증 한의원만' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hanmedVerifiedOnly?: boolean;

  @ApiPropertyOptional({ description: '예약 가능한 한의원만' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  reservationEnabledOnly?: boolean;

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: ['distance', 'rating', 'reviewCount', 'name'],
  })
  @IsOptional()
  @IsEnum(['distance', 'rating', 'reviewCount', 'name'])
  sortBy?: 'distance' | 'rating' | 'reviewCount' | 'name' = 'distance';
}

export class GetAvailabilityDto {
  @ApiProperty({ description: '조회 시작 날짜', example: '2024-01-15' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: '조회 종료 날짜', example: '2024-01-21' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ description: '의료진 ID' })
  @IsOptional()
  @IsString()
  practitionerId?: string;
}

export class CreateClinicDto {
  @ApiProperty({ description: '한의원 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '사업자 번호' })
  @IsOptional()
  @IsString()
  businessNumber?: string;

  @ApiPropertyOptional({ description: '전화번호' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '이메일' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: '도로명 주소' })
  @IsOptional()
  @IsString()
  addressRoad?: string;

  @ApiPropertyOptional({ description: '상세 주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ description: '위도' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '경도' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '전문 분야' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: '한의원 소개' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '운영시간' })
  @IsOptional()
  operatingHours?: Record<string, any>;

  @ApiPropertyOptional({ description: '예약 활성화', default: true })
  @IsOptional()
  @IsBoolean()
  reservationEnabled?: boolean;

  @ApiPropertyOptional({ description: '예약 간격 (분)', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reservationInterval?: number;
}

export class UpdateClinicDto extends CreateClinicDto {}
