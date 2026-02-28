import { requestUrl } from 'obsidian'
import type { RequestUrlResponse } from 'obsidian'

export interface VerifyResponse {
  id: string
  email: string
  name: string
  subscriptionStatus?: string
}

export interface StatusResponse {
  user: { name: string }
  workspace: { id: string; name: string }
  plan: { tier: string }
}

export interface SyncItem {
  id: string
  title: string
  type: 'content' | 'video'
  contentType: string
  updatedAt: number
  sourceUrl: string | null
}

export interface SyncResponse {
  items: SyncItem[]
  nextCursor: number | null
  hasMore: boolean
}

export interface ContentResponse {
  markdown: string
  frontmatter: Record<string, unknown>
  contentId: string
  updatedAt: number
}

export interface IngestResponse {
  contentId: string
  status: string
  isNew: boolean
}

export interface ApiError {
  error: string
  code?: string
}

export class BrainfeedApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'BrainfeedApiError'
    this.code = code
    this.status = status
  }
}

export interface ExportScope {
  summary: boolean
  fullText: boolean
  annotations: boolean
  keyPoints: boolean
  metadata: boolean
}

/**
 * Wrap requestUrl to handle errors consistently.
 * Obsidian's requestUrl throws on non-2xx by default.
 * The thrown error object typically has { status, headers, text, json }.
 */
async function safeRequest(options: {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}): Promise<RequestUrlResponse> {
  try {
    return await requestUrl(options)
  } catch (err: unknown) {
    console.error('[brainfeed] requestUrl error:', err)
    // Obsidian attaches response fields to the thrown error for HTTP errors
    if (
      err &&
      typeof err === 'object' &&
      'status' in err &&
      typeof (err as { status: unknown }).status === 'number'
    ) {
      return err as unknown as RequestUrlResponse
    }
    // True network error (can't connect at all)
    throw new BrainfeedApiError(
      err instanceof Error ? err.message : 'Could not connect to server',
      'NETWORK_ERROR',
      0,
    )
  }
}

export class BrainfeedApi {
  constructor(
    private apiUrl: string,
    private apiKey: string,
  ) {}

  private get headers(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Verify API key by calling /api/auth/user with x-api-key header.
   * Matches the browser extension verification pattern.
   */
  async verifyKey(): Promise<VerifyResponse> {
    const response = await safeRequest({
      url: `${this.apiUrl}/api/auth/user`,
      method: 'GET',
      headers: { 'x-api-key': this.apiKey },
    })

    if (response.status !== 200) {
      const body = response.json as ApiError
      throw new BrainfeedApiError(
        body?.error || `Request failed with status ${response.status}`,
        body?.code || 'UNKNOWN',
        response.status,
      )
    }

    return response.json as VerifyResponse
  }

  /** Get plugin status (user/workspace info). */
  async status(): Promise<StatusResponse> {
    const response = await safeRequest({
      url: `${this.apiUrl}/api/plugin/status`,
      method: 'GET',
      headers: this.headers,
    })

    if (response.status !== 200) {
      const body = response.json as ApiError
      throw new BrainfeedApiError(
        body?.error || `Request failed with status ${response.status}`,
        body?.code || 'UNKNOWN',
        response.status,
      )
    }

    return response.json as StatusResponse
  }

  /** List content changed since a timestamp. */
  async syncList(since: number, limit = 100): Promise<SyncResponse> {
    const params = new URLSearchParams({
      since: String(since),
      limit: String(limit),
    })

    const response = await safeRequest({
      url: `${this.apiUrl}/api/plugin/sync?${params}`,
      method: 'GET',
      headers: this.headers,
    })

    if (response.status !== 200) {
      const body = response.json as ApiError
      throw new BrainfeedApiError(
        body?.error || 'Sync failed',
        body?.code || 'UNKNOWN',
        response.status,
      )
    }

    return response.json as SyncResponse
  }

  /** Fetch a single content item as markdown. */
  async getContent(id: string, scope: ExportScope): Promise<ContentResponse> {
    const params = new URLSearchParams({ id })
    if (!scope.summary) params.set('summary', 'false')
    if (!scope.fullText) params.set('fullText', 'false')
    if (!scope.annotations) params.set('annotations', 'false')
    if (!scope.keyPoints) params.set('keyPoints', 'false')
    if (!scope.metadata) params.set('metadata', 'false')

    const response = await safeRequest({
      url: `${this.apiUrl}/api/plugin/content?${params}`,
      method: 'GET',
      headers: this.headers,
    })

    if (response.status !== 200) {
      const body = response.json as ApiError
      throw new BrainfeedApiError(
        body?.error || 'Failed to fetch content',
        body?.code || 'UNKNOWN',
        response.status,
      )
    }

    return response.json as ContentResponse
  }

  /** Push a note to Brainfeed for summarization. */
  async ingest(data: {
    title: string
    content: string
    sourceUrl?: string
    tags?: string[]
  }): Promise<IngestResponse> {
    const response = await safeRequest({
      url: `${this.apiUrl}/api/plugin/ingest`,
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    })

    if (response.status !== 200) {
      const body = response.json as ApiError
      throw new BrainfeedApiError(
        body?.error || 'Failed to ingest note',
        body?.code || 'UNKNOWN',
        response.status,
      )
    }

    return response.json as IngestResponse
  }
}
