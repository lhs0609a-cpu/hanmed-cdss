import type { ConstitutionType } from '@/lib/saju'

export type CelebCategory = 'kpop' | 'actor' | 'athlete' | 'global' | 'historical' | 'anime' | 'drama' | 'game' | 'youtube'

/** Constitution codes: T=taeyang, E=taeeum, S=soyang, U=soeum */
export type ConstitutionCode = 'T' | 'E' | 'S' | 'U'

export const CODE_TO_TYPE: Record<ConstitutionCode, ConstitutionType> = {
  T: 'taeyang',
  E: 'taeeum',
  S: 'soyang',
  U: 'soeum',
}

/**
 * Compact tuple format for celebrity data
 * [id, name, nameEn|null, birthDate, birthHour|null, group|null, emoji, constitutionCode, ...tags]
 */
export type CelebTuple = [
  string,            // 0: id
  string,            // 1: name
  string | null,     // 2: nameEn
  string,            // 3: birthDate (YYYY-MM-DD)
  number | null,     // 4: birthHour (0-23 or null)
  string | null,     // 5: group
  string,            // 6: emoji
  ConstitutionCode,  // 7: precomputed constitution
  ...string[]        // 8+: tags
]

/** Old interface for backward compat */
export interface CelebrityRaw {
  id: string
  name: string
  nameEn?: string
  birthDate: string
  birthHour?: number
  category: CelebCategory
  group?: string
  emoji: string
  tags: string[]
}

/** Extended with precomputed constitution */
export interface Celebrity extends CelebrityRaw {
  constitution: ConstitutionCode
}

export const CATEGORY_INFO: Record<CelebCategory, { label: string; emoji: string; color: string }> = {
  kpop:       { label: 'K-POP',    emoji: '🎤', color: '#ec4899' },
  actor:      { label: '배우',     emoji: '🎬', color: '#8b5cf6' },
  athlete:    { label: '운동선수', emoji: '⚽', color: '#22c55e' },
  global:     { label: '해외',     emoji: '🌍', color: '#3b82f6' },
  historical: { label: '역사',     emoji: '📜', color: '#a16207' },
  anime:      { label: '애니',     emoji: '🎌', color: '#f97316' },
  drama:      { label: '드라마',   emoji: '📺', color: '#06b6d4' },
  game:       { label: '게임',     emoji: '🎮', color: '#6366f1' },
  youtube:    { label: '유튜버',   emoji: '📱', color: '#ef4444' },
}
