import { vi } from 'vitest'
import { FileManager, MetadataCache, TFile, Vault } from 'obsidian'

import type { App } from 'obsidian'
import type { BrainfeedApi, ExportScope } from '../api'

export function makeVault(overrides: Partial<Vault> = {}): Vault {
  const vault = new Vault()
  return Object.assign(vault, overrides)
}

export function makeApp(overrides: {
  vault?: Partial<Vault>
  metadataCache?: Partial<MetadataCache>
  fileManager?: Partial<FileManager>
} = {}): App {
  const vault = makeVault(overrides.vault)
  const metadataCache = Object.assign(new MetadataCache(), overrides.metadataCache)
  const fileManager = Object.assign(new FileManager(), overrides.fileManager)
  return { vault, metadataCache, fileManager } as unknown as App
}

export function makeTFile(path: string): TFile {
  return new (TFile as unknown as new (p: string) => TFile)(path)
}

export function makeApi(overrides: Partial<BrainfeedApi> = {}): BrainfeedApi {
  return {
    verifyKey: vi.fn(),
    syncList: vi.fn(),
    getContent: vi.fn(),
    ingest: vi.fn(),
    status: vi.fn(),
    ...overrides,
  } as unknown as BrainfeedApi
}

export const defaultScope: ExportScope = {
  summary: true,
  fullText: true,
  annotations: true,
  keyPoints: true,
  metadata: true,
}
