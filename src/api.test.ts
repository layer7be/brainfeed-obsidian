import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestUrl } from 'obsidian'

import { BrainfeedApi, BrainfeedApiError } from './api'

import type { ExportScope } from './api'
import type { RequestUrlParam } from 'obsidian'

const mockRequestUrl = vi.mocked(requestUrl)

describe('BrainfeedApiError', () => {
  it('sets name, message, code, and status', () => {
    const err = new BrainfeedApiError('bad key', 'INVALID_KEY', 401)
    expect(err.name).toBe('BrainfeedApiError')
    expect(err.message).toBe('bad key')
    expect(err.code).toBe('INVALID_KEY')
    expect(err.status).toBe(401)
  })

  it('is an instance of Error', () => {
    const err = new BrainfeedApiError('fail', 'ERR', 500)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('BrainfeedApi', () => {
  let api: BrainfeedApi

  beforeEach(() => {
    mockRequestUrl.mockReset()
    api = new BrainfeedApi('https://brainfeed.ai', 'test-key')
  })

  describe('verifyKey', () => {
    it('calls correct URL with x-api-key header', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: { id: '1', email: 'a@b.com', name: 'Alice' },
        headers: {},
        text: '',
        arrayBuffer: new ArrayBuffer(0),
      })

      await api.verifyKey()

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: 'https://brainfeed.ai/api/auth/user',
        method: 'GET',
        headers: { 'x-api-key': 'test-key' },
      })
    })

    it('returns response on 200', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: { id: '1', email: 'a@b.com', name: 'Alice' },
        headers: {},
        text: '',
        arrayBuffer: new ArrayBuffer(0),
      })

      const result = await api.verifyKey()
      expect(result).toEqual({ id: '1', email: 'a@b.com', name: 'Alice' })
    })

    it('throws BrainfeedApiError on 401', async () => {
      // Obsidian throws on non-2xx, attaching status to the error
      mockRequestUrl.mockRejectedValue({
        status: 401,
        json: { error: 'Invalid API key', code: 'INVALID_KEY' },
        headers: {},
        text: '',
      })

      await expect(api.verifyKey()).rejects.toThrow(BrainfeedApiError)
      await expect(api.verifyKey()).rejects.toMatchObject({
        code: 'INVALID_KEY',
        status: 401,
      })
    })

    it('throws NETWORK_ERROR on connection failure', async () => {
      mockRequestUrl.mockRejectedValue(new Error('fetch failed'))

      await expect(api.verifyKey()).rejects.toThrow(BrainfeedApiError)
      await expect(api.verifyKey()).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        status: 0,
      })
    })
  })

  describe('syncList', () => {
    it('calls correct URL with params', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: { items: [], nextCursor: null, hasMore: false },
        headers: {},
        text: '',
        arrayBuffer: new ArrayBuffer(0),
      })

      await api.syncList(1000, 50)

      const call = mockRequestUrl.mock.calls[0][0] as RequestUrlParam
      expect(call.url).toContain('/api/plugin/sync?')
      expect(call.url).toContain('since=1000')
      expect(call.url).toContain('limit=50')
      expect(call.headers).toEqual({
        'x-api-key': 'test-key',
        'Content-Type': 'application/json',
      })
    })

    it('returns SyncResponse', async () => {
      const payload = { items: [{ id: 'x' }], nextCursor: 2000, hasMore: true }
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: payload,
        headers: {},
        text: '',
        arrayBuffer: new ArrayBuffer(0),
      })

      const result = await api.syncList(0)
      expect(result).toEqual(payload)
    })
  })

  describe('getContent', () => {
    it('includes scope flags that are false in query params', async () => {
      const scope: ExportScope = {
        summary: true,
        fullText: false,
        annotations: true,
        keyPoints: false,
        metadata: true,
      }

      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: { markdown: '# Test', frontmatter: {}, contentId: 'c1', updatedAt: 100 },
        headers: {},
        text: '',
        arrayBuffer: new ArrayBuffer(0),
      })

      await api.getContent('c1', scope)

      const url = (mockRequestUrl.mock.calls[0][0] as RequestUrlParam).url
      expect(url).toContain('id=c1')
      expect(url).toContain('fullText=false')
      expect(url).toContain('keyPoints=false')
      expect(url).not.toContain('summary=false')
      expect(url).not.toContain('annotations=false')
      expect(url).not.toContain('metadata=false')
    })

    it('returns ContentResponse', async () => {
      const scope: ExportScope = {
        summary: true,
        fullText: true,
        annotations: true,
        keyPoints: true,
        metadata: true,
      }
      const payload = { markdown: '# Hello', frontmatter: {}, contentId: 'c1', updatedAt: 100 }

      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: payload,
        headers: {},
        text: '',
        arrayBuffer: new ArrayBuffer(0),
      })

      const result = await api.getContent('c1', scope)
      expect(result).toEqual(payload)
    })
  })

  describe('ingest', () => {
    it('POSTs with JSON body', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: { contentId: 'new-1', status: 'processing', isNew: true },
        headers: {},
        text: '',
        arrayBuffer: new ArrayBuffer(0),
      })

      await api.ingest({ title: 'My Note', content: 'Body text', tags: ['tag1'] })

      const call = mockRequestUrl.mock.calls[0][0] as RequestUrlParam
      expect(call.method).toBe('POST')
      expect(call.url).toBe('https://brainfeed.ai/api/plugin/ingest')
      expect(JSON.parse(call.body as string)).toEqual({
        title: 'My Note',
        content: 'Body text',
        tags: ['tag1'],
      })
    })

    it('returns IngestResponse', async () => {
      const payload = { contentId: 'new-1', status: 'processing', isNew: true }
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: payload,
        headers: {},
        text: '',
        arrayBuffer: new ArrayBuffer(0),
      })

      const result = await api.ingest({ title: 'Note', content: 'Body' })
      expect(result).toEqual(payload)
    })
  })
})
