import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { getMyPrescriptions, Prescription } from '../../src/services/prescriptionService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type StatusFilter = 'all' | 'active' | 'completed';

// 복용 진행률 원형 차트
function ProgressCircle({
  progress,
  size = 48,
  strokeWidth = 4,
  daysRemaining,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  daysRemaining: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getColor = () => {
    if (daysRemaining <= 2) return '#EF4444'; // 빨강 - 곧 종료
    if (daysRemaining <= 5) return '#F59E0B'; // 주황 - 주의
    return '#10B981'; // 초록 - 정상
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* 배경 원 */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* 진행 원 */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={[styles.progressCircleText, { width: size, height: size }]}>
        <Text style={[styles.progressPercent, { color: getColor() }]}>
          {Math.round(progress)}%
        </Text>
      </View>
    </View>
  );
}

// 약재 역할에 따른 색상
const getPurposeColor = (purpose: string) => {
  if (purpose?.includes('군') || purpose === '君') return '#EF4444';
  if (purpose?.includes('신') || purpose === '臣') return '#F59E0B';
  if (purpose?.includes('좌') || purpose === '佐') return '#10B981';
  if (purpose?.includes('사') || purpose === '使') return '#6366F1';
  return '#9CA3AF';
};

export default function PrescriptionsScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const {
    data: prescriptionsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['myPrescriptions', statusFilter, page],
    queryFn: () =>
      getMyPrescriptions({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 20,
      }),
  });

  const prescriptions = prescriptionsData?.data || [];

  // 통계 계산
  const stats = useMemo(() => {
    const all = prescriptionsData?.data || [];
    const active = all.filter(p => p.status === 'active');
    const completed = all.filter(p => p.status === 'completed');
    const totalHerbs = all.reduce((sum, p) => sum + (p.herbs?.length || 0), 0);
    const avgDuration = all.length > 0
      ? Math.round(all.reduce((sum, p) => sum + p.duration, 0) / all.length)
      : 0;

    return {
      total: prescriptionsData?.meta?.total || 0,
      active: active.length,
      completed: completed.length,
      totalHerbs,
      avgDuration,
    };
  }, [prescriptionsData]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          bg: '#D1FAE5',
          text: '#065F46',
          label: '복용중',
          icon: 'medical',
        };
      case 'completed':
        return {
          bg: '#E5E7EB',
          text: '#374151',
          label: '완료',
          icon: 'checkmark-circle',
        };
      case 'cancelled':
        return {
          bg: '#FEE2E2',
          text: '#991B1B',
          label: '취소',
          icon: 'close-circle',
        };
      default:
        return {
          bg: '#E5E7EB',
          text: '#374151',
          label: status,
          icon: 'help-circle',
        };
    }
  };

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();

    if (now < start) return 0;
    if (now > end) return 100;

    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    return Math.max(0, days);
  };

  const getDaysRemainingText = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return '종료됨';
    if (days === 0) return '오늘 종료';
    if (days === 1) return '내일 종료';
    return `${days}일 남음`;
  };

  const renderPrescriptionItem = ({ item }: { item: Prescription }) => {
    const statusConfig = getStatusConfig(item.status);
    const formulaName = item.formulaName || item.customFormulaName || '처방';
    const isActive = item.status === 'active';
    const progress = calculateProgress(item.startDate, item.endDate);
    const daysRemaining = getDaysRemaining(item.endDate);
    const hasWarning = item.drugInteractions && item.drugInteractions.length > 0;
    const hasCriticalWarning = item.drugInteractions?.some(i => i.severity === 'critical');

    return (
      <TouchableOpacity
        style={[
          styles.prescriptionCard,
          isActive && styles.prescriptionCardActive,
          hasCriticalWarning && styles.prescriptionCardWarning,
        ]}
        onPress={() => router.push(`/prescription/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* 상단 헤더 */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {isActive && (
              <ProgressCircle
                progress={progress}
                daysRemaining={daysRemaining}
              />
            )}
            {!isActive && (
              <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.bg }]}>
                <Ionicons name={statusConfig.icon as any} size={24} color={statusConfig.text} />
              </View>
            )}
            <View style={styles.cardTitleContainer}>
              <Text style={styles.formulaName} numberOfLines={1}>{formulaName}</Text>
              <View style={styles.clinicRow}>
                <Ionicons name="business-outline" size={12} color="#6B7280" />
                <Text style={styles.clinicName}>{item.clinic?.name || '한의원'}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* 복용 기간 */}
        <View style={styles.periodSection}>
          <View style={styles.periodDates}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>시작일</Text>
              <Text style={styles.dateValue}>
                {format(new Date(item.startDate), 'M월 d일', { locale: ko })}
              </Text>
            </View>
            <View style={styles.periodArrow}>
              <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
              <Text style={styles.durationText}>{item.duration}일</Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>종료일</Text>
              <Text style={styles.dateValue}>
                {format(new Date(item.endDate), 'M월 d일', { locale: ko })}
              </Text>
            </View>
          </View>

          {/* 활성 처방: 남은 기간 표시 */}
          {isActive && (
            <View style={[
              styles.remainingBadge,
              daysRemaining <= 2 && styles.remainingBadgeUrgent,
              daysRemaining <= 5 && daysRemaining > 2 && styles.remainingBadgeWarning,
            ]}>
              <Ionicons
                name="time-outline"
                size={14}
                color={daysRemaining <= 2 ? '#991B1B' : daysRemaining <= 5 ? '#92400E' : '#065F46'}
              />
              <Text style={[
                styles.remainingText,
                daysRemaining <= 2 && styles.remainingTextUrgent,
                daysRemaining <= 5 && daysRemaining > 2 && styles.remainingTextWarning,
              ]}>
                {getDaysRemainingText(item.endDate)}
              </Text>
            </View>
          )}
        </View>

        {/* 약재 구성 미리보기 */}
        <View style={styles.herbsSection}>
          <View style={styles.herbsSectionHeader}>
            <Ionicons name="leaf" size={14} color="#10B981" />
            <Text style={styles.herbsSectionTitle}>
              구성 약재 {item.herbs.length}종
            </Text>
          </View>
          <View style={styles.herbsPreview}>
            {item.herbs.slice(0, 6).map((herb, idx) => (
              <View
                key={idx}
                style={[
                  styles.herbChip,
                  { borderLeftColor: getPurposeColor(herb.purpose) }
                ]}
              >
                <Text style={styles.herbChipText}>{herb.name}</Text>
              </View>
            ))}
            {item.herbs.length > 6 && (
              <View style={styles.herbChipMore}>
                <Text style={styles.herbChipMoreText}>+{item.herbs.length - 6}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 상호작용 경고 */}
        {hasWarning && (
          <View style={[
            styles.warningSection,
            hasCriticalWarning && styles.warningSectionCritical,
          ]}>
            <Ionicons
              name="warning"
              size={16}
              color={hasCriticalWarning ? '#991B1B' : '#92400E'}
            />
            <Text style={[
              styles.warningText,
              hasCriticalWarning && styles.warningTextCritical,
            ]}>
              {hasCriticalWarning ? '주의가 필요한' : ''}
              약물 상호작용 {item.drugInteractions!.length}건
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={hasCriticalWarning ? '#991B1B' : '#92400E'}
            />
          </View>
        )}

        {/* 복용법 & 상세보기 */}
        <View style={styles.cardFooter}>
          <View style={styles.dosageInfo}>
            <Ionicons name="time" size={14} color="#6B7280" />
            <Text style={styles.dosageText} numberOfLines={1}>
              {item.dosageInstructions || '복용법 정보 없음'}
            </Text>
          </View>
          <View style={styles.viewDetailButton}>
            <Text style={styles.viewDetailText}>상세보기</Text>
            <Ionicons name="chevron-forward" size={16} color="#10B981" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* 타이틀 */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>처방 관리</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => refetch()}
        >
          <Ionicons name="refresh" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* 통계 카드 */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="medical" size={24} color="#10B981" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>복용중</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E5E7EB' }]}>
              <Ionicons name="checkmark-done" size={24} color="#6B7280" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>완료</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="leaf" size={24} color="#3B82F6" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.totalHerbs}</Text>
              <Text style={styles.statLabel}>총 약재</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 필터 탭 */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>처방 목록</Text>
        <View style={styles.filterTabs}>
          {([
            { key: 'all', label: '전체', count: stats.total },
            { key: 'active', label: '복용중', count: stats.active },
            { key: 'completed', label: '완료', count: stats.completed },
          ] as const).map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                statusFilter === filter.key && styles.filterTabActive,
              ]}
              onPress={() => {
                setStatusFilter(filter.key);
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.filterTabText,
                  statusFilter === filter.key && styles.filterTabTextActive,
                ]}
              >
                {filter.label}
              </Text>
              {filter.count > 0 && (
                <View style={[
                  styles.filterCount,
                  statusFilter === filter.key && styles.filterCountActive,
                ]}>
                  <Text style={[
                    styles.filterCountText,
                    statusFilter === filter.key && styles.filterCountTextActive,
                  ]}>
                    {filter.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>처방 기록이 없습니다</Text>
      <Text style={styles.emptyText}>
        한의원에서 처방을 받으시면{'\n'}여기에서 관리할 수 있습니다
      </Text>
      <TouchableOpacity
        style={styles.findClinicButton}
        onPress={() => router.push('/(tabs)/clinics')}
      >
        <Ionicons name="search" size={18} color="#FFFFFF" />
        <Text style={styles.findClinicButtonText}>한의원 찾기</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item.id}
        renderItem={renderPrescriptionItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              setPage(1);
              refetch();
            }}
            tintColor="#10B981"
          />
        }
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loaderText}>처방 정보를 불러오는 중...</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardPrimary: {
    backgroundColor: '#D1FAE5',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  filterSection: {
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#10B981',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterCount: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  prescriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  prescriptionCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  prescriptionCardWarning: {
    borderLeftColor: '#EF4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  progressCircleText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContainer: {
    flex: 1,
  },
  formulaName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clinicName: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  periodSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  periodDates: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateItem: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  periodArrow: {
    alignItems: 'center',
    gap: 2,
  },
  durationText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  remainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  remainingBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  remainingBadgeUrgent: {
    backgroundColor: '#FEE2E2',
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  remainingTextWarning: {
    color: '#92400E',
  },
  remainingTextUrgent: {
    color: '#991B1B',
  },
  herbsSection: {
    marginBottom: 12,
  },
  herbsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  herbsSectionTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  herbsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  herbChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  herbChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  herbChipMore: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  herbChipMoreText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  warningSectionCritical: {
    backgroundColor: '#FEE2E2',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  warningTextCritical: {
    color: '#991B1B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dosageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  dosageText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  findClinicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  findClinicButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
