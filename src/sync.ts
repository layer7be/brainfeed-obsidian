import { Notice, normalizePath } from 'obsidian'
import { findFileByBrainfeedId } from './frontmatter'
import { slugify } from './utils'
import type { App } from 'obsidian'
import type { BrainfeedApi, ExportScope, SyncItem } from './api'

export interface SyncResult {
  created: number
  updated: number
  errors: number
}

/**
 * Pull sync: fetch changed items from Brainfeed and create/update
 * markdown files in the sync folder.
 */
export async function pullSync(
  app: App,
  api: BrainfeedApi,
  syncFolder: string,
  scope: ExportScope,
  lastSyncTimestamp: number,
): Promise<{ result: SyncResult; newTimestamp: number }> {
  // Ensure sync folder exists
  const folderExists = app.vault.getAbstractFileByPath(syncFolder)
  if (!folderExists) {
    await app.vault.createFolder(syncFolder)
  }

  const result: SyncResult = { created: 0, updated: 0, errors: 0 }
  let maxTimestamp = lastSyncTimestamp

  // Paginate through all changed items
  let hasMore = true
  let since = lastSyncTimestamp

  while (hasMore) {
    const syncResponse = await api.syncList(since)
    const items = syncResponse.items

    for (const item of items) {
      try {
        await syncItem(app, api, syncFolder, scope, item)

        if (item.updatedAt > maxTimestamp) {
          maxTimestamp = item.updatedAt
        }

        // Check if file existed
        const existingFile = findFileByBrainfeedId(
          app,
          syncFolder,
          item.id,
        )
        if (existingFile) {
          result.updated++
        } else {
          result.created++
        }
      } catch (err) {
        console.error(`[brainfeed] Failed to sync item ${item.id}:`, err)
        result.errors++
      }
    }

    hasMore = syncResponse.hasMore
    if (syncResponse.nextCursor !== null) {
      since = syncResponse.nextCursor
    } else {
      hasMore = false
    }
  }

  return { result, newTimestamp: maxTimestamp }
}

async function syncItem(
  app: App,
  api: BrainfeedApi,
  syncFolder: string,
  scope: ExportScope,
  item: SyncItem,
): Promise<void> {
  // Fetch full content as markdown
  const content = await api.getContent(item.id, scope)

  // Check if a file already exists for this brainfeed_id
  const existingFile = findFileByBrainfeedId(
    app,
    syncFolder,
    item.id,
  )

  if (existingFile) {
    // Update existing file
    await app.vault.process(existingFile, () => content.markdown)
  } else {
    // Create new file
    const fileName = `${slugify(item.title) || item.id}.md`
    const filePath = normalizePath(`${syncFolder}/${fileName}`)

    // Avoid name collisions
    let finalPath = filePath
    let counter = 1
    while (app.vault.getAbstractFileByPath(finalPath)) {
      finalPath = normalizePath(
        `${syncFolder}/${slugify(item.title) || item.id}-${counter}.md`,
      )
      counter++
    }

    await app.vault.create(finalPath, content.markdown)
  }
}

/** Show a summary notice after sync completes. */
export function showSyncNotice(result: SyncResult): void {
  const parts: string[] = []
  if (result.created > 0) parts.push(`${result.created} new`)
  if (result.updated > 0) parts.push(`${result.updated} updated`)
  if (result.errors > 0) parts.push(`${result.errors} errors`)

  if (parts.length === 0) {
    new Notice('Everything is up to date')
  } else {
    new Notice(`Synced ${parts.join(', ')}`)
  }
}
