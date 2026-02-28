import { TFile, Vault } from 'obsidian'

/**
 * Find a file in the sync folder that has a matching brainfeed_id
 * in its YAML frontmatter.
 */
export async function findFileByBrainfeedId(
  vault: Vault,
  syncFolder: string,
  brainfeedId: string,
): Promise<TFile | null> {
  const folder = vault.getAbstractFileByPath(syncFolder)
  if (!folder) return null

  const files = vault.getMarkdownFiles().filter(
    (f) => f.path.startsWith(syncFolder + '/'),
  )

  for (const file of files) {
    const content = await vault.cachedRead(file)
    const match = content.match(/^---\n([\s\S]*?)\n---/)
    if (!match) continue

    const frontmatter = match[1]
    const idMatch = frontmatter.match(/brainfeed_id:\s*(.+)/)
    if (idMatch) {
      const id = idMatch[1].trim().replace(/^["']|["']$/g, '')
      if (id === brainfeedId) return file
    }
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
