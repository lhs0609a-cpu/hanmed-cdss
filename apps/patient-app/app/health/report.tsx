import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getHealthReport } from '../../src/services/healthService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PeriodType = 'week' | 'month' | '3months';

interface HealthReportData {
  period: { startDate: string; endDate: string };
  totalDays: number;
  recordedDays: number;
  averages: {
    condition: number | null;
    sleep: number | null;
    energy: number | null;
    stress: number | null;
  } | null;
  medicationAdherence: {
    rate: number;
    takenDays: number;
    totalDays: number;
  };
  symptomsSummary: Array<{ name: string; count: number }>;
  trends: Array<{
    date: string;
    condition: number | null;
    energy: number | null;
    sleep: number | null;
    stress: number | null;
  }>;
}

export default function HealthReportScreen() {
  const [period, setPeriod] = useState<PeriodType>('week');

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    let start: Date;

    switch (period) {
      case 'week':
        start = startOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'month':
        start = subMonths(today, 1);
        break;
      case '3months':
        start = subMonths(today, 3);
        break;
      default:
        start = subWeeks(today, 1);
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd'),
    };
  }, [period]);

  const { data: report, isLoading, error } = useQuery<HealthReportData>({
    queryKey: ['healthReport', startDate, endDate],
    queryFn: () => getHealthReport(startDate, endDate),
  });

  const periodLabels: Record<PeriodType, string> = {
    week: '이번 주',
    month: '최근 1개월',
    '3months': '최근 3개월',
  };

  const renderScoreBar = (value: number | null, max: number = 10, color: string) => {
    if (value === null) return null;
    const percentage = (value / max) * 100;

    return (
      <View style={styles.scoreBarContainer}>
        <View style={styles.scoreBarBg}>
          <View
            style={[
              styles.scoreBarFill,
              { width: `${percentage}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={styles.scoreValue}>{value.toFixed(1)}</Text>
      </View>
    );
  };

  const renderTrendChart = () => {
    if (!report?.trends || report.trends.length === 0) return null;

    const maxValue = 10;
    const chartHeight = 120;
    const chartWidth = SCREEN_WIDTH - 64;
    const pointWidth = chartWidth / Math.max(report.trends.length - 1, 1);

    const getY = (value: number | null) => {
      if (value === null) return null;
      return chartHeight - (value / maxValue) * chartHeight;
    };

    const renderLine = (
      data: Array<{ value: number | null }>,
      color: string,
    ) => {
      const points = data
        .map((d, i) => {
          const y = getY(d.value);
          if (y === null) return null;
          return { x: i * pointWidth, y };
        })
        .filter((p) => p !== null);

      if (points.length < 2) return null;

      return (
        <View style={StyleSheet.absoluteFill}>
          {points.map((point, index) => (
            <View
              key={index}
              style={[
                styles.chartPoint,
                {
                  left: point!.x - 4,
                  top: point!.y - 4,
                  backgroundColor: color,
                },
              ]}
            />
          ))}
        </View>
      );
    };

    return (
      <View style={styles.chartContainer}>
        <View style={[styles.chart, { height: chartHeight }]}>
          {/* Y축 라벨 */}
          <View style={styles.yAxisLabels}>
            <Text style={styles.axisLabel}>10</Text>
            <Text style={styles.axisLabel}>5</Text>
            <Text style={styles.axisLabel}>0</Text>
          </View>

          {/* 차트 영역 */}
          <View style={styles.chartArea}>
            {/* 그리드 라인 */}
            <View style={[styles.gridLine, { top: 0 }]} />
            <View style={[styles.gridLine, { top: chartHeight / 2 }]} />
            <View style={[styles.gridLine, { top: chartHeight }]} />

            {/* 컨디션 라인 */}
            {renderLine(
              report.trends.map((t) => ({ value: t.condition })),
              '#10B981',
            )}

            {/* 에너지 라인 */}
            {renderLine(
              report.trends.map((t) => ({ value: t.energy })),
              '#3B82F6',
            )}
          </View>
        </View>

        {/* X축 라벨 */}
        <View style={styles.xAxisLabels}>
          {report.trends.length > 0 && (
            <>
              <Text style={styles.axisLabel}>
                {format(new Date(report.trends[0].date), 'M/d')}
              </Text>
              {report.trends.length > 1 && (
                <Text style={styles.axisLabel}>
                  {format(
                    new Date(report.trends[report.trends.length - 1].date),
                    'M/d',
                  )}
                </Text>
              )}
            </>
          )}
        </View>

        {/* 범례 */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>컨디션</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>에너지</Text>
          </View>
        </View>
      </View>
    );
  };

  const getConditionEmoji = (value: number | null): string => {
    if (value === null) return '❓';
    if (value >= 8) return '😊';
    if (value >= 6) return '🙂';
    if (value >= 4) return '😐';
    if (value >= 2) return '😕';
    return '😢';
  };

  const getAdherenceColor = (rate: number): string => {
    if (rate >= 80) return '#10B981';
    if (rate >= 60) return '#F59E0B';
    return '#EF4444';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>리포트 생성 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>건강 리포트</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>리포트를 불러올 수 없습니다</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>건강 리포트</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 기간 선택 */}
        <View style={styles.periodSelector}>
          {(['week', 'month', '3months'] as PeriodType[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === p && styles.periodButtonTextActive,
                ]}
              >
                {periodLabels[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 기간 정보 */}
        <View style={styles.periodInfo}>
          <Text style={styles.periodDates}>
            {format(new Date(startDate), 'yyyy년 M월 d일', { locale: ko })} ~{' '}
            {format(new Date(endDate), 'M월 d일', { locale: ko })}
          </Text>
          <Text style={styles.recordedDays}>
            {report?.recordedDays || 0}일 / {report?.totalDays || 0}일 기록
          </Text>
        </View>

        {report?.recordedDays === 0 ? (
          <View style={styles.noDataContainer}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.noDataTitle}>기록된 데이터가 없습니다</Text>
            <Text style={styles.noDataDescription}>
              건강 일지를 작성하면{'\n'}리포트를 확인할 수 있습니다
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/health/journal')}
            >
              <Text style={styles.startButtonText}>건강 일지 작성하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 전반적인 상태 요약 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>전반적인 상태</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryMain}>
                  <Text style={styles.summaryEmoji}>
                    {getConditionEmoji(report?.averages?.condition || null)}
                  </Text>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryLabel}>평균 컨디션</Text>
                    <Text style={styles.summaryValue}>
                      {report?.averages?.condition?.toFixed(1) || '-'} / 10
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 상세 지표 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>상세 지표</Text>
              <View style={styles.metricsCard}>
                <View style={styles.metricRow}>
                  <View style={styles.metricLabel}>
                    <Ionicons name="heart" size={18} color="#10B981" />
                    <Text style={styles.metricName}>컨디션</Text>
                  </View>
                  {renderScoreBar(report?.averages?.condition || null, 10, '#10B981')}
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricLabel}>
                    <Ionicons name="flash" size={18} color="#3B82F6" />
                    <Text style={styles.metricName}>에너지</Text>
                  </View>
                  {renderScoreBar(report?.averages?.energy || null, 10, '#3B82F6')}
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricLabel}>
                    <Ionicons name="moon" size={18} color="#8B5CF6" />
                    <Text style={styles.metricName}>수면</Text>
                  </View>
                  {report?.averages?.sleep ? (
                    <View style={styles.sleepValue}>
                      <Text style={styles.sleepHours}>
                        {report.averages.sleep.toFixed(1)}
                      </Text>
                      <Text style={styles.sleepUnit}>시간</Text>
                    </View>
                  ) : (
                    <Text style={styles.noValue}>-</Text>
                  )}
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricLabel}>
                    <Ionicons name="pulse" size={18} color="#F59E0B" />
                    <Text style={styles.metricName}>스트레스</Text>
                  </View>
                  {renderScoreBar(report?.averages?.stress || null, 10, '#F59E0B')}
                </View>
              </View>
            </View>

            {/* 트렌드 차트 */}
            {report?.trends && report.trends.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>변화 추이</Text>
                <View style={styles.chartCard}>{renderTrendChart()}</View>
              </View>
            )}

            {/* 복약 준수율 */}
            {report?.medicationAdherence && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>복약 준수율</Text>
                <View style={styles.adherenceCard}>
                  <View style={styles.adherenceMain}>
                    <View
                      style={[
                        styles.adherenceCircle,
                        {
                          borderColor: getAdherenceColor(
                            report.medicationAdherence.rate,
                          ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.adherenceRate,
                          {
                            color: getAdherenceColor(
                              report.medicationAdherence.rate,
                            ),
                          },
                        ]}
                      >
                        {report.medicationAdherence.rate}%
                      </Text>
                    </View>
                    <View style={styles.adherenceInfo}>
                      <Text style={styles.adherenceLabel}>
                        {report.medicationAdherence.takenDays}일 /{' '}
                        {report.medicationAdherence.totalDays}일 복용
                      </Text>
                      <Text style={styles.adherenceDesc}>
                        {report.medicationAdherence.rate >= 80
                          ? '훌륭해요! 꾸준히 복용하고 계시네요.'
                          : report.medicationAdherence.rate >= 60
                          ? '조금만 더 신경써주세요!'
                          : '복약 알림을 설정해보세요.'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 주요 증상 */}
            {report?.symptomsSummary && report.symptomsSummary.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>주요 증상</Text>
                <View style={styles.symptomsCard}>
                  {report.symptomsSummary.slice(0, 5).map((symptom, index) => (
                    <View key={index} style={styles.symptomRow}>
                      <View style={styles.symptomRank}>
                        <Text style={styles.symptomRankText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.symptomName}>{symptom.name}</Text>
                      <View style={styles.symptomCount}>
                        <Text style={styles.symptomCountText}>
                          {symptom.count}회
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 건강 팁 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>건강 관리 팁</Text>
              <View style={styles.tipsCard}>
                {report?.averages?.sleep && report.averages.sleep < 7 && (
                  <View style={styles.tipRow}>
                    <Ionicons name="moon" size={20} color="#8B5CF6" />
                    <Text style={styles.tipText}>
                      수면 시간이 부족해요. 7-8시간 수면을 목표로 해보세요.
                    </Text>
                  </View>
                )}
                {report?.averages?.energy && report.averages.energy < 5 && (
                  <View style={styles.tipRow}>
                    <Ionicons name="flash" size={20} color="#3B82F6" />
                    <Text style={styles.tipText}>
                      에너지가 낮아요. 가벼운 운동과 규칙적인 식사가 도움됩니다.
                    </Text>
                  </View>
                )}
                {report?.averages?.stress && report.averages.stress > 6 && (
                  <View style={styles.tipRow}>
                    <Ionicons name="leaf" size={20} color="#10B981" />
                    <Text style={styles.tipText}>
                      스트레스가 높아요. 명상이나 산책으로 마음의 여유를 가져보세요.
                    </Text>
                  </View>
                )}
                {report?.medicationAdherence &&
                  report.medicationAdherence.rate < 80 && (
                    <View style={styles.tipRow}>
                      <Ionicons name="medical" size={20} color="#EF4444" />
                      <Text style={styles.tipText}>
                        복약 알림을 설정하면 꾸준한 복용에 도움이 됩니다.
                      </Text>
                    </View>
                  )}
                {(!report?.averages ||
                  (report.averages.condition === null &&
                    report.averages.energy === null)) && (
                  <View style={styles.tipRow}>
                    <Ionicons name="document-text" size={20} color="#6B7280" />
                    <Text style={styles.tipText}>
                      매일 건강 일지를 작성하면 더 정확한 분석이 가능해요.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  periodInfo: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  periodDates: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  recordedDays: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  noDataDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  startButton: {
    marginTop: 24,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryEmoji: {
    fontSize: 48,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  metricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 90,
  },
  metricName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  scoreBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    width: 32,
    textAlign: 'right',
  },
  sleepValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  sleepHours: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  sleepUnit: {
    fontSize: 14,
    color: '#6B7280',
  },
  noValue: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  chartContainer: {},
  chart: {
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 24,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  chartPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 24,
  },
  axisLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  adherenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  adherenceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  adherenceCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  adherenceRate: {
    fontSize: 22,
    fontWeight: '700',
  },
  adherenceInfo: {
    flex: 1,
  },
  adherenceLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  adherenceDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  symptomsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  symptomRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symptomRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  symptomName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  symptomCount: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  symptomCountText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  footer: {
    height: 32,
  },
});
