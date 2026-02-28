import { TFile } from 'obsidian'
import type { App } from 'obsidian'

/**
 * Find a file in the sync folder that has a matching brainfeed_id
 * in its YAML frontmatter, using the MetadataCache for fast lookups.
 */
export function findFileByBrainfeedId(
  app: App,
  syncFolder: string,
  brainfeedId: string,
): TFile | null {
  const folder = app.vault.getAbstractFileByPath(syncFolder)
  if (!folder) return null

  const files = app.vault.getMarkdownFiles().filter(
    (f) => f.path.startsWith(syncFolder + '/'),
  )

  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file)
    const id = cache?.frontmatter?.brainfeed_id
    if (id != null && String(id) === brainfeedId) return file
  }

  return null
}

/**
 * Extract the brainfeed_id from a file's frontmatter.
 */
export function extractBrainfeedId(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const frontmatter = match[1]
  const idMatch = frontmatter.match(/brainfeed_id:\s*(.+)/)
  if (!idMatch) return null

  return idMatch[1].trim().replace(/^["']|["']$/g, '')
}
