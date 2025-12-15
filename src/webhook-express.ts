import type { Update } from './types'
import type { Bot } from './bot'

export interface ExpressWebhookOptions {
  secretToken?: string
}

// Lightweight Express-compatible middleware without importing express types.
// Usage:
//   app.post('/webhook', createExpressMiddleware(bot, async (update) => { ... }, { secretToken: '...' }))
export function createExpressMiddleware(
  bot: Bot,
  onUpdate: (update: Update, ctx: { bot: Bot }) => Promise<void> | void,
  options?: ExpressWebhookOptions
) {
  return async function telegramWebhook(req: any, res: any) {
    if (req.method !== 'POST') {
      res.statusCode = 405
      return res.end('Method Not Allowed')
    }

    if (options?.secretToken) {
      const header = req.headers?.['x-telegram-bot-api-secret-token'] || req.headers?.['X-Telegram-Bot-Api-Secret-Token']
      const token = Array.isArray(header) ? header[0] : header
      if (token !== options.secretToken) {
        res.statusCode = 403
        return res.end('Forbidden')
      }
    }

    let body: any = req.body
    if (!body) {
      try {
        const chunks: Uint8Array[] = []
        for await (const chunk of req) chunks.push(chunk)
        const raw = Buffer.concat(chunks).toString('utf8')
        body = JSON.parse(raw)
      } catch (e) {
        res.statusCode = 400
        return res.end('Bad Request')
      }
    }

    try {
      await onUpdate(body as Update, { bot })
    } catch (e) {
      // The Bot API expects 200 OK regardless to avoid re-delivery storms.
    }

    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: true }))
  }
}
