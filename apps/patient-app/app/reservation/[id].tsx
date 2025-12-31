import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReservationById,
  cancelReservation,
} from '../../src/services/reservationService';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getErrorMessage } from '../../src/services/api';
import type { ReservationStatus } from '../../src/types';

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => getReservationById(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelReservation(id!, '환자 요청으로 취소'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation', id] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      Alert.alert('취소 완료', '예약이 취소되었습니다.');
    },
    onError: (error) => {
      Alert.alert('취소 실패', getErrorMessage(error));
    },
  });

  const handleCancel = () => {
    Alert.alert('예약 취소', '정말 예약을 취소하시겠습니까?', [
      { text: '아니오', style: 'cancel' },
      {
        text: '예, 취소합니다',
        style: 'destructive',
        onPress: () => cancelMutation.mutate(),
      },
    ]);
  };

  const handleCall = () => {
    if (reservation?.clinic?.phone) {
      Linking.openURL(`tel:${reservation.clinic.phone}`);
    }
  };

  const getStatusInfo = (status: ReservationStatus) => {
    const statusMap = {
      pending: {
        label: '예약 대기중',
        color: '#fef3c7',
        textColor: '#92400e',
        description: '한의원에서 예약을 확인 중입니다.',
      },
      confirmed: {
        label: '예약 확정',
        color: '#d1fae5',
        textColor: '#065f46',
        description: '예약이 확정되었습니다. 예약 시간에 방문해주세요.',
      },
      cancelled: {
        label: '예약 취소됨',
        color: '#fee2e2',
        textColor: '#991b1b',
        description: '예약이 취소되었습니다.',
      },
      completed: {
        label: '진료 완료',
        color: '#e5e7eb',
        textColor: '#374151',
        description: '진료가 완료되었습니다.',
      },
      no_show: {
        label: '미방문',
        color: '#fee2e2',
        textColor: '#991b1b',
        description: '예약 시간에 방문하지 않으셨습니다.',
      },
    };
    return statusMap[status] || statusMap.pending;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>예약 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const statusInfo = getStatusInfo(reservation.status);
  const canCancel =
    reservation.status === 'pending' || reservation.status === 'confirmed';

  return (
    <ScrollView style={styles.container}>
      {/* 상태 배너 */}
      <View style={[styles.statusBanner, { backgroundColor: statusInfo.color }]}>
        <Text style={[styles.statusLabel, { color: statusInfo.textColor }]}>
          {statusInfo.label}
        </Text>
        <Text style={[styles.statusDescription, { color: statusInfo.textColor }]}>
          {statusInfo.description}
        </Text>
      </View>

      {/* 예약 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>예약 정보</Text>
        <View style={styles.infoCard}>
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateBox}>
              <Text style={styles.dateMonth}>
                {format(new Date(reservation.reservationDate), 'yyyy년 M월', {
                  locale: ko,
                })}
              </Text>
              <Text style={styles.dateDay}>
                {format(new Date(reservation.reservationDate), 'd일 EEEE', {
                  locale: ko,
                })}
              </Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.time}>{reservation.reservationTime}</Text>
              <Text style={styles.duration}>
                ({reservation.durationMinutes}분)
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>방문 유형</Text>
            <Text style={styles.infoValue}>
              {reservation.visitType === 'initial' ? '초진' : '재진'}
            </Text>
          </View>

          {reservation.visitReason && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>방문 사유</Text>
              <Text style={styles.infoValue}>{reservation.visitReason}</Text>
            </View>
          )}

          {reservation.symptomsNote && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>증상 메모</Text>
              <Text style={styles.infoValue}>{reservation.symptomsNote}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 한의원 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>한의원 정보</Text>
        <View style={styles.infoCard}>
          <View style={styles.clinicHeader}>
            <View style={styles.clinicIcon}>
              <Text style={styles.clinicIconText}>🏥</Text>
            </View>
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>
                {reservation.clinic?.name || '한의원'}
              </Text>
              {reservation.practitioner && (
                <Text style={styles.practitionerName}>
                  {reservation.practitioner.name} 원장님
                </Text>
              )}
            </View>
          </View>

          {reservation.clinic?.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>{reservation.clinic.address}</Text>
            </View>
          )}

          {reservation.clinic?.phone && (
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <Text style={styles.infoIcon}>📞</Text>
              <Text style={[styles.infoText, styles.linkText]}>
                {reservation.clinic.phone}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 취소 사유 */}
      {reservation.status === 'cancelled' && reservation.cancellationReason && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>취소 사유</Text>
          <View style={styles.infoCard}>
            <Text style={styles.cancelReason}>
              {reservation.cancellationReason}
            </Text>
          </View>
        </View>
      )}

      {/* 액션 버튼 */}
      <View style={styles.actions}>
        {reservation.clinic?.phone && (
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Text style={styles.callButtonText}>📞 전화하기</Text>
          </TouchableOpacity>
        )}

        {canCancel && (
          <TouchableOpacity
            style={[
              styles.cancelButton,
              cancelMutation.isPending && styles.cancelButtonDisabled,
            ]}
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text style={styles.cancelButtonText}>예약 취소</Text>
            )}
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
  statusBanner: {
    padding: 20,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusDescription: {
    fontSize: 14,
    marginTop: 4,
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
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBox: {},
  dateMonth: {
    fontSize: 14,
    color: '#6b7280',
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  timeBox: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  duration: {
    fontSize: 14,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  clinicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clinicIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clinicIconText: {
    fontSize: 24,
  },
  clinicInfo: {},
  clinicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  practitionerName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  linkText: {
    color: '#10b981',
  },
  cancelReason: {
    fontSize: 14,
    color: '#ef4444',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  callButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
