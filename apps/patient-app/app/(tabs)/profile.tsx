import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Linking,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/stores/authStore';
import { logout } from '../../src/services/authService';
import { getMyRecords } from '../../src/services/recordService';
import { getActivePrescriptions, getMyPrescriptions } from '../../src/services/prescriptionService';
import { getMyClinics } from '../../src/services/clinicService';
import { getUpcomingReservations } from '../../src/services/reservationService';
import { getMedicationReminders } from '../../src/services/medicationReminderService';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 프로필 아바타 SVG
function ProfileAvatar({ name, size = 100 }: { name: string; size?: number }) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="avatarGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#E5E7EB" />
          </LinearGradient>
        </Defs>
        <Circle cx="50" cy="50" r="48" fill="url(#avatarGrad)" />
        <Circle cx="50" cy="50" r="46" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.5" />
      </Svg>
      <View style={[styles.avatarTextContainer, { width: size, height: size }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.4, color: '#10B981' }]}>{initial}</Text>
      </View>
    </View>
  );
}

// 프로필 완성도 링
function ProfileCompletionRing({ percentage }: { percentage: number }) {
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#FFFFFF"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={styles.completionTextContainer}>
        <Text style={styles.completionText}>{percentage}%</Text>
      </View>
    </View>
  );
}

// 체질 색상
function getConstitutionColor(constitution?: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    '태양인': { bg: 'rgba(255,255,255,0.25)', text: '#FFFFFF' },
    '태음인': { bg: 'rgba(255,255,255,0.25)', text: '#FFFFFF' },
    '소양인': { bg: 'rgba(255,255,255,0.25)', text: '#FFFFFF' },
    '소음인': { bg: 'rgba(255,255,255,0.25)', text: '#FFFFFF' },
  };
  return map[constitution || ''] || { bg: 'rgba(255,255,255,0.2)', text: '#FFFFFF' };
}

// 체질 아이콘 이모지
function getConstitutionEmoji(constitution?: string): string {
  const map: Record<string, string> = {
    '태양인': '☀️',
    '태음인': '🌙',
    '소양인': '🔥',
    '소음인': '💧',
  };
  return map[constitution || ''] || '✨';
}

