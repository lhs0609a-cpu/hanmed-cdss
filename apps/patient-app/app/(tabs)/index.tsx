import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/authStore';
import { getUpcomingReservations } from '../../src/services/reservationService';
import { getMyClinics } from '../../src/services/clinicService';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function HomeScreen() {
  const patient = useAuthStore((state) => state.patient);

  const {
    data: upcomingReservations,
    isLoading: reservationsLoading,
    refetch: refetchReservations,
  } = useQuery({
    queryKey: ['upcomingReservations'],
    queryFn: getUpcomingReservations,
  });

  const {
    data: myClinics,
    isLoading: clinicsLoading,
    refetch: refetchClinics,
  } = useQuery({
    queryKey: ['myClinics'],
    queryFn: getMyClinics,
  });

  const onRefresh = () => {
    refetchReservations();
    refetchClinics();
  };

  const isLoading = reservationsLoading || clinicsLoading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.greeting}>안녕하세요,</Text>
          <Text style={styles.name}>{patient?.name}님</Text>
        </View>

        {/* 다가오는 예약 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>다가오는 예약</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/reservations')}>
              <Text style={styles.seeAll}>전체보기</Text>
            </TouchableOpacity>
          </View>

          {!upcomingReservations || upcomingReservations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>예정된 예약이 없습니다</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Text style={styles.emptyButtonText}>한의원 찾기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingReservations.slice(0, 2).map((reservation) => (
              <TouchableOpacity
                key={reservation.id}
                style={styles.reservationCard}
                onPress={() => router.push(`/reservation/${reservation.id}`)}
              >
                <View style={styles.reservationDate}>
                  <Text style={styles.dateMonth}>
                    {format(new Date(reservation.reservationDate), 'M월', {
                      locale: ko,
                    })}
                  </Text>
                  <Text style={styles.dateDay}>
                    {format(new Date(reservation.reservationDate), 'd', {
                      locale: ko,
                    })}
                  </Text>
                  <Text style={styles.dateWeekday}>
                    {format(new Date(reservation.reservationDate), 'EEE', {
                      locale: ko,
                    })}
                  </Text>
                </View>
                <View style={styles.reservationInfo}>
                  <Text style={styles.clinicName}>
                    {reservation.clinic?.name || '한의원'}
                  </Text>
                  <Text style={styles.reservationTime}>
                    {reservation.reservationTime}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      reservation.status === 'confirmed' && styles.confirmedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        reservation.status === 'confirmed' &&
                          styles.confirmedText,
                      ]}
                    >
                      {reservation.status === 'confirmed' ? '확정' : '대기중'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* 내 한의원 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>내 한의원</Text>
          </View>

          {!myClinics || myClinics.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>연결된 한의원이 없습니다</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Text style={styles.emptyButtonText}>한의원 찾기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {myClinics.map((clinic) => (
                <TouchableOpacity
                  key={clinic.id}
                  style={styles.clinicCard}
                  onPress={() => router.push(`/clinic/${clinic.id}`)}
                >
                  <View style={styles.clinicIcon}>
                    <Text style={styles.clinicIconText}>🏥</Text>
                  </View>
                  <Text style={styles.clinicCardName}>{clinic.name}</Text>
                  {clinic.isHanmedVerified && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>인증</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 빠른 메뉴 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 메뉴</Text>
          <View style={styles.quickMenu}>
            <TouchableOpacity
              style={styles.quickMenuItem}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.quickMenuIcon}>🔍</Text>
              <Text style={styles.quickMenuText}>한의원 찾기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickMenuItem}
              onPress={() => router.push('/(tabs)/reservations')}
            >
              <Text style={styles.quickMenuIcon}>📅</Text>
              <Text style={styles.quickMenuText}>예약 관리</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickMenuItem}
              onPress={() => router.push('/(tabs)/records')}
            >
              <Text style={styles.quickMenuIcon}>📋</Text>
              <Text style={styles.quickMenuText}>진료 기록</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickMenuItem}
              onPress={() => router.push('/(tabs)/health')}
            >
              <Text style={styles.quickMenuIcon}>💊</Text>
              <Text style={styles.quickMenuText}>건강 관리</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAll: {
    fontSize: 14,
    color: '#10b981',
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  emptyButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  reservationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reservationDate: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 16,
  },
  dateMonth: {
    fontSize: 12,
    color: '#10b981',
  },
  dateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  dateWeekday: {
    fontSize: 12,
    color: '#10b981',
  },
  reservationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  reservationTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  confirmedBadge: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  confirmedText: {
    color: '#065f46',
  },
  clinicCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 12,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clinicIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#ecfdf5',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  clinicIconText: {
    fontSize: 24,
  },
  clinicCardName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },
  verifiedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  quickMenu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  quickMenuItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickMenuIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickMenuText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
