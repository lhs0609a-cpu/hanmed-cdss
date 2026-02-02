import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
} from 'class-validator';

export enum PeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// 통계 조회 요청 DTO
export class GetStatisticsDto {
  @ApiProperty({ enum: PeriodType, description: '기간 타입' })
  @IsEnum(PeriodType)
  period: PeriodType;

  @ApiProperty({ description: '시작 날짜 (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '종료 날짜 (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;
}

// 세금 리포트 요청 DTO
export class TaxReportDto {
  @ApiProperty({ description: '년도' })
  @IsNumber()
  year: number;
}

// 대시보드 데이터 응답
export class DashboardDataDto {
  @ApiProperty({ description: '오늘 통계' })
  today: {
    consultations: number;
    newPatients: number;
    prescriptions: number;
  };

  @ApiProperty({ description: '이번 주 통계' })
  thisWeek: {
    consultations: number;
    newPatients: number;
    prescriptions: number;
    aiUsage: number;
  };

  @ApiProperty({ description: '이번 달 통계' })
  thisMonth: {
    consultations: number;
    newPatients: number;
    returningPatients: number;
    avgImprovementRate: number;
    aiAcceptanceRate: number;
  };

  @ApiProperty({ description: 'KPI' })
  kpis: {
    totalPatients: { value: number; change: number };
    returnRate: { value: number; change: number };
    avgImprovement: { value: number; change: number };
    aiUsageRate: { value: number; change: number };
  };

  @ApiProperty({ description: '최근 활동' })
  recentActivity: Array<{
    date: string;
    consultations: number;
    prescriptions: number;
  }>;
}

// 벤치마크 데이터 응답
export class BenchmarkDataDto {
  @ApiProperty({ description: '나의 성과' })
  myMetrics: {
    avgConsultationsPerDay: number;
    returnRate: number;
    avgImprovementRate: number;
    aiAcceptanceRate: number;
  };

  @ApiProperty({ description: '전국 평균' })
  nationalAverage: {
    avgConsultationsPerDay: number;
    returnRate: number;
    avgImprovementRate: number;
    aiAcceptanceRate: number;
  };

  @ApiProperty({ description: '백분위' })
  percentile: number;

  @ApiProperty({ description: '강점' })
  strengths: string[];

  @ApiProperty({ description: '개선 영역' })
  areasForImprovement: string[];
}

// 처방 패턴 분석 응답
export class PrescriptionPatternDto {
  @ApiProperty({ description: 'TOP 10 처방' })
  topFormulas: Array<{
    rank: number;
    name: string;
    count: number;
    percentage: number;
    avgSuccessRate: number;
  }>;

  @ApiProperty({ description: 'TOP 10 증상' })
  topSymptoms: Array<{
    rank: number;
    name: string;
    count: number;
    percentage: number;
    topFormula: string;
  }>;

  @ApiProperty({ description: '체질별 분포' })
  constitutionDistribution: Array<{
    constitution: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: '월별 추이' })
  monthlyTrend: Array<{
    month: string;
    consultations: number;
    prescriptions: number;
    newPatients: number;
  }>;
}

// 통계 응답
export class StatisticsResponseDto {
  @ApiProperty({ description: '기간' })
  period: {
    start: string;
    end: string;
    type: string;
  };

  @ApiProperty({ description: '메트릭' })
  metrics: {
    totalPatients: number;
    newPatients: number;
    returningPatients: number;
    returnRate: number;
    totalConsultations: number;
    avgConsultationTime: number;
    totalPrescriptions: number;
    topFormulas: Array<{ name: string; count: number }>;
    topSymptoms: Array<{ name: string; count: number }>;
    avgImprovementRate: number;
    patientSatisfaction: number;
    aiRecommendationsUsed: number;
    aiAcceptanceRate: number;
  };

  @ApiProperty({ description: '벤치마크', nullable: true })
  benchmark: {
    nationalAvg: Record<string, number>;
    percentile: number;
  } | null;
}
