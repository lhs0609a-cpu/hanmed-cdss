import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ScrollView,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { getMyReservations } from '../../src/services/reservationService';
import { format, differenceInDays, differenceInHours, isToday, isTomorrow, isThisWeek, parseISO, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Reservation, ReservationStatus } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'upcoming' | 'past';

// 캘린더 아이콘 SVG
function CalendarIcon({ day, isHighlight = false }: { day: number; isHighlight?: boolean }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Defs>
        <LinearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={isHighlight ? '#10B981' : '#6366F1'} />
          <Stop offset="1" stopColor={isHighlight ? '#059669' : '#4F46E5'} />
        </LinearGradient>
      </Defs>
      {/* 캘린더 배경 */}
      <Rect x="4" y="8" width="48" height="44" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      {/* 캘린더 상단 */}
      <Rect x="4" y="8" width="48" height="16" rx="8" fill="url(#calGrad)" />
      <Rect x="4" y="16" width="48" height="8" fill="url(#calGrad)" />
      {/* 고리 */}
      <Rect x="16" y="4" width="4" height="10" rx="2" fill="#9CA3AF" />
      <Rect x="36" y="4" width="4" height="10" rx="2" fill="#9CA3AF" />
    </Svg>
  );
}

// D-Day 계산
function getDDayText(dateStr: string): { text: string; color: string; urgent: boolean } {
  const reservationDate = parseISO(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = differenceInDays(reservationDate, today);

  if (days < 0) {
    return { text: `D+${Math.abs(days)}`, color: '#9CA3AF', urgent: false };
  } else if (days === 0) {
    return { text: 'D-Day', color: '#EF4444', urgent: true };
  } else if (days === 1) {
    return { text: 'D-1', color: '#F59E0B', urgent: true };
  } else if (days <= 3) {
    return { text: `D-${days}`, color: '#F59E0B', urgent: false };
  } else if (days <= 7) {
    return { text: `D-${days}`, color: '#10B981', urgent: false };
  } else {
    return { text: `D-${days}`, color: '#6B7280', urgent: false };
  }
}

// 상태 정보
function getStatusInfo(status: ReservationStatus): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  const statusMap: Record<ReservationStatus, { label: string; color: string; bgColor: string; icon: string }> = {
    pending: { label: '확인 대기', color: '#D97706', bgColor: '#FEF3C7', icon: 'time-outline' },
    confirmed: { label: '예약 확정', color: '#059669', bgColor: '#D1FAE5', icon: 'checkmark-circle-outline' },
    cancelled: { label: '예약 취소', color: '#DC2626', bgColor: '#FEE2E2', icon: 'close-circle-outline' },
    completed: { label: '진료 완료', color: '#6B7280', bgColor: '#F3F4F6', icon: 'checkbox-outline' },
    no_show: { label: '미방문', color: '#DC2626', bgColor: '#FEE2E2', icon: 'alert-circle-outline' },
  };
  return statusMap[status] || statusMap.pending;
}

// 방문 유형 텍스트
function getVisitTypeText(type?: string): string {
  const typeMap: Record<string, string> = {
    initial: '초진',
    follow_up: '재진',
    consultation: '상담',
  };
  return type ? typeMap[type] || type : '';
}

