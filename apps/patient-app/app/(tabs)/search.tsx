import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { searchClinics, getMyClinics } from '../../src/services/clinicService';
import { useClinicStore } from '../../src/stores/clinicStore';
import type { Clinic, ClinicSearchParams } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SortOption = 'distance' | 'rating' | 'reviewCount' | 'name';

// 한의원 아이콘 SVG
function ClinicIcon({ size = 48, isVerified = false }: { size?: number; isVerified?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="clinicGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={isVerified ? '#10B981' : '#6B7280'} />
          <Stop offset="1" stopColor={isVerified ? '#059669' : '#4B5563'} />
        </LinearGradient>
      </Defs>
      {/* 건물 */}
      <Rect x="8" y="16" width="32" height="28" rx="2" fill="url(#clinicGrad)" />
      {/* 지붕 */}
      <Path d="M4 18 L24 6 L44 18" stroke={isVerified ? '#10B981' : '#6B7280'} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* 창문들 */}
      <Rect x="12" y="22" width="8" height="8" rx="1" fill="#FFFFFF" opacity="0.9" />
      <Rect x="28" y="22" width="8" height="8" rx="1" fill="#FFFFFF" opacity="0.9" />
      {/* 문 */}
      <Rect x="18" y="32" width="12" height="12" rx="1" fill="#FFFFFF" opacity="0.9" />
      {/* 십자가 (한의원 표시) */}
      <Rect x="22" y="35" width="4" height="8" fill={isVerified ? '#10B981' : '#6B7280'} />
      <Rect x="20" y="37" width="8" height="4" fill={isVerified ? '#10B981' : '#6B7280'} />
    </Svg>
  );
}

// 별점 표시 컴포넌트
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[...Array(fullStars)].map((_, i) => (
        <Ionicons key={`full-${i}`} name="star" size={size} color="#FBBF24" />
      ))}
      {hasHalfStar && <Ionicons name="star-half" size={size} color="#FBBF24" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#D1D5DB" />
      ))}
    </View>
  );
}

// 영업 상태 계산
function getOperatingStatus(operatingHours?: Record<string, any>): {
  status: 'open' | 'closing_soon' | 'closed' | 'unknown';
  text: string;
  color: string;
} {
  if (!operatingHours) {
    return { status: 'unknown', text: '영업정보 없음', color: '#9CA3AF' };
  }

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todayHours = operatingHours[today];
  if (!todayHours || todayHours.closed) {
    return { status: 'closed', text: '오늘 휴무', color: '#EF4444' };
  }

  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  if (currentTime < openTime) {
    return { status: 'closed', text: `${todayHours.open} 오픈`, color: '#6B7280' };
  }

  if (currentTime >= closeTime) {
    return { status: 'closed', text: '영업 종료', color: '#EF4444' };
  }

  const minutesUntilClose = closeTime - currentTime;
  if (minutesUntilClose <= 60) {
    return { status: 'closing_soon', text: `${minutesUntilClose}분 후 마감`, color: '#F59E0B' };
  }

  return { status: 'open', text: '영업 중', color: '#10B981' };
}

// 거리 포맷팅
function formatDistance(distance?: number): string {
  if (distance === undefined) return '';
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
}

// 전문 분야 아이콘
function getSpecialtyIcon(specialty: string): string {
  const iconMap: Record<string, string> = {
    '침구': 'fitness-outline',
    '한방내과': 'body-outline',
    '한방부인과': 'heart-outline',
    '한방소아과': 'happy-outline',
    '한방신경정신과': 'brain-outline',
    '한방안이비인후피부과': 'eye-outline',
    '추나': 'hand-left-outline',
    '사상체질': 'people-outline',
    '다이어트': 'scale-outline',
    '피부': 'sparkles-outline',
  };
  return iconMap[specialty] || 'medical-outline';
}

