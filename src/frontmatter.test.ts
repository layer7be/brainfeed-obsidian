import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeApp, makeTFile } from './__tests__/factories'
import { extractBrainfeedId, findFileByBrainfeedId } from './frontmatter'

describe('extractBrainfeedId', () => {
  it('extracts unquoted id', () => {
    const content = '---\nbrainfeed_id: abc123\n---\nBody'
    expect(extractBrainfeedId(content)).toBe('abc123')
  })

  it('extracts double-quoted id', () => {
    const content = '---\nbrainfeed_id: "abc123"\n---\nBody'
    expect(extractBrainfeedId(content)).toBe('abc123')
  })

  it('extracts single-quoted id', () => {
    const content = "---\nbrainfeed_id: 'abc123'\n---\nBody"
    expect(extractBrainfeedId(content)).toBe('abc123')
  })

  it('returns null when no frontmatter', () => {
    expect(extractBrainfeedId('Just some text')).toBeNull()
  })

  it('returns null for empty frontmatter', () => {
    expect(extractBrainfeedId('---\n\n---\nBody')).toBeNull()
  })

  it('returns null when brainfeed_id key is missing', () => {
    const content = '---\ntitle: Hello\ntags: [a]\n---\nBody'
    expect(extractBrainfeedId(content)).toBeNull()
  })

  it('returns null for unclosed frontmatter', () => {
    expect(extractBrainfeedId('---\nbrainfeed_id: abc\nBody')).toBeNull()
  })

  it('handles extra whitespace around id', () => {
    const content = '---\nbrainfeed_id:   abc123  \n---\nBody'
    expect(extractBrainfeedId(content)).toBe('abc123')
  })

  it('handles multiple fields', () => {
    const content = '---\ntitle: Test\nbrainfeed_id: xyz789\ntags: [a]\n---\nBody'
    expect(extractBrainfeedId(content)).toBe('xyz789')
  })
})

describe('findFileByBrainfeedId', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns matching file', () => {
    const file = makeTFile('Brainfeed/note.md')
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue({}),
        getMarkdownFiles: vi.fn().mockReturnValue([file]),
      },
      metadataCache: {
        getFileCache: vi.fn().mockReturnValue({ frontmatter: { brainfeed_id: 'abc123' } }),
      },
    })

    const result = findFileByBrainfeedId(app, 'Brainfeed', 'abc123')
    expect(result).toBe(file)
  })

  it('returns null when no files in folder', () => {
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue({}),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
      },
    })

    const result = findFileByBrainfeedId(app, 'Brainfeed', 'abc123')
    expect(result).toBeNull()
  })

  it('returns null when folder does not exist', () => {
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue(null),
      },
    })

    const result = findFileByBrainfeedId(app, 'Missing', 'abc123')
    expect(result).toBeNull()
  })

  it('skips file without frontmatter', () => {
    const file = makeTFile('Brainfeed/note.md')
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue({}),
        getMarkdownFiles: vi.fn().mockReturnValue([file]),
      },
      metadataCache: {
        getFileCache: vi.fn().mockReturnValue(null),
      },
    })

    const result = findFileByBrainfeedId(app, 'Brainfeed', 'abc123')
    expect(result).toBeNull()
  })

  it('skips file with different id', () => {
    const file = makeTFile('Brainfeed/note.md')
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue({}),
        getMarkdownFiles: vi.fn().mockReturnValue([file]),
      },
      metadataCache: {
        getFileCache: vi.fn().mockReturnValue({ frontmatter: { brainfeed_id: 'other-id' } }),
      },
    })

    const result = findFileByBrainfeedId(app, 'Brainfeed', 'abc123')
    expect(result).toBeNull()
  })

  it('only searches within syncFolder', () => {
    const insideFile = makeTFile('Brainfeed/inside.md')
    const outsideFile = makeTFile('Other/outside.md')
    const getFileCache = vi.fn().mockReturnValue({ frontmatter: { brainfeed_id: 'abc123' } })
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue({}),
        getMarkdownFiles: vi.fn().mockReturnValue([insideFile, outsideFile]),
      },
      metadataCache: { getFileCache },
    })

    const result = findFileByBrainfeedId(app, 'Brainfeed', 'abc123')
    expect(result).toBe(insideFile)
    // getFileCache should only be called for the file inside the folder
    expect(getFileCache).toHaveBeenCalledTimes(1)
    expect(getFileCache).toHaveBeenCalledWith(insideFile)
  })
})
