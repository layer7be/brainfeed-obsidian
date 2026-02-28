import { beforeEach, describe, expect, it, vi } from 'vitest'

import { noticeHistory } from './__tests__/setup'
import { makeApi, makeApp, makeTFile } from './__tests__/factories'
import { pushToBrainfeed } from './ingest'

describe('pushToBrainfeed', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    noticeHistory.length = 0
  })

  it('sends content to API', async () => {
    const file = makeTFile('Notes/my-note.md')
    const app = makeApp({
      vault: {
        read: vi.fn().mockResolvedValue('Hello world'),
      },
      fileManager: {
        processFrontMatter: vi.fn().mockResolvedValue(undefined),
      },
    })
    const ingest = vi.fn().mockResolvedValue({ contentId: 'new-1', status: 'processing', isNew: true })
    const api = makeApi({ ingest })

    await pushToBrainfeed(app, api, file)

    expect(ingest).toHaveBeenCalledWith({
      title: 'my-note',
      content: 'Hello world',
      tags: [],
    })
  })

  it('extracts title from frontmatter', async () => {
    const file = makeTFile('Notes/my-note.md')
    const app = makeApp({
      vault: {
        read: vi.fn().mockResolvedValue('---\ntitle: My Custom Title\n---\nBody text'),
      },
      fileManager: {
        processFrontMatter: vi.fn().mockResolvedValue(undefined),
      },
    })
    const ingest = vi.fn().mockResolvedValue({ contentId: 'new-1', status: 'processing', isNew: true })
    const api = makeApi({ ingest })

    await pushToBrainfeed(app, api, file)

    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My Custom Title' }),
    )
  })

  it('extracts tags from frontmatter', async () => {
    const file = makeTFile('Notes/my-note.md')
    const content = '---\ntitle: Test\ntags:\n  - javascript\n  - web\n---\nBody'
    const app = makeApp({
      vault: {
        read: vi.fn().mockResolvedValue(content),
      },
      fileManager: {
        processFrontMatter: vi.fn().mockResolvedValue(undefined),
      },
    })
    const ingest = vi.fn().mockResolvedValue({ contentId: 'new-1', status: 'processing', isNew: true })
    const api = makeApi({ ingest })

    await pushToBrainfeed(app, api, file)

    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['javascript', 'web'] }),
    )
  })

  it('skips files with existing brainfeed_id', async () => {
    const file = makeTFile('Notes/my-note.md')
    const app = makeApp({
      vault: {
        read: vi.fn().mockResolvedValue('---\nbrainfeed_id: existing-id\n---\nBody'),
      },
    })
    const ingest = vi.fn()
    const api = makeApi({ ingest })

    await pushToBrainfeed(app, api, file)

    expect(ingest).not.toHaveBeenCalled()
    expect(noticeHistory[noticeHistory.length - 1]).toBe('This note has already been sent to Brainfeed')
  })

  it('calls processFrontMatter to add brainfeed_id', async () => {
    const file = makeTFile('Notes/my-note.md')
    const processFrontMatter = vi.fn().mockResolvedValue(undefined)
    const app = makeApp({
      vault: {
        read: vi.fn().mockResolvedValue('---\ntitle: Test\n---\nBody'),
      },
      fileManager: { processFrontMatter },
    })
    const api = makeApi({
      ingest: vi.fn().mockResolvedValue({ contentId: 'new-1', status: 'processing', isNew: true }),
    })

    await pushToBrainfeed(app, api, file)

    expect(processFrontMatter).toHaveBeenCalledWith(file, expect.any(Function))
    // Simulate the callback to verify it sets brainfeed_id
    const callback = processFrontMatter.mock.calls[0][1]
    const fm: Record<string, string> = {}
    callback(fm)
    expect(fm.brainfeed_id).toBe('new-1')
  })

  it('calls processFrontMatter when no frontmatter exists', async () => {
    const file = makeTFile('Notes/my-note.md')
    const processFrontMatter = vi.fn().mockResolvedValue(undefined)
    const app = makeApp({
      vault: {
        read: vi.fn().mockResolvedValue('Just plain text'),
      },
      fileManager: { processFrontMatter },
    })
    const api = makeApi({
      ingest: vi.fn().mockResolvedValue({ contentId: 'new-1', status: 'processing', isNew: true }),
    })

    await pushToBrainfeed(app, api, file)

    expect(processFrontMatter).toHaveBeenCalledWith(file, expect.any(Function))
    const callback = processFrontMatter.mock.calls[0][1]
    const fm: Record<string, string> = {}
    callback(fm)
    expect(fm.brainfeed_id).toBe('new-1')
  })

  it('shows appropriate notice for new content', async () => {
    const file = makeTFile('Notes/my-note.md')
    const app = makeApp({
      vault: {
        read: vi.fn().mockResolvedValue('Body text'),
      },
      fileManager: {
        processFrontMatter: vi.fn().mockResolvedValue(undefined),
      },
    })
    const api = makeApi({
      ingest: vi.fn().mockResolvedValue({ contentId: 'new-1', status: 'processing', isNew: true }),
    })

    await pushToBrainfeed(app, api, file)

    expect(noticeHistory[noticeHistory.length - 1]).toBe('Note sent to Brainfeed for summarization')
  })

  it('shows appropriate notice for existing content', async () => {
    const file = makeTFile('Notes/my-note.md')
    const app = makeApp({
      vault: {
        read: vi.fn().mockResolvedValue('Body text'),
      },
      fileManager: {
        processFrontMatter: vi.fn().mockResolvedValue(undefined),
      },
    })
    const api = makeApi({
      ingest: vi.fn().mockResolvedValue({ contentId: 'dup-1', status: 'exists', isNew: false }),
    })

    await pushToBrainfeed(app, api, file)

    expect(noticeHistory[noticeHistory.length - 1]).toBe('Note already exists in Brainfeed')
  })
})
