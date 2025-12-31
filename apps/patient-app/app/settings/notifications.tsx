import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import {
  getNotificationSettings,
  updateNotificationSettings,
  NotificationSettings,
} from '../../src/services/notificationService';

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemPermission, setSystemPermission] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings();
    checkSystemPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getNotificationSettings();
      setSettings(data);
    } catch (error) {
      console.error('설정 로드 실패:', error);
      Alert.alert('오류', '알림 설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const checkSystemPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setSystemPermission(status === 'granted');
  };

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;

    // 시스템 권한이 없으면 먼저 권한 요청
    if (value && !systemPermission) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '알림 권한 필요',
          '푸시 알림을 받으려면 시스템 설정에서 알림을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setSystemPermission(true);
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      setSaving(true);
      await updateNotificationSettings({ [key]: value });
    } catch (error) {
      console.error('설정 저장 실패:', error);
      // 롤백
      setSettings(settings);
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const openSystemSettings = () => {
    Linking.openSettings();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
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
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={styles.headerRight}>
          {saving && <ActivityIndicator size="small" color="#10B981" />}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* 시스템 권한 상태 */}
        {systemPermission === false && (
          <TouchableOpacity style={styles.warningBanner} onPress={openSystemSettings}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <Text style={styles.warningText}>
              시스템 알림이 꺼져 있습니다. 탭하여 설정에서 켜주세요.
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* 알림 유형별 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 유형</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="calendar" size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.settingLabel}>예약 알림</Text>
                <Text style={styles.settingDescription}>예약 확인 및 리마인더</Text>
              </View>
            </View>
            <Switch
              value={settings?.reservationEnabled ?? true}
              onValueChange={(value) => handleToggle('reservationEnabled', value)}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={settings?.reservationEnabled ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="medical" size={20} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.settingLabel}>복약 알림</Text>
                <Text style={styles.settingDescription}>복약 시간 알림</Text>
              </View>
            </View>
            <Switch
              value={settings?.medicationEnabled ?? true}
              onValueChange={(value) => handleToggle('medicationEnabled', value)}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={settings?.medicationEnabled ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="document-text" size={20} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.settingLabel}>진료 기록 알림</Text>
                <Text style={styles.settingDescription}>진료 기록 및 처방 공유</Text>
              </View>
            </View>
            <Switch
              value={settings?.recordEnabled ?? true}
              onValueChange={(value) => handleToggle('recordEnabled', value)}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={settings?.recordEnabled ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="leaf" size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.settingLabel}>건강 팁</Text>
                <Text style={styles.settingDescription}>건강 관리 및 양생 조언</Text>
              </View>
            </View>
            <Switch
              value={settings?.healthTipEnabled ?? true}
              onValueChange={(value) => handleToggle('healthTipEnabled', value)}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={settings?.healthTipEnabled ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="megaphone" size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.settingLabel}>프로모션 알림</Text>
                <Text style={styles.settingDescription}>이벤트 및 할인 정보</Text>
              </View>
            </View>
            <Switch
              value={settings?.promotionEnabled ?? false}
              onValueChange={(value) => handleToggle('promotionEnabled', value)}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={settings?.promotionEnabled ? '#10B981' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* 방해 금지 시간 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>방해 금지</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              Alert.alert('준비 중', '방해 금지 시간 설정 기능이 곧 추가됩니다.');
            }}
          >
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="moon" size={20} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.settingLabel}>방해 금지 시간</Text>
                <Text style={styles.settingDescription}>
                  {settings?.quietHoursStart && settings?.quietHoursEnd
                    ? `${settings.quietHoursStart} - ${settings.quietHoursEnd}`
                    : '설정 안 함'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* 시스템 설정 링크 */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.systemSettingsLink} onPress={openSystemSettings}>
            <Ionicons name="settings-outline" size={20} color="#6B7280" />
            <Text style={styles.systemSettingsText}>시스템 알림 설정으로 이동</Text>
            <Ionicons name="open-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            알림 설정은 앱 알림에만 적용됩니다.{'\n'}
            시스템 알림 설정에서 알림 소리, 진동 등을 변경할 수 있습니다.
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  section: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  systemSettingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  systemSettingsText: {
    fontSize: 15,
    color: '#6B7280',
  },
  footer: {
    padding: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
