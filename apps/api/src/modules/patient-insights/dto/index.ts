import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';

// 증상 요약 요청 DTO
export class GetSymptomSummaryDto {
  @ApiProperty({ description: '환자 ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// 진료 전 분석 요청 DTO
export class PreVisitAnalysisDto {
  @ApiProperty({ description: '환자 ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: '예약 ID' })
  @IsOptional()
  @IsUUID()
  reservationId?: string;
}

// 복약 순응도 요청 DTO
export class AdherenceReportDto {
  @ApiProperty({ description: '환자 ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: '처방 ID' })
  @IsOptional()
  @IsUUID()
  prescriptionId?: string;
}

// 증상 트렌드 응답
export class SymptomTrendDto {
  @ApiProperty({ description: '증상명' })
  name: string;

  @ApiProperty({ description: '현재 심각도 (1-10)' })
  currentSeverity: number;

  @ApiProperty({ description: '이전 심각도 (1-10)' })
  previousSeverity: number;

  @ApiProperty({ description: '변화율 (%)' })
  changeRate: number;

  @ApiProperty({ description: '트렌드 방향' })
  trend: 'improving' | 'stable' | 'worsening';

  @ApiProperty({ description: '일별 데이터' })
  dailyData: Array<{ date: string; severity: number }>;
}

// 증상 요약 응답
export class SymptomSummaryResponseDto {
  @ApiProperty({ description: '환자 ID' })
  patientId: string;

  @ApiProperty({ description: '분석 기간' })
  period: { start: string; end: string };

  @ApiProperty({ description: '총 기록 수' })
  totalEntries: number;

  @ApiProperty({ type: [SymptomTrendDto], description: '증상 트렌드' })
  symptomTrends: SymptomTrendDto[];

  @ApiProperty({ description: '전반적 상태' })
  overallStatus: 'improving' | 'stable' | 'worsening';

  @ApiProperty({ description: '주요 인사이트' })
  insights: string[];
}

// 진료 전 분석 응답
export class PreVisitAnalysisResponseDto {
  @ApiProperty({ description: '환자 ID' })
  patientId: string;

  @ApiProperty({ description: '마지막 진료일' })
  lastVisitDate: string | null;

  @ApiProperty({ description: '진료 후 경과 일수' })
  daysSinceLastVisit: number | null;

  @ApiProperty({ description: '최근 증상 요약' })
  recentSymptomSummary: {
    topSymptoms: Array<{ name: string; avgSeverity: number; frequency: number }>;
    newSymptoms: string[];
    resolvedSymptoms: string[];
  };

  @ApiProperty({ description: '복약 순응도 (%)' })
  adherenceRate: number;

  @ApiProperty({ description: '건강 점수 변화' })
  healthScoreChange: {
    current: number;
    previous: number;
    change: number;
  } | null;

  @ApiProperty({ description: 'AI 사전 분석' })
  aiAnalysis: {
    summary: string;
    focusAreas: string[];
    suggestedQuestions: string[];
  };
}

// 복약 순응도 응답
export class AdherenceReportResponseDto {
  @ApiProperty({ description: '환자 ID' })
  patientId: string;

  @ApiProperty({ description: '처방 ID' })
  prescriptionId: string | null;

  @ApiProperty({ description: '순응도 (%)' })
  adherenceRate: number;

  @ApiProperty({ description: '복약 기록' })
  medicationLog: {
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    skipReasons: Array<{ reason: string; count: number }>;
  };

  @ApiProperty({ description: '복약 패턴' })
  pattern: {
    bestTime: string;
    worstTime: string;
    weekdayVsWeekend: {
      weekdayRate: number;
      weekendRate: number;
    };
  };

  @ApiProperty({ description: '개선 제안' })
  suggestions: string[];
}

// 알림 응답
export class PatientAlertDto {
  @ApiProperty({ description: '알림 ID' })
  id: string;

  @ApiProperty({ description: '환자 ID' })
  patientId: string;

  @ApiProperty({ description: '환자명' })
  patientName: string;

  @ApiProperty({ description: '알림 타입' })
  type: 'symptom_worsening' | 'low_adherence' | 'missed_appointment' | 'health_score_drop';

  @ApiProperty({ description: '심각도' })
  severity: 'low' | 'medium' | 'high';

  @ApiProperty({ description: '메시지' })
  message: string;

  @ApiProperty({ description: '생성일' })
  createdAt: string;
}