export default function SearchScreen() {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [searchParams, setSearchParams] = useState<ClinicSearchParams>({
    page: 1,
    limit: 20,
    sortBy: 'distance',
  });
  const [showSortOptions, setShowSortOptions] = useState(false);

  const { setSearchResults, setIsSearching } = useClinicStore();

  // 위치 권한 및 현재 위치 가져오기
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setSearchParams((prev) => ({
          ...prev,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }));
      }
    })();
  }, []);

  // 내 한의원 목록
  const { data: myClinics } = useQuery({
    queryKey: ['myClinics'],
    queryFn: getMyClinics,
  });

  // 검색 쿼리
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['clinics', searchParams],
    queryFn: () => searchClinics(searchParams),
  });

  useEffect(() => {
    if (data) {
      setSearchResults(data.data, data.meta);
    }
  }, [data]);

  // 통계 계산
  const stats = useMemo(() => {
    const clinics = data?.data || [];
    const total = data?.meta?.total || 0;
    const verified = clinics.filter(c => c.isHanmedVerified).length;
    const nearby = clinics.filter(c => c.distance !== undefined && c.distance < 3).length;
    const avgRating = clinics.length > 0
      ? clinics.reduce((sum, c) => sum + (c.ratingAverage || 0), 0) / clinics.length
      : 0;

    return { total, verified, nearby, avgRating };
  }, [data]);

  const handleSearch = useCallback(() => {
    setSearchParams((prev) => ({
      ...prev,
      keyword: keyword || undefined,
      page: 1,
    }));
  }, [keyword]);

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setSearchParams((prev) => ({
      ...prev,
      sortBy: newSort,
      page: 1,
    }));
    setShowSortOptions(false);
  };

  const handleLoadMore = () => {
    if (data && data.meta.page < data.meta.totalPages) {
      setSearchParams((prev) => ({
        ...prev,
        page: prev.page! + 1,
      }));
    }
  };

  const sortOptions: { key: SortOption; label: string; icon: string }[] = [
    { key: 'distance', label: '거리순', icon: 'location-outline' },
    { key: 'rating', label: '평점순', icon: 'star-outline' },
    { key: 'reviewCount', label: '리뷰순', icon: 'chatbubbles-outline' },
    { key: 'name', label: '이름순', icon: 'text-outline' },
  ];

  const renderClinicCard = ({ item }: { item: Clinic }) => {
    const operatingStatus = getOperatingStatus(item.operatingHours);
    const isMyClinic = myClinics?.some(c => c.id === item.id);

    return (
      <TouchableOpacity
        style={styles.clinicCard}
        onPress={() => router.push(`/clinic/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* 카드 헤더 */}
        <View style={styles.cardHeader}>
          <View style={styles.clinicIconContainer}>
            <ClinicIcon size={52} isVerified={item.isHanmedVerified} />
            {isMyClinic && (
              <View style={styles.myClinicBadge}>
                <Ionicons name="heart" size={10} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.clinicMainInfo}>
            <View style={styles.clinicNameRow}>
              <Text style={styles.clinicName} numberOfLines={1}>{item.name}</Text>
              {item.isHanmedVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
                  <Text style={styles.verifiedText}>인증</Text>
                </View>
              )}
            </View>

            <View style={styles.ratingRow}>
              <StarRating rating={item.ratingAverage || 0} size={12} />
              <Text style={styles.ratingText}>{(item.ratingAverage || 0).toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({item.reviewCount || 0})</Text>
            </View>

            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.addressRoad || '주소 정보 없음'}
              </Text>
            </View>
          </View>

          {/* 거리 & 영업상태 */}
          <View style={styles.distanceContainer}>
            {item.distance !== undefined && (
              <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: operatingStatus.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: operatingStatus.color }]} />
              <Text style={[styles.statusText, { color: operatingStatus.color }]}>
                {operatingStatus.text}
              </Text>
            </View>
          </View>
        </View>

        {/* 전문 분야 */}
        {item.specialties && item.specialties.length > 0 && (
          <View style={styles.specialtiesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {item.specialties.map((specialty, index) => (
                <View key={index} style={styles.specialtyChip}>
                  <Ionicons
                    name={getSpecialtyIcon(specialty) as any}
                    size={12}
                    color="#10B981"
                  />
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 카드 푸터 */}
        <View style={styles.cardFooter}>
          {item.reservationEnabled ? (
            <TouchableOpacity
              style={styles.reserveButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/clinic/${item.id}?tab=reservation`);
              }}
            >
              <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
              <Text style={styles.reserveButtonText}>예약하기</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noReserveBadge}>
              <Ionicons name="call-outline" size={14} color="#6B7280" />
              <Text style={styles.noReserveText}>전화 예약</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => router.push(`/clinic/${item.id}`)}
          >
            <Text style={styles.detailButtonText}>상세보기</Text>
            <Ionicons name="chevron-forward" size={14} color="#10B981" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* 통계 카드 */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="business-outline" size={20} color="#6366F1" />
          </View>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>전체</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="location-outline" size={20} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{stats.nearby}</Text>
          <Text style={styles.statLabel}>3km 이내</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{stats.verified}</Text>
          <Text style={styles.statLabel}>인증</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="star-outline" size={20} color="#EF4444" />
          </View>
          <Text style={styles.statValue}>{stats.avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>평균</Text>
        </View>
      </View>

      {/* 내 한의원 섹션 */}
      {myClinics && myClinics.length > 0 && (
        <View style={styles.myClinicsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="heart" size={16} color="#EF4444" />
              <Text style={styles.sectionTitle}>내 한의원</Text>
            </View>
            <Text style={styles.sectionCount}>{myClinics.length}곳</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {myClinics.map((clinic) => (
              <TouchableOpacity
                key={clinic.id}
                style={styles.myClinicCard}
                onPress={() => router.push(`/clinic/${clinic.id}`)}
              >
                <ClinicIcon size={36} isVerified={clinic.isHanmedVerified} />
                <Text style={styles.myClinicName} numberOfLines={1}>{clinic.name}</Text>
                <View style={styles.myClinicRating}>
                  <Ionicons name="star" size={10} color="#FBBF24" />
                  <Text style={styles.myClinicRatingText}>
                    {(clinic.ratingAverage || 0).toFixed(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 결과 헤더 */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          검색결과 <Text style={styles.resultsCountHighlight}>{data?.meta?.total || 0}</Text>곳
        </Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortOptions(!showSortOptions)}
        >
          <Ionicons name="swap-vertical-outline" size={16} color="#6B7280" />
          <Text style={styles.sortButtonText}>
            {sortOptions.find(o => o.key === sortBy)?.label}
          </Text>
          <Ionicons
            name={showSortOptions ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* 정렬 옵션 */}
      {showSortOptions && (
        <View style={styles.sortOptionsContainer}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                sortBy === option.key && styles.sortOptionActive,
              ]}
              onPress={() => handleSortChange(option.key)}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={sortBy === option.key ? '#10B981' : '#6B7280'}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.key && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.key && (
                <Ionicons name="checkmark" size={16} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 헤더 */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>한의원 찾기</Text>
          {location && (
            <View style={styles.locationBadge}>
              <Ionicons name="navigate" size={12} color="#10B981" />
              <Text style={styles.locationText}>현재 위치 기반</Text>
            </View>
          )}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="한의원 이름, 지역, 전문 분야 검색"
              placeholderTextColor="#9CA3AF"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {keyword.length > 0 && (
              <TouchableOpacity onPress={() => setKeyword('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 필터 칩 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              searchParams.hanmedVerifiedOnly && styles.filterChipActive,
            ]}
            onPress={() =>
              setSearchParams((prev) => ({
                ...prev,
                hanmedVerifiedOnly: !prev.hanmedVerifiedOnly,
                page: 1,
              }))
            }
          >
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={searchParams.hanmedVerifiedOnly ? '#10B981' : '#6B7280'}
            />
            <Text
              style={[
                styles.filterText,
                searchParams.hanmedVerifiedOnly && styles.filterTextActive,
              ]}
            >
              HanMed 인증
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              searchParams.reservationEnabledOnly && styles.filterChipActive,
            ]}
            onPress={() =>
              setSearchParams((prev) => ({
                ...prev,
                reservationEnabledOnly: !prev.reservationEnabledOnly,
                page: 1,
              }))
            }
          >
            <Ionicons
              name="calendar"
              size={14}
              color={searchParams.reservationEnabledOnly ? '#10B981' : '#6B7280'}
            />
            <Text
              style={[
                styles.filterText,
                searchParams.reservationEnabledOnly && styles.filterTextActive,
              ]}
            >
              온라인 예약
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.filterText}>영업 중</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <Ionicons name="medical-outline" size={14} color="#6B7280" />
            <Text style={styles.filterText}>전문 분야</Text>
            <Ionicons name="chevron-down" size={12} color="#6B7280" />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 결과 목록 */}
      <FlatList
        data={data?.data || []}
        renderItem={renderClinicCard}
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              <Text style={styles.emptySubtext}>
                다른 검색어나 필터를 시도해보세요
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  setKeyword('');
                  setSearchParams((prev) => ({
                    ...prev,
                    keyword: undefined,
                    hanmedVerifiedOnly: undefined,
                    reservationEnabledOnly: undefined,
                    page: 1,
                  }));
                }}
              >
                <Ionicons name="refresh-outline" size={16} color="#10B981" />
                <Text style={styles.emptyButtonText}>필터 초기화</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          isFetching && data ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color="#10B981" />
              <Text style={styles.loadingMoreText}>더 불러오는 중...</Text>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#10B981',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScroll: {
    marginTop: 12,
  },
  filtersContent: {
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#10B981',
  },
  listContent: {
    paddingBottom: 24,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
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
  myClinicsSection: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sectionCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  myClinicCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 100,
  },
  myClinicName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  myClinicRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  myClinicRatingText: {
    fontSize: 11,
    color: '#6B7280',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultsCountHighlight: {
    fontWeight: '600',
    color: '#10B981',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  sortOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sortOptionActive: {
    backgroundColor: '#ECFDF5',
  },
  sortOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  sortOptionTextActive: {
    color: '#10B981',
    fontWeight: '500',
  },
  clinicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  clinicIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  myClinicBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  clinicMainInfo: {
    flex: 1,
  },
  clinicNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  distanceContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  specialtiesContainer: {
    marginTop: 12,
    marginLeft: 64,
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  specialtyText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  reserveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noReserveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  noReserveText: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailButtonText: {
    fontSize: 13,
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
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  loadingMoreText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
