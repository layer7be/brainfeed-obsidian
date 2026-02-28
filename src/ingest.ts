import { Notice, TFile, Vault } from 'obsidian'
import { extractBrainfeedId } from './frontmatter'
import type { BrainfeedApi } from './api'

/**
 * Push the active file to Brainfeed for summarization.
 */
export async function pushToBrainfeed(
  vault: Vault,
  api: BrainfeedApi,
  file: TFile,
): Promise<void> {
  const content = await vault.read(file)

  // Parse frontmatter to extract title and any existing brainfeed_id
  const existingId = extractBrainfeedId(content)
  if (existingId) {
    new Notice('This note has already been sent to Brainfeed')
    return
  }

  // Extract title from frontmatter or filename
  let title = file.basename
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/title:\s*["']?(.+?)["']?\s*$/)
    if (titleMatch) {
      title = titleMatch[1]
    }
  }

  // Strip frontmatter from content for the body
  const body = fmMatch
    ? content.slice(fmMatch[0].length).trim()
    : content

  // Extract tags from frontmatter
  const tags: string[] = []
  if (fmMatch) {
    const tagsMatch = fmMatch[1].match(/tags:\s*\n((?:\s+-\s*.+\n?)*)/)
    if (tagsMatch) {
      const tagLines = tagsMatch[1].match(/-\s*(.+)/g)
      if (tagLines) {
        for (const line of tagLines) {
          const tag = line.replace(/^-\s*/, '').trim().replace(/^["']|["']$/g, '')
          if (tag) tags.push(tag)
        }
      }
    }
  }

  const result = await api.ingest({ title, content: body, tags })

  // Update frontmatter with brainfeed_id
  if (fmMatch) {
    const updatedFrontmatter = fmMatch[1] + `\nbrainfeed_id: ${result.contentId}`
    const updatedContent = `---\n${updatedFrontmatter}\n---${content.slice(fmMatch[0].length)}`
    await vault.modify(file, updatedContent)
  } else {
    const newContent = `---\nbrainfeed_id: ${result.contentId}\n---\n\n${content}`
    await vault.modify(file, newContent)
  }

  new Notice(
    result.isNew
      ? 'Note sent to Brainfeed for summarization'
      : 'Note already exists in Brainfeed',
  )
}
