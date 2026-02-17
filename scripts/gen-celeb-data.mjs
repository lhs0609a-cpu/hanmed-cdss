#!/usr/bin/env node
/**
 * Celebrity data generator
 * Reads raw data from scripts/raw/*.mjs, computes constitution codes, writes final .ts files
 * Usage: node scripts/gen-celeb-data.mjs
 */
import { cc } from './compute-constitution.mjs'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../apps/web/src/data/celebs/')

// Import raw data modules
const CATEGORIES = ['kpop', 'actor', 'athlete', 'global', 'historical', 'anime', 'drama', 'game', 'youtube']

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  let totalCount = 0

  for (const cat of CATEGORIES) {
    let rawModule
    try {
      rawModule = await import(`./raw/${cat}.mjs`)
    } catch (e) {
      console.error(`  SKIP ${cat}: ${e.message}`)
      // Write empty file
      writeFileSync(
        resolve(OUT_DIR, `${cat}.ts`),
        `import type { CelebTuple } from './types'\n\nconst data: CelebTuple[] = []\n\nexport default data\n`
      )
      continue
    }

    const raw = rawModule.default
    if (!Array.isArray(raw) || raw.length === 0) {
      console.error(`  SKIP ${cat}: no data`)
      writeFileSync(
        resolve(OUT_DIR, `${cat}.ts`),
        `import type { CelebTuple } from './types'\n\nconst data: CelebTuple[] = []\n\nexport default data\n`
      )
      continue
    }

    const ids = new Set()
    const lines = []
    let dupes = 0

    for (const tuple of raw) {
      const id = tuple[0]
      if (ids.has(id)) { dupes++; continue }
      ids.add(id)

      const birthDate = tuple[3]
      const birthHour = tuple[4] ?? null
      let code
      try {
        code = cc(birthDate, birthHour)
      } catch {
        code = 'E' // fallback to taeeum
      }

      // Insert constitution code at index 7
      const final = [...tuple.slice(0, 7), code, ...tuple.slice(7)]
      lines.push(`  ${JSON.stringify(final)},`)
    }

    const content = [
      `import type { CelebTuple } from './types'`,
      ``,
      `const data: CelebTuple[] = [`,
      ...lines,
      `]`,
      ``,
      `export default data`,
      ``,
    ].join('\n')

    writeFileSync(resolve(OUT_DIR, `${cat}.ts`), content)
    totalCount += lines.length
    console.log(`  ${cat}: ${lines.length} entries` + (dupes ? ` (${dupes} dupes removed)` : ''))
  }

  console.log(`\nTotal: ${totalCount} celebrities across ${CATEGORIES.length} categories`)
}

main().catch(e => { console.error(e); process.exit(1) })
