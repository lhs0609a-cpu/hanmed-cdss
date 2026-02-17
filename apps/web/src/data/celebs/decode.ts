import type { CelebTuple, Celebrity, CelebCategory } from './types'

/** Decode a tuple array into Celebrity objects for a given category */
export function decodeTuples(tuples: CelebTuple[], category: CelebCategory): Celebrity[] {
  return tuples.map(t => {
    const obj: Celebrity = {
      id: t[0],
      name: t[1],
      birthDate: t[3],
      category,
      emoji: t[6],
      constitution: t[7],
      tags: t.slice(8) as string[],
    }
    if (t[2] != null) obj.nameEn = t[2]
    if (t[4] != null) obj.birthHour = t[4]
    if (t[5] != null) obj.group = t[5]
    return obj
  })
}
