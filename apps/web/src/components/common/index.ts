// Common Components Export

// Medical & Legal
export {
  MedicalDisclaimer,
  AIResultDisclaimer,
  PrescriptionDisclaimer,
} from './MedicalDisclaimer'

// AI Status & Warnings
export {
  AIWarning,
  AIConfidenceBadge,
  AIStatusIndicator,
} from './AIWarning'

// Safety & Reporting
export {
  AdverseReactionReport,
  AdverseReactionButton,
} from './AdverseReactionReport'

// UI Components
export { default as Loader } from './Loader'
export { AnalysisProgress, LoadingWithTime } from './AnalysisProgress'
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonListItem,
  SkeletonTable,
  SkeletonProfile,
  SkeletonStatCard,
  SkeletonDashboard,
  SkeletonCaseCard,
  SkeletonSearchResults,
} from './Skeleton'
export { default as Modal } from './Modal'
export { default as PageGuide } from './PageGuide'
export { default as TourGuide } from './TourGuide'
export { PageTransition } from './PageTransition'
export { KeyboardShortcutsProvider } from './KeyboardShortcuts'

// Error Handling
export { ErrorBoundary, PageErrorBoundary } from './ErrorBoundary'

// Empty States
export {
  EmptyState,
  SearchEmptyState,
  NoDataEmptyState,
  NoPatientsEmptyState,
  NoCasesEmptyState,
  ErrorEmptyState,
} from './EmptyState'

// Error Messages
export {
  ErrorMessage,
  NetworkErrorMessage,
  PermissionErrorMessage,
  UpgradeRequiredMessage,
  UsageLimitMessage,
  SuccessMessage,
  ServerErrorMessage,
  DataLoadErrorMessage,
  AIAnalysisErrorMessage,
  NoResultsMessage,
  ValidationErrorMessage,
  SessionExpiredMessage,
  PaymentErrorMessage,
  MaintenanceMessage,
  ERROR_MESSAGES,
  getErrorMessage,
} from './ErrorMessage'

// Usage Limit Modal
export { UsageLimitModal } from './UsageLimitModal'

// Medical Term Tooltips
export {
  TermTooltip,
  TermBadge,
  SimplifiedLabel,
  MEDICAL_TERMS,
} from './TermTooltip'

// Responsive Utilities
export {
  ResponsiveContainer,
  ResponsiveGrid,
  HorizontalScrollList,
  MobileCard,
  ResponsiveRender,
  touchTargetSize,
  safeAreaInsets,
} from './ResponsiveContainer'

// Search Category Filter
export {
  SearchCategoryFilter,
  InlineSearchFilter,
  DEFAULT_SEARCH_CATEGORIES,
  type SearchCategory,
} from './SearchCategoryFilter'
