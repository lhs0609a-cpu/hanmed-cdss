/**
 * Celebrity data module - public API
 * Drop-in replacement for the old celebrities.ts
 */
export type { CelebCategory, CelebrityRaw, Celebrity, ConstitutionCode, CelebTuple } from './types'
export { CATEGORY_INFO, CODE_TO_TYPE } from './types'

export {
  getAllCelebrities,
  getCelebritiesByCategory,
  getCelebritiesByGroup,
  getCelebrityById,
  searchCelebrities,
  getCelebsByConstitution,
  getCelebsByCode,
  getCategories,
  getTotalCount,
  getCategoryCounts,
  getGroups,
} from './registry'
