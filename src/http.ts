import type { APIResponse } from './types'

export class TelegramError extends Error {
  code?: number
  description?: string
  parameters?: { retry_after?: number; migrate_to_chat_id?: number }

  constructor(message: string, opts?: { code?: number; description?: string; parameters?: { retry_after?: number; migrate_to_chat_id?: number } }) {
    super(message)
    this.name = 'TelegramError'
    this.code = opts?.code
    this.description = opts?.description
    this.parameters = opts?.parameters
  }
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export interface HTTPClientOptions {
  apiBase?: string
  fetch?: typeof fetch
  timeoutMs?: number
  maxRetries?: number
}

export class TelegramHTTPClient {
  private token: string
  private apiBase: string
  private fetchImpl: typeof fetch
  private timeoutMs: number
  private maxRetries: number

  constructor(token: string, options?: HTTPClientOptions) {
    this.token = token
    this.apiBase = options?.apiBase ?? 'https://api.telegram.org'
    this.fetchImpl = options?.fetch ?? fetch
    this.timeoutMs = options?.timeoutMs ?? 90_000
    this.maxRetries = Math.max(1, options?.maxRetries ?? 3)
  }

  async call<TResult = unknown>(method: string, params?: Record<string, any>): Promise<TResult> {
    const url = `${this.apiBase}/bot${this.token}/${method}`

    let attempt = 0
    while (true) {
      attempt++
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        const res = await this.fetchImpl(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: params ? JSON.stringify(params) : '{}',
          signal: controller.signal,
        })
        clearTimeout(t)

        let data: APIResponse<TResult>
        try {
          data = (await res.json()) as APIResponse<TResult>
        } catch (e) {
          // Non-JSON response
          if (res.ok) throw new Error(`Unexpected response format from Telegram API for ${method}`)
          throw new Error(`HTTP ${res.status} when calling ${method}`)
        }

        if (data.ok && 'result' in data) {
          return data.result as TResult
        }

        const retryAfter = data.parameters?.retry_after
        const is429 = res.status === 429 || typeof retryAfter === 'number'
        const is5xx = res.status >= 500 && res.status <= 599

        if ((is429 || is5xx) && attempt < this.maxRetries) {
          const backoff = is429 && retryAfter ? retryAfter * 1000 : Math.min(30_000, 500 * 2 ** (attempt - 1))
          await sleep(backoff)
          continue
        }

        throw new TelegramError(data.description ?? 'Telegram API error', {
          code: data.error_code,
          description: data.description,
          parameters: data.parameters,
        })
      } catch (err: any) {
        clearTimeout(t)
        // AbortError or network error
        if (attempt < this.maxRetries) {
          const backoff = Math.min(30_000, 500 * 2 ** (attempt - 1))
          await sleep(backoff)
          continue
        }
        if (err?.name === 'AbortError') {
          throw new Error(`Request timed out after ${this.timeoutMs}ms for ${method}`)
        }
        throw err
      }
    }
  }
}
