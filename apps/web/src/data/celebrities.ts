/**
 * Backward-compatible facade
 * Re-exports from the new celebs/ module
 * All existing import paths continue to work unchanged.
 */
export type { CelebCategory, CelebrityRaw, Celebrity } from './celebs'
export { CATEGORY_INFO } from './celebs'

export {
  getAllCelebrities,
  getCelebritiesByCategory,
  getCelebritiesByGroup,
  getCelebrityById,
  searchCelebrities,
  getCategories,
  getTotalCount,
  getGroups,
  getCelebsByConstitution,
  getCelebsByCode,
  getCategoryCounts,
} from './celebs'
