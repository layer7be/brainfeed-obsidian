import { beforeEach, describe, expect, it, vi } from 'vitest'

import { noticeHistory } from './__tests__/setup'
import { defaultScope, makeApi, makeApp } from './__tests__/factories'
import { pullSync, showSyncNotice } from './sync'

import type { SyncResult } from './sync'

describe('pullSync', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    noticeHistory.length = 0
  })

  it('creates folder if missing', async () => {
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue(null),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
      },
    })
    const api = makeApi({
      syncList: vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false }),
    })

    await pullSync(app, api, 'Brainfeed', defaultScope, 0)

    expect(app.vault.createFolder).toHaveBeenCalledWith('Brainfeed')
  })

  it('returns zero counts for empty list', async () => {
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue({}),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
      },
    })
    const api = makeApi({
      syncList: vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false }),
    })

    const { result } = await pullSync(app, api, 'Brainfeed', defaultScope, 0)

    expect(result).toEqual({ created: 0, updated: 0, errors: 0 })
  })

  it('creates new file for item not found in vault', async () => {
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue(null),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
        create: vi.fn().mockResolvedValue({}),
        createFolder: vi.fn().mockResolvedValue(undefined),
      },
    })
    const api = makeApi({
      syncList: vi.fn().mockResolvedValue({
        items: [{ id: 'item-1', title: 'Test Article', updatedAt: 100, type: 'content', contentType: 'article', sourceUrl: null }],
        nextCursor: null,
        hasMore: false,
      }),
      getContent: vi.fn().mockResolvedValue({
        markdown: '---\nbrainfeed_id: item-1\n---\n# Test',
        frontmatter: {},
        contentId: 'item-1',
        updatedAt: 100,
      }),
    })

    const { result } = await pullSync(app, api, 'Brainfeed', defaultScope, 0)

    expect(app.vault.create).toHaveBeenCalled()
    expect(result.created).toBe(1)
  })

  it('handles name collision with auto-increment', async () => {
    let callCount = 0
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockImplementation((path: string) => {
          // First call for folder check returns null, then for collision check
          callCount++
          if (callCount === 1) return null // folder doesn't exist
          if (path === 'Brainfeed/test-article.md') return {} // file exists
          if (path === 'Brainfeed/test-article-1.md') return null // no collision
          return null
        }),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
        create: vi.fn().mockResolvedValue({}),
        createFolder: vi.fn().mockResolvedValue(undefined),
      },
    })
    const api = makeApi({
      syncList: vi.fn().mockResolvedValue({
        items: [{ id: 'item-1', title: 'Test Article', updatedAt: 100, type: 'content', contentType: 'article', sourceUrl: null }],
        nextCursor: null,
        hasMore: false,
      }),
      getContent: vi.fn().mockResolvedValue({
        markdown: '---\nbrainfeed_id: item-1\n---\n# Test',
        frontmatter: {},
        contentId: 'item-1',
        updatedAt: 100,
      }),
    })

    await pullSync(app, api, 'Brainfeed', defaultScope, 0)

    const createCall = (app.vault.create as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(createCall[0]).toBe('Brainfeed/test-article-1.md')
  })

  it('paginates through multiple pages', async () => {
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue(null),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
        create: vi.fn().mockResolvedValue({}),
        createFolder: vi.fn().mockResolvedValue(undefined),
      },
    })
    const syncList = vi.fn()
      .mockResolvedValueOnce({
        items: [{ id: 'item-1', title: 'First', updatedAt: 100, type: 'content', contentType: 'article', sourceUrl: null }],
        nextCursor: 100,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [{ id: 'item-2', title: 'Second', updatedAt: 200, type: 'content', contentType: 'article', sourceUrl: null }],
        nextCursor: null,
        hasMore: false,
      })
    const api = makeApi({
      syncList,
      getContent: vi.fn().mockResolvedValue({
        markdown: '# Content',
        frontmatter: {},
        contentId: 'x',
        updatedAt: 100,
      }),
    })

    await pullSync(app, api, 'Brainfeed', defaultScope, 0)

    expect(syncList).toHaveBeenCalledTimes(2)
    expect(syncList).toHaveBeenCalledWith(0)
    expect(syncList).toHaveBeenCalledWith(100)
  })

  it('counts errors without stopping', async () => {
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue({}),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
      },
    })
    const api = makeApi({
      syncList: vi.fn().mockResolvedValue({
        items: [
          { id: 'fail-1', title: 'Fail', updatedAt: 100, type: 'content', contentType: 'article', sourceUrl: null },
          { id: 'fail-2', title: 'Fail 2', updatedAt: 200, type: 'content', contentType: 'article', sourceUrl: null },
        ],
        nextCursor: null,
        hasMore: false,
      }),
      getContent: vi.fn().mockRejectedValue(new Error('API error')),
    })

    const { result } = await pullSync(app, api, 'Brainfeed', defaultScope, 0)

    expect(result.errors).toBe(2)
    expect(result.created).toBe(0)
    expect(result.updated).toBe(0)
  })

  it('tracks max timestamp', async () => {
    const app = makeApp({
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue(null),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
        create: vi.fn().mockResolvedValue({}),
        createFolder: vi.fn().mockResolvedValue(undefined),
      },
    })
    const api = makeApi({
      syncList: vi.fn().mockResolvedValue({
        items: [
          { id: 'item-1', title: 'A', updatedAt: 300, type: 'content', contentType: 'article', sourceUrl: null },
          { id: 'item-2', title: 'B', updatedAt: 500, type: 'content', contentType: 'article', sourceUrl: null },
        ],
        nextCursor: null,
        hasMore: false,
      }),
      getContent: vi.fn().mockResolvedValue({
        markdown: '# Content',
        frontmatter: {},
        contentId: 'x',
        updatedAt: 100,
      }),
    })

    const { newTimestamp } = await pullSync(app, api, 'Brainfeed', defaultScope, 0)

    expect(newTimestamp).toBe(500)
  })
})

describe('showSyncNotice', () => {
  beforeEach(() => {
    noticeHistory.length = 0
  })

  it('shows "up to date" for zero counts', () => {
    showSyncNotice({ created: 0, updated: 0, errors: 0 })
    expect(noticeHistory[noticeHistory.length - 1]).toBe('Brainfeed: Everything is up to date')
  })

  it('shows created count', () => {
    showSyncNotice({ created: 3, updated: 0, errors: 0 })
    expect(noticeHistory[noticeHistory.length - 1]).toBe('Brainfeed: Synced 3 new')
  })

  it('shows updated count', () => {
    showSyncNotice({ created: 0, updated: 2, errors: 0 })
    expect(noticeHistory[noticeHistory.length - 1]).toBe('Brainfeed: Synced 2 updated')
  })

  it('shows error count', () => {
    showSyncNotice({ created: 0, updated: 0, errors: 1 })
    expect(noticeHistory[noticeHistory.length - 1]).toBe('Brainfeed: Synced 1 errors')
  })

  it('combines created, updated, and error counts', () => {
    const result: SyncResult = { created: 2, updated: 3, errors: 1 }
    showSyncNotice(result)
    expect(noticeHistory[noticeHistory.length - 1]).toBe('Brainfeed: Synced 2 new, 3 updated, 1 errors')
  })
})
