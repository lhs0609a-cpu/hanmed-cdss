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
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CampaignType,
  CampaignStatus,
  MessageChannel,
  TriggerType,
} from '../../../database/entities/crm-campaign.entity';

// 타겟팅 규칙 DTO
export class TargetingRulesDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  segments?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  symptoms?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  constitutions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  lastVisitDaysAgo?: { min?: number; max?: number };

  @ApiPropertyOptional()
  @IsOptional()
  ageRange?: { min?: number; max?: number };

  @ApiPropertyOptional({ enum: ['male', 'female', 'all'] })
  @IsOptional()
  gender?: 'male' | 'female' | 'all';
}

// 캠페인 생성 DTO
export class CreateCampaignDto {
  @ApiProperty({ description: '캠페인 이름' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CampaignType })
  @IsEnum(CampaignType)
  type: CampaignType;

  @ApiProperty({ type: TargetingRulesDto })
  @ValidateNested()
  @Type(() => TargetingRulesDto)
  targetingRules: TargetingRulesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// 캠페인 업데이트 DTO
export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ type: TargetingRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetingRulesDto)
  targetingRules?: TargetingRulesDto;
}

// 트리거 조건 DTO
export class TriggerConditionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  daysAfterTreatment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  daysAfterMedicationEnd?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  noVisitDays?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  seasonMonth?: number[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  symptoms?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  healthScoreDropThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  beforeBirthdayDays?: number;
}

// 액션 버튼 DTO
export class ActionButtonDto {
  @ApiProperty()
  @IsString()
  text: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ enum: ['reservation', 'call', 'link'] })
  @IsOptional()
  action?: 'reservation' | 'call' | 'link';
}

// 자동 메시지 생성 DTO
export class CreateAutoMessageDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: TriggerType })
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @ApiProperty({ type: TriggerConditionsDto })
  @ValidateNested()
  @Type(() => TriggerConditionsDto)
  triggerConditions: TriggerConditionsDto;

  @ApiProperty({ enum: MessageChannel })
  @IsEnum(MessageChannel)
  channel: MessageChannel;

  @ApiProperty({ description: '메시지 템플릿 ({{환자명}} 등 변수 사용 가능)' })
  @IsString()
  messageTemplate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kakaoTemplateCode?: string;

  @ApiPropertyOptional({ type: [ActionButtonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionButtonDto)
  actionButtons?: ActionButtonDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// 세그먼트 조건 DTO
export class SegmentConditionDto {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ enum: ['equals', 'contains', 'gt', 'lt', 'between', 'in'] })
  @IsEnum(['equals', 'contains', 'gt', 'lt', 'between', 'in'])
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';

  @ApiProperty()
  value: any;
}

// 세그먼트 생성 DTO
export class CreateSegmentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [SegmentConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentConditionDto)
  conditions: SegmentConditionDto[];

  @ApiProperty({ enum: ['and', 'or'] })
  @IsEnum(['and', 'or'])
  logic: 'and' | 'or';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoUpdate?: boolean;
}

// 퍼널 스테이지 생성 DTO
export class CreateFunnelStageDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  order: number;

  @ApiProperty()
  entryConditions: {
    triggers: Array<{ type: string; value: any }>;
  };

  @ApiProperty()
  actions: Array<{
    type: 'send_message' | 'create_task' | 'update_tag' | 'notify_staff';
    config: any;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  exitConditions?: {
    triggers: Array<{ type: string; value: any }>;
    nextStageId?: string;
  };
}

// 메시지 발송 요청 DTO
export class SendMessageDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  patientIds: string[];

  @ApiProperty({ enum: MessageChannel })
  @IsEnum(MessageChannel)
  channel: MessageChannel;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ type: [ActionButtonDto] })
  @IsOptional()
  @IsArray()
  actionButtons?: ActionButtonDto[];
}