// 주간 미니 캘린더
function WeekCalendar({ reservations }: { reservations: Reservation[] }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const reservationDates = new Set(
    reservations
      .filter(r => r.status !== 'cancelled')
      .map(r => r.reservationDate)
  );

  return (
    <View style={styles.weekCalendar}>
      {weekDays.map((date, index) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const hasReservation = reservationDates.has(dateStr);
        const isCurrentDay = isToday(date);

        return (
          <View key={index} style={styles.weekDayContainer}>
            <Text style={[
              styles.weekDayLabel,
              isCurrentDay && styles.weekDayLabelToday
            ]}>
              {format(date, 'EEE', { locale: ko })}
            </Text>
            <View style={[
              styles.weekDayCircle,
              isCurrentDay && styles.weekDayCircleToday,
              hasReservation && styles.weekDayCircleReservation,
            ]}>
              <Text style={[
                styles.weekDayNumber,
                isCurrentDay && styles.weekDayNumberToday,
                hasReservation && !isCurrentDay && styles.weekDayNumberReservation,
              ]}>
                {format(date, 'd')}
              </Text>
            </View>
            {hasReservation && (
              <View style={[
                styles.weekDayDot,
                isCurrentDay && styles.weekDayDotToday,
              ]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function ReservationsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const today = new Date().toISOString().split('T')[0];

  const { data: upcomingReservations, isLoading: isLoadingUpcoming, refetch: refetchUpcoming } = useQuery({
    queryKey: ['reservations', 'upcoming'],
    queryFn: () => getMyReservations({ startDate: today }),
  });

  const { data: pastReservations, isLoading: isLoadingPast, refetch: refetchPast } = useQuery({
    queryKey: ['reservations', 'past'],
    queryFn: () => getMyReservations({ endDate: today }),
  });

  const reservations = activeTab === 'upcoming' ? upcomingReservations : pastReservations;
  const isLoading = activeTab === 'upcoming' ? isLoadingUpcoming : isLoadingPast;
  const refetch = activeTab === 'upcoming' ? refetchUpcoming : refetchPast;

  // 통계 계산
  const stats = useMemo(() => {
    const upcoming = upcomingReservations || [];
    const past = pastReservations || [];

    const total = upcoming.length;
    const pending = upcoming.filter(r => r.status === 'pending').length;
    const thisWeek = upcoming.filter(r => {
      const date = parseISO(r.reservationDate);
      return isThisWeek(date, { weekStartsOn: 0 });
    }).length;
    const completed = past.filter(r => r.status === 'completed').length;

    return { total, pending, thisWeek, completed };
  }, [upcomingReservations, pastReservations]);

  // 다음 예약 (가장 가까운)
  const nextReservation = useMemo(() => {
    if (!upcomingReservations || upcomingReservations.length === 0) return null;

    const confirmed = upcomingReservations
      .filter(r => r.status === 'confirmed' || r.status === 'pending')
      .sort((a, b) => a.reservationDate.localeCompare(b.reservationDate));

    return confirmed[0] || null;
  }, [upcomingReservations]);

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const renderNextReservationCard = () => {
    if (!nextReservation) return null;

    const dday = getDDayText(nextReservation.reservationDate);
    const statusInfo = getStatusInfo(nextReservation.status);
    const reservationDateTime = parseISO(`${nextReservation.reservationDate}T${nextReservation.reservationTime}`);

    return (
      <TouchableOpacity
        style={styles.nextReservationCard}
        onPress={() => router.push(`/reservation/${nextReservation.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.nextCardGradient}>
          {/* 배경 장식 */}
          <View style={styles.nextCardDecoration}>
            <Ionicons name="calendar" size={120} color="rgba(255,255,255,0.1)" />
          </View>

          {/* D-Day 배지 */}
          <View style={[styles.ddayBadge, dday.urgent && styles.ddayBadgeUrgent]}>
            <Text style={[styles.ddayText, dday.urgent && styles.ddayTextUrgent]}>
              {dday.text}
            </Text>
          </View>

          {/* 메인 정보 */}
          <View style={styles.nextCardContent}>
            <Text style={styles.nextCardLabel}>다음 예약</Text>
            <Text style={styles.nextCardClinic}>{nextReservation.clinic?.name || '한의원'}</Text>

            <View style={styles.nextCardDateTime}>
              <View style={styles.nextCardDateTimeItem}>
                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.nextCardDateTimeText}>
                  {format(parseISO(nextReservation.reservationDate), 'M월 d일 (EEEE)', { locale: ko })}
                </Text>
              </View>
              <View style={styles.nextCardDateTimeItem}>
                <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.nextCardDateTimeText}>
                  {nextReservation.reservationTime}
                </Text>
              </View>
            </View>

            {nextReservation.practitioner && (
              <View style={styles.nextCardPractitioner}>
                <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.nextCardPractitionerText}>
                  {nextReservation.practitioner.name} 한의사
                </Text>
              </View>
            )}
          </View>

          {/* 하단 버튼들 */}
          <View style={styles.nextCardActions}>
            <TouchableOpacity
              style={styles.nextCardActionButton}
              onPress={() => handleCall(nextReservation.clinic?.phone)}
            >
              <Ionicons name="call-outline" size={18} color="#FFFFFF" />
              <Text style={styles.nextCardActionText}>전화</Text>
            </TouchableOpacity>

            <View style={styles.nextCardActionDivider} />

            <TouchableOpacity
              style={styles.nextCardActionButton}
              onPress={() => router.push(`/reservation/${nextReservation.id}`)}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              <Text style={styles.nextCardActionText}>상세보기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReservationItem = ({ item, index }: { item: Reservation; index: number }) => {
    const statusInfo = getStatusInfo(item.status);
    const dday = getDDayText(item.reservationDate);
    const visitType = getVisitTypeText(item.visitType);
    const reservationDate = parseISO(item.reservationDate);

    // 날짜 표시 텍스트
    let dateLabel = format(reservationDate, 'M월 d일', { locale: ko });
    if (isToday(reservationDate)) {
      dateLabel = '오늘';
    } else if (isTomorrow(reservationDate)) {
      dateLabel = '내일';
    }

    return (
      <TouchableOpacity
        style={styles.reservationCard}
        onPress={() => router.push(`/reservation/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* 왼쪽 날짜 영역 */}
        <View style={[
          styles.dateSection,
          item.status === 'cancelled' && styles.dateSectionCancelled,
        ]}>
          <Text style={[
            styles.dateLabel,
            item.status === 'cancelled' && styles.dateLabelCancelled,
          ]}>
            {dateLabel}
          </Text>
          <Text style={[
            styles.dateWeekday,
            item.status === 'cancelled' && styles.dateWeekdayCancelled,
          ]}>
            {format(reservationDate, 'EEEE', { locale: ko })}
          </Text>
          {activeTab === 'upcoming' && item.status !== 'cancelled' && (
            <View style={[styles.ddayTag, { backgroundColor: dday.color + '20' }]}>
              <Text style={[styles.ddayTagText, { color: dday.color }]}>{dday.text}</Text>
            </View>
          )}
        </View>

        {/* 메인 정보 영역 */}
        <View style={styles.mainSection}>
          <View style={styles.mainHeader}>
            <Text style={[
              styles.clinicName,
              item.status === 'cancelled' && styles.clinicNameCancelled,
            ]}>
              {item.clinic?.name || '한의원'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.timeText}>{item.reservationTime}</Text>
            {visitType && (
              <>
                <View style={styles.timeDot} />
                <Text style={styles.visitTypeText}>{visitType}</Text>
              </>
            )}
            {item.durationMinutes && (
              <>
                <View style={styles.timeDot} />
                <Text style={styles.durationText}>{item.durationMinutes}분</Text>
              </>
            )}
          </View>

          {item.practitioner && (
            <View style={styles.practitionerRow}>
              <Ionicons name="person-outline" size={14} color="#6B7280" />
              <Text style={styles.practitionerText}>{item.practitioner.name} 한의사</Text>
            </View>
          )}

          {item.visitReason && (
            <View style={styles.reasonRow}>
              <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
              <Text style={styles.reasonText} numberOfLines={1}>{item.visitReason}</Text>
            </View>
          )}

          {/* 빠른 액션 */}
          {activeTab === 'upcoming' && item.status !== 'cancelled' && (
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCall(item.clinic?.phone);
                }}
              >
                <Ionicons name="call-outline" size={16} color="#10B981" />
                <Text style={styles.quickActionText}>전화</Text>
              </TouchableOpacity>

              {item.clinic?.address && (
                <TouchableOpacity style={styles.quickActionButton}>
                  <Ionicons name="navigate-outline" size={16} color="#10B981" />
                  <Text style={styles.quickActionText}>길찾기</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* 주간 캘린더 */}
      {activeTab === 'upcoming' && upcomingReservations && (
        <View style={styles.weekCalendarContainer}>
          <Text style={styles.weekCalendarTitle}>이번 주 예약</Text>
          <WeekCalendar reservations={upcomingReservations} />
        </View>
      )}

      {/* 다음 예약 카드 */}
      {activeTab === 'upcoming' && renderNextReservationCard()}

      {/* 예약 목록 헤더 */}
      <View style={styles.listTitleRow}>
        <Text style={styles.listTitle}>
          {activeTab === 'upcoming' ? '예정된 예약' : '지난 예약'}
        </Text>
        <Text style={styles.listCount}>
          {reservations?.length || 0}건
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>예약 관리</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 통계 카드 */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="calendar-outline" size={20} color="#6366F1" />
          </View>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>예정</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time-outline" size={20} color="#D97706" />
          </View>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>대기중</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="today-outline" size={20} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{stats.thisWeek}</Text>
          <Text style={styles.statLabel}>이번 주</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="checkmark-done-outline" size={20} color="#6B7280" />
          </View>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>완료</Text>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={activeTab === 'upcoming' ? '#10B981' : '#9CA3AF'}
          />
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            예정된 예약
          </Text>
          {stats.total > 0 && (
            <View style={[
              styles.tabBadge,
              activeTab === 'upcoming' && styles.tabBadgeActive,
            ]}>
              <Text style={[
                styles.tabBadgeText,
                activeTab === 'upcoming' && styles.tabBadgeTextActive,
              ]}>
                {stats.total}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Ionicons
            name="time"
            size={18}
            color={activeTab === 'past' ? '#10B981' : '#9CA3AF'}
          />
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            지난 예약
          </Text>
        </TouchableOpacity>
      </View>

      {/* 예약 목록 */}
      <FlatList
        data={reservations || []}
        renderItem={renderReservationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name={activeTab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
                  size={48}
                  color="#D1D5DB"
                />
              </View>
              <Text style={styles.emptyText}>
                {activeTab === 'upcoming'
                  ? '예정된 예약이 없습니다'
                  : '지난 예약이 없습니다'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'upcoming'
                  ? '새로운 예약을 잡아보세요'
                  : '방문 기록이 여기에 표시됩니다'}
              </Text>
              {activeTab === 'upcoming' && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/(tabs)/search')}
                >
                  <Ionicons name="search-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>한의원 찾기</Text>
                </TouchableOpacity>
              )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#10B981',
  },
  tabBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBadgeTextActive: {
    color: '#10B981',
  },
  listContent: {
    paddingBottom: 24,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  weekCalendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  weekCalendarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayContainer: {
    alignItems: 'center',
    gap: 4,
  },
  weekDayLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  weekDayLabelToday: {
    color: '#10B981',
  },
  weekDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  weekDayCircleToday: {
    backgroundColor: '#10B981',
  },
  weekDayCircleReservation: {
    backgroundColor: '#EEF2FF',
  },
  weekDayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  weekDayNumberToday: {
    color: '#FFFFFF',
  },
  weekDayNumberReservation: {
    color: '#6366F1',
  },
  weekDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  weekDayDotToday: {
    backgroundColor: '#FFFFFF',
  },
  nextReservationCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextCardGradient: {
    backgroundColor: '#10B981',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  nextCardDecoration: {
    position: 'absolute',
    right: -20,
    top: -20,
    opacity: 0.3,
  },
  ddayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  ddayBadgeUrgent: {
    backgroundColor: '#FEF3C7',
  },
  ddayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ddayTextUrgent: {
    color: '#D97706',
  },
  nextCardContent: {
    marginBottom: 16,
  },
  nextCardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  nextCardClinic: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  nextCardDateTime: {
    gap: 8,
  },
  nextCardDateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextCardDateTimeText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  nextCardPractitioner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  nextCardPractitionerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  nextCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 16,
    marginTop: 4,
  },
  nextCardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextCardActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextCardActionDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  listCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  reservationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateSection: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 72,
    marginRight: 12,
  },
  dateSectionCancelled: {
    backgroundColor: '#F3F4F6',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  dateLabelCancelled: {
    color: '#9CA3AF',
  },
  dateWeekday: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
  },
  dateWeekdayCancelled: {
    color: '#9CA3AF',
  },
  ddayTag: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ddayTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  mainSection: {
    flex: 1,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  clinicName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  clinicNameCancelled: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  timeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  visitTypeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  practitionerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  practitionerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonText: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
