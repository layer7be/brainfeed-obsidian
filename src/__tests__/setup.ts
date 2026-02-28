import { vi } from 'vitest'

/** Captured Notice messages for assertions. */
export const noticeHistory: string[] = []

vi.mock('obsidian', () => {
  class Notice {
    constructor(message: string) {
      noticeHistory.push(message)
    }
  }

  class Plugin {
    app: Record<string, unknown> = {}
    manifest = {}
    addCommand = vi.fn()
    addRibbonIcon = vi.fn()
    addSettingTab = vi.fn()
    registerInterval = vi.fn()
    loadData = vi.fn().mockResolvedValue(null)
    saveData = vi.fn().mockResolvedValue(undefined)
  }

  class PluginSettingTab {
    app: Record<string, unknown>
    plugin: unknown
    containerEl = { empty: vi.fn(), createEl: vi.fn() }

    constructor(app: Record<string, unknown>, plugin: unknown) {
      this.app = app
      this.plugin = plugin
    }
  }

  class Setting {
    constructor() {}
    setName() { return this }
    setDesc() { return this }
    addText() { return this }
    addToggle() { return this }
    addDropdown() { return this }
    addButton() { return this }
  }

  class TFile {
    path: string
    basename: string
    extension = 'md'
    name: string

    constructor(path: string) {
      this.path = path
      this.name = path.split('/').pop() ?? path
      this.basename = this.name.replace(/\.md$/, '')
    }
  }

  class TFolder {
    path: string
    constructor(path: string) {
      this.path = path
    }
  }

  class Vault {
    getAbstractFileByPath = vi.fn()
    getMarkdownFiles = vi.fn().mockReturnValue([])
    cachedRead = vi.fn()
    read = vi.fn()
    create = vi.fn()
    modify = vi.fn()
    process = vi.fn()
    createFolder = vi.fn()
  }

  class MetadataCache {
    getFileCache = vi.fn().mockReturnValue(null)
  }

  class FileManager {
    processFrontMatter = vi.fn()
  }

  function normalizePath(path: string): string {
    return path.replace(/\/+/g, '/').replace(/\/$/, '')
  }

  const requestUrl = vi.fn()

  return {
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    TFile,
    TFolder,
    Vault,
    MetadataCache,
    FileManager,
    normalizePath,
    requestUrl,
  }
})
