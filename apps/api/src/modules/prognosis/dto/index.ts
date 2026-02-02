import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// 예후 예측 요청 DTO
export class PredictPrognosisDto {
  @ApiProperty({ description: '진료 기록 ID' })
  @IsUUID()
  recordId: string;
}

// 유사 케이스 통계 요청 DTO
export class SimilarCaseStatisticsDto {
  @ApiProperty({ type: [String], description: '증상 목록' })
  @IsArray()
  @IsString({ each: true })
  symptoms: string[];

  @ApiPropertyOptional({ description: '체질' })
  @IsOptional()
  @IsString()
  constitution?: string;

  @ApiPropertyOptional({ description: '처방명' })
  @IsOptional()
  @IsString()
  formula?: string;
}

// 실제 결과 기록 DTO
export class RecordActualOutcomeDto {
  @ApiProperty({ description: '실제 치료 기간 (일)' })
  @IsNumber()
  @Min(1)
  actualDuration: number;

  @ApiProperty({ description: '실제 호전율 (0-100%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  actualImprovement: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// 예후 예측 응답
export class PredictionResultDto {
  @ApiProperty({ description: '예측 ID' })
  id: string;

  @ApiProperty({ description: '진료 기록 ID' })
  recordId: string;

  @ApiProperty({ description: '환자 ID' })
  patientId: string;

  @ApiProperty({
    description: '예측 결과',
    example: {
      expectedDuration: { optimistic: 14, typical: 21, conservative: 35 },
      improvementRate: { week1: 20, week2: 45, week4: 70, week8: 90 },
      confidenceScore: 0.78,
      relapseProbability: 0.15,
      factors: [
        { factor: '젊은 연령', impact: 'positive', weight: 0.3 },
        { factor: '만성 질환', impact: 'negative', weight: 0.2 },
      ],
    },
  })
  prediction: {
    expectedDuration: {
      optimistic: number;
      typical: number;
      conservative: number;
    };
    improvementRate: {
      week1: number;
      week2: number;
      week4: number;
      week8: number;
    };
    confidenceScore: number;
    relapseProbability: number;
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative';
      weight: number;
    }>;
  };

  @ApiProperty({
    description: '근거 데이터',
    example: {
      similarCases: 127,
      avgOutcome: 78.5,
      dataSource: 'clinical_cases',
      modelVersion: '1.0.0',
    },
  })
  evidence: {
    similarCases: number;
    avgOutcome: number;
    dataSource: string;
    modelVersion: string;
  };

  @ApiProperty({ description: '생성 일시' })
  createdAt: Date;
}

// 유사 케이스 통계 응답
export class SimilarCaseStatsResponseDto {
  @ApiProperty({ description: '총 유사 케이스 수' })
  totalCases: number;

  @ApiProperty({ description: '평균 치료 기간 (일)' })
  avgDuration: number;

  @ApiProperty({ description: '평균 호전율 (%)' })
  avgImprovementRate: number;

  @ApiProperty({ description: '주요 처방 목록' })
  topFormulas: Array<{
    name: string;
    count: number;
    successRate: number;
  }>;

  @ApiProperty({ description: '결과 분포' })
  outcomeDistribution: {
    cured: number;
    improved: number;
    noChange: number;
    worsened: number;
  };
}
