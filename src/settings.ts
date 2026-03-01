import { Notice, PluginSettingTab, Setting } from 'obsidian'
import { BrainfeedApi } from './api'
import type { App } from 'obsidian'
import type BrainfeedPlugin from './main'

export interface BrainfeedSettings {
  apiUrl: string
  apiKey: string
  syncFolder: string
  autoSyncMinutes: number // 0 = disabled
  includeSummary: boolean
  includeFullText: boolean
  includeAnnotations: boolean
  includeKeyPoints: boolean
  includeMetadata: boolean
  lastSyncTimestamp: number
}

export const DEFAULT_SETTINGS: BrainfeedSettings = {
  apiUrl: 'https://brainfeed.ai',
  apiKey: '',
  syncFolder: 'Brainfeed',
  autoSyncMinutes: 0,
  includeSummary: true,
  includeFullText: true,
  includeAnnotations: true,
  includeKeyPoints: true,
  includeMetadata: true,
  lastSyncTimestamp: 0,
}

export class BrainfeedSettingTab extends PluginSettingTab {
  plugin: BrainfeedPlugin

  constructor(app: App, plugin: BrainfeedPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    // API URL
    new Setting(containerEl)
      .setName('API URL')
      .setDesc('Brainfeed API endpoint')
      .addText((text) =>
        text
          .setPlaceholder('https://brainfeed.ai')
          .setValue(this.plugin.settings.apiUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiUrl = value.trim() || DEFAULT_SETTINGS.apiUrl
            await this.plugin.saveSettings()
          }),
      )

    // API Key with verify button
    const apiKeySetting = new Setting(containerEl)
      .setName('API key')
      .setDesc('Your API key')
      .addText((text) => {
        text.inputEl.type = 'password'
        text
          .setPlaceholder('Enter your API key')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim()
            await this.plugin.saveSettings()
          })
      })

    apiKeySetting.addButton((btn) =>
      btn.setButtonText('Verify').onClick(async () => {
        if (!this.plugin.settings.apiKey) {
          new Notice('Please enter an API key first')
          return
        }

        btn.setButtonText('Verifying...')
        btn.setDisabled(true)

        try {
          const api = new BrainfeedApi(
            this.plugin.settings.apiUrl,
            this.plugin.settings.apiKey,
          )
          const user = await api.verifyKey()
          new Notice(
            `Connected as ${user.name || user.email}`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          new Notice(`Verification failed: ${msg}`)
        } finally {
          btn.setButtonText('Verify')
          btn.setDisabled(false)
        }
      }),
    )

    // Sync Folder
    new Setting(containerEl)
      .setName('Sync folder')
      .setDesc('Folder where synced content will be saved')
      .addText((text) =>
        text
          .setPlaceholder('Brainfeed')
          .setValue(this.plugin.settings.syncFolder)
          .onChange(async (value) => {
            this.plugin.settings.syncFolder = value.trim() || DEFAULT_SETTINGS.syncFolder
            await this.plugin.saveSettings()
          }),
      )

    // Auto-sync interval
    new Setting(containerEl)
      .setName('Auto-sync interval')
      .setDesc('Automatically sync at a regular interval')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('0', 'Disabled')
          .addOption('5', 'Every 5 minutes')
          .addOption('15', 'Every 15 minutes')
          .addOption('30', 'Every 30 minutes')
          .addOption('60', 'Every hour')
          .setValue(String(this.plugin.settings.autoSyncMinutes))
          .onChange(async (value) => {
            this.plugin.settings.autoSyncMinutes = Number(value)
            await this.plugin.saveSettings()
            this.plugin.resetAutoSync()
          }),
      )

    // Scope toggles
    new Setting(containerEl)
      .setName('Content scope')
      .setHeading()
      .setDesc('Choose what to include when syncing')

    new Setting(containerEl)
      .setName('Summary')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeSummary)
          .onChange(async (value) => {
            this.plugin.settings.includeSummary = value
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('Key points')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeKeyPoints)
          .onChange(async (value) => {
            this.plugin.settings.includeKeyPoints = value
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('Highlights / annotations')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeAnnotations)
          .onChange(async (value) => {
            this.plugin.settings.includeAnnotations = value
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('Full text')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeFullText)
          .onChange(async (value) => {
            this.plugin.settings.includeFullText = value
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('Metadata')
      .setDesc('Include source URL, author, date, and topics')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeMetadata)
          .onChange(async (value) => {
            this.plugin.settings.includeMetadata = value
            await this.plugin.saveSettings()
          }),
      )
  }
}
