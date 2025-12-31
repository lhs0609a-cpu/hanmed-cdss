import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  getClinicById,
  getClinicPractitioners,
  connectToClinic,
} from '../../src/services/clinicService';
import { useReservationStore } from '../../src/stores/reservationStore';

export default function ClinicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isConnecting, setIsConnecting] = useState(false);

  const { updateNewReservation } = useReservationStore();

  const { data: clinic, isLoading: clinicLoading } = useQuery({
    queryKey: ['clinic', id],
    queryFn: () => getClinicById(id!),
    enabled: !!id,
  });

  const { data: practitioners } = useQuery({
    queryKey: ['practitioners', id],
    queryFn: () => getClinicPractitioners(id!),
    enabled: !!id,
  });

  const handleCall = () => {
    if (clinic?.phone) {
      Linking.openURL(`tel:${clinic.phone}`);
    }
  };

  const handleConnect = async () => {
    if (!id) return;
    setIsConnecting(true);
    try {
      await connectToClinic(id);
      Alert.alert('연결 완료', '한의원과 연결되었습니다.');
    } catch (error) {
      Alert.alert('오류', '한의원 연결에 실패했습니다.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReservation = () => {
    if (!clinic) return;
    updateNewReservation({ clinicId: clinic.id });
    router.push('/reservation/new');
  };

  const getDayLabel = (day: string) => {
    const labels: Record<string, string> = {
      mon: '월',
      tue: '화',
      wed: '수',
      thu: '목',
      fri: '금',
      sat: '토',
      sun: '일',
    };
    return labels[day] || day;
  };

  if (clinicLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!clinic) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>한의원 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🏥</Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{clinic.name}</Text>
            {clinic.isHanmedVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>HanMed 인증</Text>
              </View>
            )}
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingText}>
              {clinic.ratingAverage?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.reviewCount}>
              리뷰 {clinic.reviewCount || 0}개
            </Text>
          </View>
        </View>
      </View>

      {/* 전문 분야 */}
      {clinic.specialties && clinic.specialties.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>전문 분야</Text>
          <View style={styles.specialties}>
            {clinic.specialties.map((specialty, index) => (
              <View key={index} style={styles.specialtyBadge}>
                <Text style={styles.specialtyText}>{specialty}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 기본 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기본 정보</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>
              {clinic.addressRoad}
              {clinic.addressDetail && ` ${clinic.addressDetail}`}
            </Text>
          </View>
          {clinic.phone && (
            <TouchableOpacity style={styles.infoItem} onPress={handleCall}>
              <Text style={styles.infoIcon}>📞</Text>
              <Text style={[styles.infoText, styles.linkText]}>
                {clinic.phone}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 운영 시간 */}
      {clinic.operatingHours && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>운영 시간</Text>
          <View style={styles.infoCard}>
            {Object.entries(clinic.operatingHours).map(([day, hours]) => (
              <View key={day} style={styles.hoursItem}>
                <Text style={styles.dayText}>{getDayLabel(day)}</Text>
                {hours.closed ? (
                  <Text style={styles.closedText}>휴무</Text>
                ) : (
                  <Text style={styles.hoursText}>
                    {hours.open} - {hours.close}
                    {hours.break &&
                      ` (점심 ${hours.break.start}-${hours.break.end})`}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 소개 */}
      {clinic.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>한의원 소개</Text>
          <View style={styles.infoCard}>
            <Text style={styles.descriptionText}>{clinic.description}</Text>
          </View>
        </View>
      )}

      {/* 의료진 */}
      {practitioners && practitioners.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>의료진</Text>
          {practitioners.map((practitioner) => (
            <View key={practitioner.id} style={styles.practitionerCard}>
              <View style={styles.practitionerAvatar}>
                <Text style={styles.practitionerAvatarText}>
                  {practitioner.displayName?.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.practitionerInfo}>
                <Text style={styles.practitionerName}>
                  {practitioner.displayName}
                </Text>
                {practitioner.specialties &&
                  practitioner.specialties.length > 0 && (
                    <Text style={styles.practitionerSpecialty}>
                      {practitioner.specialties.join(', ')}
                    </Text>
                  )}
                {practitioner.bio && (
                  <Text style={styles.practitionerBio} numberOfLines={2}>
                    {practitioner.bio}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 액션 버튼 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator color="#10b981" />
          ) : (
            <Text style={styles.connectButtonText}>한의원 연결</Text>
          )}
        </TouchableOpacity>

        {clinic.reservationEnabled && (
          <TouchableOpacity
            style={styles.reserveButton}
            onPress={handleReservation}
          >
            <Text style={styles.reserveButtonText}>예약하기</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerIcon: {
    width: 72,
    height: 72,
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerIconText: {
    fontSize: 36,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  verifiedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingStar: {
    fontSize: 16,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  specialtyText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  linkText: {
    color: '#10b981',
  },
  hoursItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dayText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    width: 24,
  },
  hoursText: {
    fontSize: 14,
    color: '#374151',
  },
  closedText: {
    fontSize: 14,
    color: '#ef4444',
  },
  descriptionText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  practitionerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 8,
  },
  practitionerAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#10b981',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  practitionerAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  practitionerInfo: {
    flex: 1,
  },
  practitionerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  practitionerSpecialty: {
    fontSize: 14,
    color: '#10b981',
    marginTop: 2,
  },
  practitionerBio: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  connectButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  reserveButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reserveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
