import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { noticeHistory } from './__tests__/setup'
import BrainfeedPlugin from './main'
import { DEFAULT_SETTINGS } from './settings'

// The mock Plugin base class accepts 0 args; the real one needs (app, manifest).
const PluginCtor = BrainfeedPlugin as unknown as new () => BrainfeedPlugin & Record<string, unknown>

function createPlugin(loadDataReturn: unknown = null): BrainfeedPlugin & Record<string, unknown> {
  const plugin = new PluginCtor()
  plugin.app = { vault: {}, workspace: {} } as never
  plugin.loadData = vi.fn().mockResolvedValue(loadDataReturn)
  plugin.saveData = vi.fn().mockResolvedValue(undefined)
  return plugin
}

describe('BrainfeedPlugin', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    noticeHistory.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('loadSettings', () => {
    it('merges saved data with defaults', async () => {
      const plugin = createPlugin({ apiKey: 'my-key', syncFolder: 'Custom' })

      await plugin.loadSettings()

      expect(plugin.settings.apiKey).toBe('my-key')
      expect(plugin.settings.syncFolder).toBe('Custom')
      expect(plugin.settings.apiUrl).toBe(DEFAULT_SETTINGS.apiUrl)
      expect(plugin.settings.autoSyncMinutes).toBe(DEFAULT_SETTINGS.autoSyncMinutes)
    })

    it('uses defaults when loadData returns null', async () => {
      const plugin = createPlugin(null)

      await plugin.loadSettings()

      expect(plugin.settings).toEqual(DEFAULT_SETTINGS)
    })
  })

  describe('getScope', () => {
    it('maps settings booleans to ExportScope', async () => {
      const plugin = createPlugin({
        includeSummary: false,
        includeFullText: true,
        includeAnnotations: false,
        includeKeyPoints: true,
        includeMetadata: false,
      })
      await plugin.loadSettings()

      const scope = plugin['getScope']()

      expect(scope).toEqual({
        summary: false,
        fullText: true,
        annotations: false,
        keyPoints: true,
        metadata: false,
      })
    })
  })

  describe('getApi', () => {
    it('returns null when apiKey is empty', async () => {
      const plugin = createPlugin({ apiKey: '' })
      await plugin.loadSettings()

      const api = plugin['getApi']()

      expect(api).toBeNull()
      expect(noticeHistory[noticeHistory.length - 1]).toBe('Please set your API key in settings')
    })

    it('returns BrainfeedApi when apiKey is set', async () => {
      const plugin = createPlugin({ apiKey: 'test-key', apiUrl: 'https://example.com' })
      await plugin.loadSettings()

      const api = plugin['getApi']()

      expect(api).not.toBeNull()
    })
  })

  describe('onload', () => {
    it('registers 2 commands, ribbon icon, and setting tab', async () => {
      const plugin = createPlugin()

      await plugin.onload()

      /* eslint-disable @typescript-eslint/unbound-method -- vitest mock functions assigned as class properties don't use this */
      expect(plugin.addCommand).toHaveBeenCalledTimes(2)
      expect(plugin.addCommand).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sync' }),
      )
      expect(plugin.addCommand).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'send-note' }),
      )
      expect(plugin.addRibbonIcon).toHaveBeenCalledTimes(1)
      expect(plugin.addSettingTab).toHaveBeenCalledTimes(1)
      /* eslint-enable @typescript-eslint/unbound-method */
    })
  })

  describe('onunload', () => {
    it('clears auto-sync interval', async () => {
      const plugin = createPlugin({ autoSyncMinutes: 5 })
      await plugin.onload()

      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      plugin.onunload()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('resetAutoSync', () => {
    it('sets interval when minutes > 0', async () => {
      const plugin = createPlugin({ autoSyncMinutes: 10 })
      await plugin.loadSettings()

      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
      plugin.resetAutoSync()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10 * 60 * 1000)
    })

    it('clears interval when minutes is 0', async () => {
      const plugin = createPlugin({ autoSyncMinutes: 5 })
      await plugin.loadSettings()
      plugin.resetAutoSync()

      plugin.settings.autoSyncMinutes = 0
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      plugin.resetAutoSync()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })
})
