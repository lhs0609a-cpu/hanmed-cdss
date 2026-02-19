/**
 * Celebrity registry - precomputed indices for O(1) lookups
 * Built lazily on first access, cached for the session lifetime
 */
import type { Celebrity, CelebCategory, ConstitutionCode } from './types'
import { CODE_TO_TYPE } from './types'
import { decodeTuples } from './decode'
import type { ConstitutionType } from '@/lib/saju'

// Lazy-loaded data imports
import kpopData from './kpop'
import actorData from './actor'
import athleteData from './athlete'
import globalData from './global'
import historicalData from './historical'
import animeData from './anime'
import dramaData from './drama'
import gameData from './game'
import youtubeData from './youtube'
import { CELEB_IMAGES } from './images'

// ─── Lazy initialization ────────────────────────────

let _all: Celebrity[] | null = null
let _byId: Map<string, Celebrity> | null = null
let _byCategory: Map<CelebCategory, Celebrity[]> | null = null
let _byConstitution: Map<ConstitutionCode, Celebrity[]> | null = null
let _byGroup: Map<string, Celebrity[]> | null = null

function ensureLoaded(): Celebrity[] {
  if (_all) return _all

  _all = [
    ...decodeTuples(kpopData, 'kpop'),
    ...decodeTuples(actorData, 'actor'),
    ...decodeTuples(athleteData, 'athlete'),
    ...decodeTuples(globalData, 'global'),
    ...decodeTuples(historicalData, 'historical'),
    ...decodeTuples(animeData, 'anime'),
    ...decodeTuples(dramaData, 'drama'),
    ...decodeTuples(gameData, 'game'),
    ...decodeTuples(youtubeData, 'youtube'),
  ]

  // Merge image URLs from registry
  for (const c of _all) {
    const url = CELEB_IMAGES[c.id]
    if (url) c.imageUrl = url
  }

  // Build id index
  _byId = new Map()
  for (const c of _all) _byId.set(c.id, c)

  // Build category index
  _byCategory = new Map()
  for (const c of _all) {
    const arr = _byCategory.get(c.category) || []
    arr.push(c)
    _byCategory.set(c.category, arr)
  }

  // Build constitution index
  _byConstitution = new Map()
  for (const c of _all) {
    const arr = _byConstitution.get(c.constitution) || []
    arr.push(c)
    _byConstitution.set(c.constitution, arr)
  }

  // Build group index
  _byGroup = new Map()
  for (const c of _all) {
    if (c.group) {
      const arr = _byGroup.get(c.group) || []
      arr.push(c)
      _byGroup.set(c.group, arr)
    }
  }

  return _all
}

// ─── Public API ─────────────────────────────────────

/** All celebrities */
export function getAllCelebrities(): Celebrity[] {
  return ensureLoaded()
}

/** By category */
export function getCelebritiesByCategory(category: CelebCategory): Celebrity[] {
  ensureLoaded()
  return _byCategory!.get(category) || []
}

/** By group */
export function getCelebritiesByGroup(group: string): Celebrity[] {
  ensureLoaded()
  return _byGroup!.get(group) || []
}

/** By ID */
export function getCelebrityById(id: string): Celebrity | undefined {
  ensureLoaded()
  return _byId!.get(id)
}

/** Search (name, nameEn, group, tags) */
export function searchCelebrities(query: string): Celebrity[] {
  const q = query.toLowerCase().trim()
  if (!q) return ensureLoaded()
  return ensureLoaded().filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
    (c.group && c.group.toLowerCase().includes(q)) ||
    c.tags.some(t => t.toLowerCase().includes(q))
  )
}

/** By constitution type (O(1) via precomputed index) */
export function getCelebsByConstitution(type: ConstitutionType): Celebrity[] {
  ensureLoaded()
  const code = (Object.entries(CODE_TO_TYPE) as [ConstitutionCode, ConstitutionType][])
    .find(([, v]) => v === type)?.[0]
  if (!code) return []
  return _byConstitution!.get(code) || []
}

/** By constitution code (O(1) via precomputed index) */
export function getCelebsByCode(code: ConstitutionCode): Celebrity[] {
  ensureLoaded()
  return _byConstitution!.get(code) || []
}

/** Category list */
export function getCategories(): CelebCategory[] {
  return ['kpop', 'actor', 'athlete', 'global', 'historical', 'anime', 'drama', 'game', 'youtube']
}

/** Total count */
export function getTotalCount(): number {
  return ensureLoaded().length
}

/** Category counts */
export function getCategoryCounts(): Record<CelebCategory, number> {
  ensureLoaded()
  const counts = {} as Record<CelebCategory, number>
  for (const cat of getCategories()) {
    counts[cat] = _byCategory!.get(cat)?.length || 0
  }
  return counts
}

/** Group list */
export function getGroups(): string[] {
  ensureLoaded()
  return Array.from(_byGroup!.keys()).sort()
}
