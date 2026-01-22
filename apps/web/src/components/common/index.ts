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
} from './ErrorMessage'

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
