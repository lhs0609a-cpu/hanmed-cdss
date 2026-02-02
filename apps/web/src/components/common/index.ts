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
  SkeletonAIResponse,
  SkeletonForm,
  SkeletonSubscriptionPage,
  SkeletonConsultationPage,
  SkeletonPatientList,
  SkeletonHerbDetail,
  SkeletonPostList,
  SkeletonShimmer,
  SkeletonPageWrapper,
} from './Skeleton'
export { default as Modal } from './Modal'
export { default as PageGuide } from './PageGuide'
export { default as TourGuide } from './TourGuide'
export { PageTransition } from './PageTransition'
export { KeyboardShortcutsProvider, KeyboardHint, KeyboardShortcutsHelp, CommandPalette } from './KeyboardShortcuts'

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

// Medical Term Tooltips & Glossary
export {
  TermTooltip,
  TermBadge,
  SimplifiedLabel,
  GlossaryModal,
  GlossaryButton,
  GlossaryText,
  MEDICAL_TERMS,
  TERM_CATEGORIES,
} from './TermTooltip'

// Responsive Utilities & Mobile Components
export {
  ResponsiveContainer,
  ResponsiveGrid,
  HorizontalScrollList,
  MobileCard,
  ResponsiveRender,
  touchTargetSize,
  safeAreaInsets,
  // Mobile gesture & touch components
  useSwipeGesture,
  SwipeableCard,
  TouchFriendlyButton,
  SwipeCarousel,
  PullToRefresh,
} from './ResponsiveContainer'

// Search Category Filter
export {
  SearchCategoryFilter,
  InlineSearchFilter,
  DEFAULT_SEARCH_CATEGORIES,
  type SearchCategory,
} from './SearchCategoryFilter'

// Export Dialog
export { ExportDialog } from './ExportDialog'

// Theme Toggle
export { ThemeToggle, ThemeToggleSimple } from './ThemeToggle'

// Language Toggle
export { LanguageToggle, LanguageToggleSimple } from './LanguageToggle'

// Accessibility Components
export {
  VisuallyHidden,
  SkipToContent,
  LiveRegion,
} from './VisuallyHidden'

// Onboarding
export { WelcomeModal } from './WelcomeModal'

// Offline Status
export { OfflineBanner } from './OfflineBanner'
