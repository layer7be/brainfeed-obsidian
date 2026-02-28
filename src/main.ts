import { Notice, Plugin } from 'obsidian'
import { BrainfeedApi } from './api'
import { pushToBrainfeed } from './ingest'
import { BrainfeedSettingTab, DEFAULT_SETTINGS } from './settings'
import { pullSync, showSyncNotice } from './sync'
import type { ExportScope } from './api'
import type { BrainfeedSettings } from './settings'

export default class BrainfeedPlugin extends Plugin {
  settings: BrainfeedSettings = DEFAULT_SETTINGS
  private autoSyncInterval: ReturnType<typeof setInterval> | null = null

  async onload() {
    await this.loadSettings()

    // Settings tab
    this.addSettingTab(new BrainfeedSettingTab(this.app, this))

    // Ribbon icon for manual sync
    this.addRibbonIcon('refresh-cw', 'Sync from Brainfeed', async () => {
      await this.runSync()
    })

    // Commands
    this.addCommand({
      id: 'sync-from-brainfeed',
      name: 'Sync from Brainfeed',
      callback: async () => {
        await this.runSync()
      },
    })

    this.addCommand({
      id: 'send-to-brainfeed',
      name: 'Send to Brainfeed',
      editorCallback: async () => {
        await this.runIngest()
      },
    })

    // Set up auto-sync if configured
    this.resetAutoSync()
  }

  onunload() {
    this.clearAutoSync()
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  /** Reset the auto-sync interval based on current settings. */
  resetAutoSync() {
    this.clearAutoSync()

    if (this.settings.autoSyncMinutes > 0) {
      const intervalMs = this.settings.autoSyncMinutes * 60 * 1000
      this.autoSyncInterval = setInterval(async () => {
        await this.runSync()
      }, intervalMs)

      // Register for cleanup on plugin unload
      this.registerInterval(this.autoSyncInterval as unknown as number)
    }
  }

  private clearAutoSync() {
    if (this.autoSyncInterval !== null) {
      clearInterval(this.autoSyncInterval)
      this.autoSyncInterval = null
    }
  }

  private getApi(): BrainfeedApi | null {
    if (!this.settings.apiKey) {
      new Notice('Brainfeed: Please set your API key in settings')
      return null
    }
    return new BrainfeedApi(this.settings.apiUrl, this.settings.apiKey)
  }

  private getScope(): ExportScope {
    return {
      summary: this.settings.includeSummary,
      fullText: this.settings.includeFullText,
      annotations: this.settings.includeAnnotations,
      keyPoints: this.settings.includeKeyPoints,
      metadata: this.settings.includeMetadata,
    }
  }

  private async runSync() {
    const api = this.getApi()
    if (!api) return

    new Notice('Brainfeed: Syncing...')

    try {
      const { result, newTimestamp } = await pullSync(
        this.app.vault,
        api,
        this.settings.syncFolder,
        this.getScope(),
        this.settings.lastSyncTimestamp,
      )

      // Persist the new timestamp
      this.settings.lastSyncTimestamp = newTimestamp
      await this.saveSettings()

      showSyncNotice(result)
    } catch (err) {
      console.error('[brainfeed] Sync failed:', err)
      new Notice(`Brainfeed: Sync failed — ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  private async runIngest() {
    const api = this.getApi()
    if (!api) return

    const file = this.app.workspace.getActiveFile()
    if (!file) {
      new Notice('Brainfeed: No active file')
      return
    }

    try {
      await pushToBrainfeed(this.app.vault, api, file)
    } catch (err) {
      console.error('[brainfeed] Ingest failed:', err)
      new Notice(`Brainfeed: Send failed — ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }
}
