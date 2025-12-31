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
import { format, differenceInDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { getMyRecords, HealthRecord } from '../../src/services/recordService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PeriodFilter = 'all' | 'month' | '3months' | '6months' | 'year';

// 미니 인체 아이콘 (증상 부위 표시)
function MiniBodyIcon({ affectedAreas = [] }: { affectedAreas?: string[] }) {
  const getAreaColor = (area: string) => {
    if (affectedAreas.some(a => a.toLowerCase().includes(area))) {
      return '#EF4444';
    }
    return '#E5E7EB';
  };

  return (
    <Svg width={32} height={40} viewBox="0 0 32 40">
      {/* 머리 */}
      <Circle cx={16} cy={6} r={5} fill={getAreaColor('머리')} />
      {/* 몸통 */}
      <Path
        d="M10 12 L22 12 L24 28 L8 28 Z"
        fill={getAreaColor('몸통')}
      />
      {/* 팔 */}
      <Path d="M10 12 L4 22 L6 23 L11 14" fill={getAreaColor('팔')} />
      <Path d="M22 12 L28 22 L26 23 L21 14" fill={getAreaColor('팔')} />
      {/* 다리 */}
      <Path d="M10 28 L8 38 L12 38 L14 28" fill={getAreaColor('다리')} />
      <Path d="M22 28 L24 38 L20 38 L18 28" fill={getAreaColor('다리')} />
    </Svg>
  );
}

// 증상에서 영향받는 부위 추출
function extractAffectedAreas(record: HealthRecord): string[] {
  const areas: string[] = [];
  const chiefComplaint = record.chiefComplaint?.toLowerCase() || '';
  const diagnosis = record.diagnosis?.toLowerCase() || '';
  const combined = `${chiefComplaint} ${diagnosis}`;

  const areaKeywords: Record<string, string[]> = {
    '머리': ['두통', '머리', '편두통', '어지러움', '두부'],
    '목': ['목', '경추', '인후', '목통증'],
    '어깨': ['어깨', '견비통', '오십견'],
    '팔': ['팔', '손목', '팔꿈치', '손'],
    '몸통': ['허리', '요통', '복통', '소화', '위장', '간', '폐', '가슴', '등'],
    '다리': ['다리', '무릎', '발목', '발', '하지'],
  };

  Object.entries(areaKeywords).forEach(([area, keywords]) => {
    if (keywords.some(keyword => combined.includes(keyword))) {
      areas.push(area);
    }
  });

  return areas;
}

// 증상 심각도 분석
function analyzeSeverity(record: HealthRecord): 'high' | 'medium' | 'low' {
  const symptoms = record.symptoms || [];
  if (symptoms.length === 0) return 'low';

  const avgSeverity = symptoms.reduce((sum, s) => sum + (s.severity || 5), 0) / symptoms.length;
  if (avgSeverity >= 7) return 'high';
  if (avgSeverity >= 4) return 'medium';
  return 'low';
}

export default function RecordsScreen() {
  const [page, setPage] = useState(1);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');

  const {
    data: recordsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['myRecords', page],
    queryFn: () => getMyRecords({ page, limit: 50 }),
  });

  // 필터링된 기록
  const filteredRecords = useMemo(() => {
    const allRecords = recordsData?.data || [];
    if (periodFilter === 'all') return allRecords;

    const now = new Date();
    let startDate: Date;

    switch (periodFilter) {
      case 'month':
        startDate = startOfMonth(now);
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return allRecords;
    }

    return allRecords.filter(record =>
      new Date(record.visitDate) >= startDate
    );
  }, [recordsData, periodFilter]);

  // 통계 계산
  const stats = useMemo(() => {
    const records = filteredRecords;
    const total = records.length;
    const withAI = records.filter(r => r.aiHealthInsights).length;
    const uniqueClinics = new Set(records.map(r => r.clinic?.id).filter(Boolean)).size;

    // 가장 많이 방문한 한의원
    const clinicVisits: Record<string, { name: string; count: number }> = {};
    records.forEach(r => {
      if (r.clinic?.id) {
        if (!clinicVisits[r.clinic.id]) {
          clinicVisits[r.clinic.id] = { name: r.clinic.name || '한의원', count: 0 };
        }
        clinicVisits[r.clinic.id].count++;
      }
    });
    const topClinic = Object.values(clinicVisits).sort((a, b) => b.count - a.count)[0];

    // 최근 방문
    const lastVisit = records.length > 0
      ? differenceInDays(new Date(), new Date(records[0].visitDate))
      : null;

    return {
      total,
      withAI,
      uniqueClinics,
      topClinic,
      lastVisit,
    };
  }, [filteredRecords]);

  const hasMore = recordsData?.meta && page < recordsData.meta.totalPages;

  const getSeverityConfig = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return { color: '#EF4444', bg: '#FEE2E2', label: '주의 필요' };
      case 'medium':
        return { color: '#F59E0B', bg: '#FEF3C7', label: '관찰 필요' };
      case 'low':
        return { color: '#10B981', bg: '#D1FAE5', label: '양호' };
    }
  };

  const renderRecordItem = ({ item, index }: { item: HealthRecord; index: number }) => {
    const affectedAreas = extractAffectedAreas(item);
    const severity = analyzeSeverity(item);
    const severityConfig = getSeverityConfig(severity);
    const hasAI = !!item.aiHealthInsights;
    const visitDate = new Date(item.visitDate);

    // 이전 기록과 날짜 비교 (월 구분)
    const prevRecord = index > 0 ? filteredRecords[index - 1] : null;
    const showMonthHeader = !prevRecord ||
      format(visitDate, 'yyyy-MM') !== format(new Date(prevRecord.visitDate), 'yyyy-MM');

    return (
      <>
        {/* 월 구분 헤더 */}
        {showMonthHeader && (
          <View style={styles.monthHeader}>
            <View style={styles.monthHeaderLine} />
            <Text style={styles.monthHeaderText}>
              {format(visitDate, 'yyyy년 M월', { locale: ko })}
            </Text>
            <View style={styles.monthHeaderLine} />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.recordCard,
            hasAI && styles.recordCardWithAI,
          ]}
          onPress={() => router.push(`/record/${item.id}`)}
          activeOpacity={0.7}
        >
          {/* 타임라인 인디케이터 */}
          <View style={styles.timelineContainer}>
            <View style={[styles.timelineDot, { backgroundColor: severityConfig.color }]} />
            {index < filteredRecords.length - 1 && <View style={styles.timelineLine} />}
          </View>

          {/* 카드 컨텐츠 */}
          <View style={styles.cardContent}>
            {/* 헤더 */}
            <View style={styles.cardHeader}>
              <View style={styles.dateSection}>
                <Text style={styles.dateDay}>
                  {format(visitDate, 'd', { locale: ko })}
                </Text>
                <View style={styles.dateDetails}>
                  <Text style={styles.dateWeekday}>
                    {format(visitDate, 'EEEE', { locale: ko })}
                  </Text>
                  <Text style={styles.dateTime}>
                    {format(visitDate, 'a h:mm', { locale: ko })}
                  </Text>
                </View>
              </View>

              <View style={styles.headerBadges}>
                {hasAI && (
                  <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                    <Text style={styles.aiBadgeText}>AI</Text>
                  </View>
                )}
                <View style={[styles.severityBadge, { backgroundColor: severityConfig.bg }]}>
                  <Text style={[styles.severityText, { color: severityConfig.color }]}>
                    {severityConfig.label}
                  </Text>
                </View>
              </View>
            </View>

            {/* 한의원 & 담당 */}
            <View style={styles.clinicSection}>
              <View style={styles.clinicInfo}>
                <Ionicons name="business" size={16} color="#10B981" />
                <Text style={styles.clinicName}>{item.clinic?.name || '한의원'}</Text>
              </View>
              <Text style={styles.practitionerName}>
                {item.practitioner?.name || '한의사'}
              </Text>
            </View>

            {/* 주요 증상 */}
            <View style={styles.complaintSection}>
              <View style={styles.complaintRow}>
                {affectedAreas.length > 0 && (
                  <MiniBodyIcon affectedAreas={affectedAreas} />
                )}
                <View style={styles.complaintTextContainer}>
                  <Text style={styles.complaintLabel}>주요 증상</Text>
                  <Text style={styles.complaintText} numberOfLines={2}>
                    {item.chiefComplaint}
                  </Text>
                </View>
              </View>
            </View>

            {/* 진단 */}
            {item.diagnosis && (
              <View style={styles.diagnosisSection}>
                <Ionicons name="clipboard" size={14} color="#6B7280" />
                <Text style={styles.diagnosisText} numberOfLines={1}>
                  {item.diagnosis}
                </Text>
              </View>
            )}

            {/* 증상 태그 */}
            {item.symptoms && item.symptoms.length > 0 && (
              <View style={styles.symptomTags}>
                {item.symptoms.slice(0, 4).map((symptom, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.symptomTag,
                      symptom.severity && symptom.severity >= 7 && styles.symptomTagHigh,
                    ]}
                  >
                    <Text style={[
                      styles.symptomTagText,
                      symptom.severity && symptom.severity >= 7 && styles.symptomTagTextHigh,
                    ]}>
                      {symptom.name}
                    </Text>
                  </View>
                ))}
                {item.symptoms.length > 4 && (
                  <View style={styles.symptomTagMore}>
                    <Text style={styles.symptomTagMoreText}>+{item.symptoms.length - 4}</Text>
                  </View>
                )}
              </View>
            )}

            {/* AI 요약 */}
            {hasAI && item.aiHealthInsights?.summary && (
              <View style={styles.aiSummarySection}>
                <View style={styles.aiSummaryHeader}>
                  <Ionicons name="bulb" size={14} color="#8B5CF6" />
                  <Text style={styles.aiSummaryLabel}>AI 건강 인사이트</Text>
                </View>
                <Text style={styles.aiSummaryText} numberOfLines={2}>
                  {item.aiHealthInsights.summary}
                </Text>
              </View>
            )}

            {/* 푸터 */}
            <View style={styles.cardFooter}>
              <View style={styles.footerInfo}>
                {item.treatment && (
                  <View style={styles.treatmentBadge}>
                    <Ionicons name="medical" size={12} color="#10B981" />
                    <Text style={styles.treatmentText}>치료 기록 있음</Text>
                  </View>
                )}
              </View>
              <View style={styles.viewDetailButton}>
                <Text style={styles.viewDetailText}>상세보기</Text>
                <Ionicons name="chevron-forward" size={16} color="#10B981" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* 타이틀 */}
      <View style={styles.titleSection}>
        <View>
          <Text style={styles.title}>진료 기록</Text>
          <Text style={styles.subtitle}>나의 건강 히스토리</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => refetch()}
        >
          <Ionicons name="refresh" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* 통계 카드 */}
      <View style={styles.statsContainer}>
        <View style={styles.mainStatCard}>
          <View style={styles.mainStatIcon}>
            <Ionicons name="document-text" size={28} color="#10B981" />
          </View>
          <View style={styles.mainStatInfo}>
            <Text style={styles.mainStatValue}>{stats.total}</Text>
            <Text style={styles.mainStatLabel}>총 진료 기록</Text>
          </View>
          {stats.lastVisit !== null && (
            <View style={styles.lastVisitBadge}>
              <Text style={styles.lastVisitText}>
                {stats.lastVisit === 0 ? '오늘' : `${stats.lastVisit}일 전`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="sparkles" size={20} color="#8B5CF6" />
            <Text style={styles.statValue}>{stats.withAI}</Text>
            <Text style={styles.statLabel}>AI 분석</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="business" size={20} color="#3B82F6" />
            <Text style={styles.statValue}>{stats.uniqueClinics}</Text>
            <Text style={styles.statLabel}>이용 한의원</Text>
          </View>
          {stats.topClinic && (
            <View style={[styles.statCard, styles.statCardWide]}>
              <Ionicons name="star" size={20} color="#F59E0B" />
              <Text style={styles.statValue} numberOfLines={1}>{stats.topClinic.name}</Text>
              <Text style={styles.statLabel}>주 이용 ({stats.topClinic.count}회)</Text>
            </View>
          )}
        </View>
      </View>

      {/* 기간 필터 */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>기간별 보기</Text>
        <View style={styles.filterScroll}>
          {([
            { key: 'all', label: '전체' },
            { key: 'month', label: '이번 달' },
            { key: '3months', label: '3개월' },
            { key: '6months', label: '6개월' },
            { key: 'year', label: '올해' },
          ] as const).map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                periodFilter === filter.key && styles.filterChipActive,
              ]}
              onPress={() => setPeriodFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  periodFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 결과 카운트 */}
      <View style={styles.resultCount}>
        <Ionicons name="list" size={16} color="#6B7280" />
        <Text style={styles.resultCountText}>
          {filteredRecords.length}건의 기록
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>진료 기록이 없습니다</Text>
      <Text style={styles.emptyText}>
        한의원에서 진료를 받으시면{'\n'}기록이 여기에 표시됩니다
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

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderRecordItem}
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loaderText}>진료 기록을 불러오는 중...</Text>
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
    marginBottom: 8,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  statsContainer: {
    marginBottom: 20,
  },
  mainStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  mainStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainStatInfo: {
    flex: 1,
  },
  mainStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#065F46',
  },
  mainStatLabel: {
    fontSize: 14,
    color: '#047857',
    marginTop: 2,
  },
  lastVisitBadge: {
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lastVisitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardWide: {
    flex: 1.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  resultCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  resultCountText: {
    fontSize: 13,
    color: '#6B7280',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  monthHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  monthHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  recordCard: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  recordCardWithAI: {
    // 스타일 유지
  },
  timelineContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: -2,
  },
  cardContent: {
    flex: 1,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateDay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
  },
  dateDetails: {
    gap: 2,
  },
  dateWeekday: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dateTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clinicSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  clinicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clinicName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  practitionerName: {
    fontSize: 13,
    color: '#6B7280',
  },
  complaintSection: {
    marginBottom: 10,
  },
  complaintRow: {
    flexDirection: 'row',
    gap: 12,
  },
  complaintTextContainer: {
    flex: 1,
  },
  complaintLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  complaintText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  diagnosisSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
  },
  diagnosisText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  symptomTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  symptomTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  symptomTagHigh: {
    backgroundColor: '#FEE2E2',
  },
  symptomTagText: {
    fontSize: 12,
    color: '#374151',
  },
  symptomTagTextHigh: {
    color: '#991B1B',
    fontWeight: '500',
  },
  symptomTagMore: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  symptomTagMoreText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  aiSummarySection: {
    backgroundColor: '#F5F3FF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  aiSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  aiSummaryText: {
    fontSize: 13,
    color: '#5B21B6',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerInfo: {
    flex: 1,
  },
  treatmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  treatmentText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
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
