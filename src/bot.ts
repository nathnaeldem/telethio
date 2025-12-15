import { TelegramHTTPClient, TelegramError } from './http'
import type {
  User,
  Message,
  Update,
  SendMessageParams,
  SetWebhookParams,
  GetUpdatesParams,
} from './types'

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export interface BotOptions {
  apiBase?: string
  fetch?: typeof fetch
  timeoutMs?: number
  maxRetries?: number
}

export class Bot {
  readonly token: string
  readonly http: TelegramHTTPClient
  private _polling?: { stop: () => void }

  constructor(token: string, options?: BotOptions) {
    if (!token) throw new Error('Bot token is required')
    this.token = token
    this.http = new TelegramHTTPClient(token, options)
  }

  // Generic API call
  call<TResult = unknown>(method: string, params?: Record<string, any>) {
    return this.http.call<TResult>(method, params)
  }

  // Convenience methods
  getMe(): Promise<User> {
    return this.call<User>('getMe')
  }

  sendMessage(params: SendMessageParams): Promise<Message> {
    return this.call<Message>('sendMessage', params)
  }

  setWebhook(params: SetWebhookParams): Promise<boolean> {
    return this.call<boolean>('setWebhook', params)
  }

  deleteWebhook(params?: { drop_pending_updates?: boolean }): Promise<boolean> {
    return this.call<boolean>('deleteWebhook', params)
  }

  getUpdates(params: GetUpdatesParams): Promise<Update[]> {
    return this.call<Update[]>('getUpdates', params)
  }

  // Long polling
  startPolling(
    onUpdate: (update: Update, ctx: { bot: Bot }) => Promise<void> | void,
    options?: {
      timeoutSec?: number
      limit?: number
      allowed_updates?: string[]
      initialOffset?: number
      onError?: (err: unknown, ctx: { attempt: number }) => void
    }
  ): { stop: () => void } {
    if (this._polling) throw new Error('Polling already started')

    let stopped = false
    let attempt = 0
    let offset = options?.initialOffset ?? 0

    const loop = async () => {
      while (!stopped) {
        try {
          const updates = await this.getUpdates({
            offset: offset > 0 ? offset : undefined,
            timeout: options?.timeoutSec ?? 60,
            limit: options?.limit,
            allowed_updates: options?.allowed_updates,
          })

          if (updates.length) {
            for (const up of updates) {
              try {
                await onUpdate(up, { bot: this })
              } catch (handlerErr) {
                options?.onError?.(handlerErr, { attempt })
              }
              offset = Math.max(offset, up.update_id + 1)
            }
            attempt = 0 // reset backoff after successful batch
          }
        } catch (err) {
          attempt++
          options?.onError?.(err, { attempt })
          const backoff = Math.min(30_000, 500 * 2 ** (attempt - 1))
          await sleep(backoff)
        }
      }
    }

    // Fire and forget
    loop()

    const ctl = {
      stop: () => {
        stopped = true
      },
    }

    this._polling = ctl
    return ctl
  }
}

export { TelegramError }
