// 대시보드 통계 응답
export class DashboardStatsDto {
  // 사용자 통계
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;

  // 구독 통계
  activeSubscribers: number;
  subscriptionsByTier: {
    free: number;
    basic: number;
    professional: number;
    clinic: number;
  };

  // 매출 통계
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowthRate: number; // 퍼센트

  // AI 사용량 통계
  totalAiQueries: number;
  aiQueriesThisMonth: number;

  // 환자 통계
  totalPatients: number;
  newPatientsThisMonth: number;

  // 한의원 통계
  totalClinics: number;
  verifiedClinics: number;
  pendingVerification: number;
}

// 최근 활동 로그
export class RecentActivityDto {
  id: string;
  adminName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  description: string;
  createdAt: Date;
}

// 일별 가입자 추이
export class DailySignupsDto {
  date: string; // YYYY-MM-DD
  count: number;
}

// 대시보드 전체 응답
export class DashboardResponseDto {
  stats: DashboardStatsDto;
  recentActivities: RecentActivityDto[];
  dailySignups: DailySignupsDto[];
}