export default function ProfileScreen() {
  const { patient, logout: clearAuth } = useAuthStore();

  // 데이터 조회
  const { data: records, refetch: refetchRecords } = useQuery({
    queryKey: ['myRecords'],
    queryFn: () => getMyRecords({ limit: 100 }),
  });

  const { data: prescriptions, refetch: refetchPrescriptions } = useQuery({
    queryKey: ['myPrescriptions'],
    queryFn: () => getMyPrescriptions({ limit: 100 }),
  });

  const { data: activePrescriptions, refetch: refetchActive } = useQuery({
    queryKey: ['activePrescriptions'],
    queryFn: getActivePrescriptions,
  });

  const { data: myClinics, refetch: refetchClinics } = useQuery({
    queryKey: ['myClinics'],
    queryFn: getMyClinics,
  });

  const { data: upcomingReservations, refetch: refetchReservations } = useQuery({
    queryKey: ['upcomingReservations'],
    queryFn: getUpcomingReservations,
  });

  const { data: reminders, refetch: refetchReminders } = useQuery({
    queryKey: ['medicationReminders'],
    queryFn: getMedicationReminders,
  });

  const onRefresh = () => {
    refetchRecords();
    refetchPrescriptions();
    refetchActive();
    refetchClinics();
    refetchReservations();
    refetchReminders();
  };

  // 통계 계산
  const stats = useMemo(() => {
    return {
      totalRecords: records?.meta?.total || 0,
      totalPrescriptions: prescriptions?.meta?.total || 0,
      activePrescriptions: activePrescriptions?.length || 0,
      connectedClinics: myClinics?.length || 0,
    };
  }, [records, prescriptions, activePrescriptions, myClinics]);

  // 오늘의 건강 요약
  const todaySummary = useMemo(() => {
    const today = new Date();
    const todayReminders = reminders?.filter((r: any) => r.isActive) || [];
    const nextReservation = upcomingReservations?.[0];

    return {
      medicationCount: todayReminders.length,
      nextReservation,
    };
  }, [reminders, upcomingReservations]);

  // 프로필 완성도 계산
  const profileCompletion = useMemo(() => {
    let completed = 0;
    const total = 6;

    if (patient?.name) completed++;
    if (patient?.phone) completed++;
    if (patient?.email) completed++;
    if (patient?.birthDate) completed++;
    if (patient?.constitution) completed++;
    if (patient?.allergies?.length > 0 || patient?.chronicConditions?.length > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [patient]);

  const constitutionColors = getConstitutionColor(patient?.constitution);
  const constitutionEmoji = getConstitutionEmoji(patient?.constitution);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '정말 탈퇴하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert('알림', '회원 탈퇴가 완료되었습니다.');
          },
        },
      ]
    );
  };

  const menuSections = [
    {
      title: '건강 관리',
      items: [
        {
          label: '건강 일지',
          icon: 'journal-outline',
          color: '#10B981',
          onPress: () => router.push('/health/journal'),
        },
        {
          label: '건강 리포트',
          icon: 'bar-chart-outline',
          color: '#6366F1',
          onPress: () => router.push('/health/report'),
        },
        {
          label: '복약 알림',
          icon: 'alarm-outline',
          color: '#F59E0B',
          badge: todaySummary.medicationCount > 0 ? `${todaySummary.medicationCount}개` : undefined,
          onPress: () => router.push('/health/reminders'),
        },
      ],
    },
    {
      title: '진료 내역',
      items: [
        {
          label: '진료 기록',
          icon: 'document-text-outline',
          color: '#3B82F6',
          badge: stats.totalRecords > 0 ? `${stats.totalRecords}건` : undefined,
          onPress: () => router.push('/(tabs)/records'),
        },
        {
          label: '처방 기록',
          icon: 'medical-outline',
          color: '#10B981',
          badge: stats.activePrescriptions > 0 ? `복용중 ${stats.activePrescriptions}` : undefined,
          onPress: () => router.push('/(tabs)/prescriptions'),
        },
      ],
    },
    {
      title: '설정',
      items: [
        {
          label: '알림 설정',
          icon: 'notifications-outline',
          color: '#6366F1',
          onPress: () => router.push('/settings/notifications'),
        },
        {
          label: '개인정보 관리',
          icon: 'shield-checkmark-outline',
          color: '#10B981',
          onPress: () => router.push('/profile/edit'),
        },
      ],
    },
    {
      title: '지원',
      items: [
        {
          label: '고객센터',
          icon: 'chatbubbles-outline',
          color: '#3B82F6',
          onPress: () => Linking.openURL('tel:02-1234-5678'),
        },
        {
          label: '이용약관',
          icon: 'document-outline',
          color: '#6B7280',
          onPress: () => router.push('/support/terms'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {/* 프로필 헤더 - 그라데이션 배경 */}
        <ExpoLinearGradient
          colors={['#059669', '#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.profileHeaderContent}>
            <ProfileAvatar name={patient?.name || ''} size={80} />

            <View style={styles.profileInfo}>
              <Text style={styles.name}>{patient?.name || '사용자'}</Text>
              <Text style={styles.phone}>{patient?.phone || ''}</Text>

              <View style={styles.badgesRow}>
                {patient?.constitution && (
                  <View style={[styles.constitutionBadge, { backgroundColor: constitutionColors.bg }]}>
                    <Text style={styles.constitutionEmoji}>{constitutionEmoji}</Text>
                    <Text style={[styles.constitutionText, { color: constitutionColors.text }]}>
                      {patient.constitution}
                    </Text>
                  </View>
                )}
                {patient?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                    <Text style={styles.verifiedText}>인증</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* 프로필 완성도 (미완성 시) */}
          {profileCompletion < 100 && (
            <TouchableOpacity
              style={styles.completionCard}
              onPress={() => router.push('/profile/edit')}
            >
              <ProfileCompletionRing percentage={profileCompletion} />
              <View style={styles.completionInfo}>
                <Text style={styles.completionTitle}>프로필 완성하기</Text>
                <Text style={styles.completionSubtitle}>
                  더 정확한 건강 관리를 위해 완성해주세요
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}

          {/* 프로필 수정 버튼 */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
            <Text style={styles.editProfileText}>프로필 수정</Text>
          </TouchableOpacity>
        </ExpoLinearGradient>

        {/* 오늘의 건강 요약 */}
        <View style={styles.todaySummary}>
          <Text style={styles.todayTitle}>오늘의 건강</Text>
          <View style={styles.todayCards}>
            {/* 복약 알림 카드 */}
            <TouchableOpacity
              style={styles.todayCard}
              onPress={() => router.push('/health/reminders')}
            >
              <View style={[styles.todayIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="medical" size={20} color="#D97706" />
              </View>
              <View style={styles.todayCardContent}>
                <Text style={styles.todayCardLabel}>복약 알림</Text>
                <Text style={styles.todayCardValue}>
                  {todaySummary.medicationCount > 0
                    ? `${todaySummary.medicationCount}개 활성`
                    : '없음'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>

            {/* 다가오는 예약 카드 */}
            <TouchableOpacity
              style={styles.todayCard}
              onPress={() => router.push('/(tabs)/reservations')}
            >
              <View style={[styles.todayIconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="calendar" size={20} color="#2563EB" />
              </View>
              <View style={styles.todayCardContent}>
                <Text style={styles.todayCardLabel}>다가오는 예약</Text>
                <Text style={styles.todayCardValue}>
                  {todaySummary.nextReservation
                    ? format(new Date(todaySummary.nextReservation.reservationDate), 'M/d (EEE)', { locale: ko })
                    : '없음'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 통계 카드 */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/records')}
          >
            <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="document-text" size={24} color="#6366F1" />
            </View>
            <Text style={styles.statValue}>{stats.totalRecords}</Text>
            <Text style={styles.statLabel}>진료 기록</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/prescriptions')}
          >
            <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="medical" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats.activePrescriptions}</Text>
            <Text style={styles.statLabel}>복용 중</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/search')}
          >
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="business" size={24} color="#D97706" />
            </View>
            <Text style={styles.statValue}>{stats.connectedClinics}</Text>
            <Text style={styles.statLabel}>내 한의원</Text>
          </TouchableOpacity>
        </View>

        {/* 연결된 한의원 */}
        {myClinics && myClinics.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>연결된 한의원</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                <Text style={styles.seeAllText}>전체보기</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clinicsScroll}>
              {myClinics.slice(0, 5).map((clinic: any) => (
                <TouchableOpacity
                  key={clinic.id}
                  style={styles.clinicCard}
                  onPress={() => router.push(`/clinic/${clinic.id}`)}
                >
                  <View style={styles.clinicIconContainer}>
                    <Ionicons name="business" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.clinicName} numberOfLines={1}>{clinic.name}</Text>
                  {clinic.isHanmedVerified && (
                    <View style={styles.clinicVerifiedBadge}>
                      <Ionicons name="checkmark-circle" size={10} color="#FFFFFF" />
                      <Text style={styles.clinicVerifiedText}>인증</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 메뉴 섹션들 */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {(item as any).badge && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{(item as any).badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* 계정 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.menuLabel, { color: '#EF4444' }]}>로그아웃</Text>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <View style={styles.menuItemBorder} />

            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="trash-outline" size={20} color="#9CA3AF" />
              </View>
              <Text style={[styles.menuLabel, { color: '#9CA3AF' }]}>회원 탈퇴</Text>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 앱 정보 */}
        <View style={styles.appInfoContainer}>
          <View style={styles.appInfo}>
            <View style={styles.appLogoContainer}>
              <Ionicons name="leaf" size={24} color="#10B981" />
            </View>
            <Text style={styles.appName}>HanMed</Text>
            <Text style={styles.appVersion}>버전 1.0.0</Text>
          </View>
          <Text style={styles.copyright}>© 2024 HanMed. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 32,
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  phone: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  constitutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  constitutionEmoji: {
    fontSize: 12,
  },
  constitutionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  completionTextContainer: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  todaySummary: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  todayCards: {
    gap: 10,
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  todayIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  todayCardLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  todayCardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  clinicsScroll: {
    marginHorizontal: -4,
  },
  clinicCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clinicIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  clinicName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },
  clinicVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  clinicVerifiedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  menuBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  appInfoContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  appLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  appVersion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  copyright: {
    fontSize: 11,
    color: '#D1D5DB',
  },
});
