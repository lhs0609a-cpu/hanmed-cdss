export { useFormValidation } from './useFormValidation'
export { useKeyboardShortcuts, formatShortcut } from './useKeyboardShortcuts'
export { useToast } from './useToast'
export { useSubscriptionInfo } from './useSubscription'

// Accessibility hooks
export {
  useAnnounce,
  useFocusTrap,
  useKeyboardShortcutAnnounce,
  useLoadingAnnounce,
  useReducedMotion,
  useHighContrast,
  useFocusFirst,
  useErrorAnnounce,
  useFormFieldId,
} from './useAccessibility'

// Network & Export hooks
export { useNetworkStatus } from './useNetworkStatus'
export { useExport } from './useExport'
export { useSEO } from './useSEO'

// App-wide statistics hook
export { useAppStats, notifyStatsUpdate } from './useAppStats'

// Killer Feature hooks - Insurance
export {
  useAutoCreateClaim,
  useInsuranceClaims,
  useInsuranceClaim,
  useUpdateClaim,
  useSubmitClaims,
  useRecordReviewResult,
  useClaimSummary,
  useMissingClaims,
} from './useInsurance'

// Killer Feature hooks - CRM
export {
  useCrmDashboard,
  useCampaigns,
  useCampaign,
  useCampaignAnalytics,
  useCreateCampaign,
  useStartCampaign,
  usePauseCampaign,
  useAutoMessages,
  useCreateAutoMessage,
  useToggleAutoMessage,
  useSegments,
  useCreateSegment,
  useSendMessage,
} from './useCrm'

// Killer Feature hooks - Inventory
export {
  useSuppliers,
  useSupplier,
  useCreateSupplier,
  useInventory,
  useInventorySummary,
  useUpsertInventory,
  useTransactions,
  useRecordTransaction,
  usePriceComparison,
  usePriceHistory,
  useRecordPrice,
  useInventoryAlerts,
  useResolveAlert,
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdateOrderStatus,
  useReceiveOrder,
  useUsageAnalysis,
} from './useInventory'

// Killer Feature hooks - Case Sharing
export {
  useCases,
  useCase,
  useFeaturedCases,
  useSimilarCases,
  useCreateCase,
  useUpdateCase,
  usePublishCase,
  useToggleLike,
  useToggleBookmark,
  useBookmarkedCases,
  useMyCases,
  useCaseComments,
  useCreateComment,
  useExperts,
  useExpert,
  useRequestMentorship,
  useRespondMentorship,
  useMyMentorships,
  useMentorshipRequests,
  useCaseStatistics,
  usePopularTags,
} from './useCaseSharing'

// Killer Feature hooks - Analytics
export {
  useDashboardMetrics,
  useStatistics,
  useBenchmark,
  usePrescriptionPatterns,
  useTrends,
  useTopItems,
  usePatientAnalytics,
  useAIAnalytics,
  useTaxReport,
  useMonthlyReport,
  useTodayActivity,
} from './useAnalytics'

// Killer Feature hooks - Prognosis
export {
  useGeneratePrognosis,
  usePrognosis,
  usePrognosisByRecord,
  usePatientPrognoses,
  useRecordOutcome,
  useSimilarCaseStats,
  usePrognosisReport,
} from './usePrognosis'

// Killer Feature hooks - Patient Insights
export {
  usePatientSymptomSummary,
  usePreVisitAnalysis,
  useAdherenceReport,
  usePatientAlerts,
  usePatientAlertsForPatient,
  useInsightsDashboard,
  useHealthScoreHistory,
  useJournalEntries,
} from './usePatientInsights'

// Cloud Data Sync hooks (Pro+ feature)
export {
  useCloudSync,
  useSyncedData,
  SYNC_KEYS,
} from './useCloudSync'

// Session Management hooks
export {
  useSessionManager,
} from './useSessionManager'

// Feature Tracking / Analytics hooks
export {
  useFeatureTracking,
  setupGlobalErrorTracking,
} from './useFeatureTracking'
