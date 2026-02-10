/**
 * 앱 전체 통계를 관리하는 훅
 *
 * - 기본 통계 + 사용자 치험례를 합산
 * - localStorage 변경 시 자동 업데이트
 * - 모든 페이지에서 일관된 숫자 표시
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BASE_STATS,
  MY_CASES_STORAGE_KEY,
  getMyCasesCount,
  formatStatNumber,
  formatStatApprox,
} from '@/config/stats.config';

export interface AppStats {
  // 전체 치험례 (기본 + 사용자)
  totalCases: number;
  // 기본 치험례 (DB)
  baseCases: number;
  // 사용자 치험례
  myCases: number;
  // 처방 수
  formulas: number;
  // 약재 수
  herbs: number;
  // 상호작용 수
  interactions: number;
  // 고전 수
  classics: number;
  // 경혈 수
  acupoints: number;
}

export interface UseAppStatsReturn extends AppStats {
  // 포맷된 문자열
  formatted: {
    totalCases: string;      // "6,000+"
    totalCasesApprox: string; // "6,000건 이상"
    formulas: string;
    herbs: string;
    interactions: string;
  };
  // 리프레시 함수
  refresh: () => void;
}

// 커스텀 이벤트 이름
const STATS_UPDATE_EVENT = 'ongojishin_stats_update';

// 통계 업데이트 이벤트 발생시키기 (다른 컴포넌트에서 호출)
export function notifyStatsUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STATS_UPDATE_EVENT));
  }
}

export function useAppStats(): UseAppStatsReturn {
  const [myCasesCount, setMyCasesCount] = useState(0);

  // 초기 로드 및 업데이트
  const refresh = useCallback(() => {
    setMyCasesCount(getMyCasesCount());
  }, []);

  useEffect(() => {
    // 초기 로드
    refresh();

    // localStorage 변경 감지 (다른 탭에서 변경 시)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MY_CASES_STORAGE_KEY) {
        refresh();
      }
    };

    // 같은 탭에서 발생한 커스텀 이벤트 감지
    const handleCustomEvent = () => {
      refresh();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(STATS_UPDATE_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(STATS_UPDATE_EVENT, handleCustomEvent);
    };
  }, [refresh]);

  const totalCases = BASE_STATS.cases + myCasesCount;

  return {
    totalCases,
    baseCases: BASE_STATS.cases,
    myCases: myCasesCount,
    formulas: BASE_STATS.formulas,
    herbs: BASE_STATS.herbs,
    interactions: BASE_STATS.interactions,
    classics: BASE_STATS.classics,
    acupoints: BASE_STATS.acupoints,
    formatted: {
      totalCases: formatStatNumber(totalCases),
      totalCasesApprox: formatStatApprox(totalCases),
      formulas: formatStatNumber(BASE_STATS.formulas),
      herbs: formatStatNumber(BASE_STATS.herbs),
      interactions: formatStatNumber(BASE_STATS.interactions),
    },
    refresh,
  };
}

// 간단한 통계 상수 export (SSR/비훅 환경용)
export { BASE_STATS, formatStatNumber, formatStatApprox } from '@/config/stats.config';
