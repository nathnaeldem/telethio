# telethio

A minimal TypeScript Telegram Bot API library (HTTP) with long polling and an Express webhook adapter.

- **Node 18+** (uses native `fetch`)
- **TypeScript-first** with ESM + CJS builds via `tsup`
- **Small surface**: generic `call()`, helpers like `sendMessage()`, `getMe()`, and `startPolling()`

## Install

```bash
npm i telethio
# For local dev on this repo:
npm i -D typescript tsup
npm run build
```

## Quickstart (Polling)

```ts
import { Bot } from 'telethio'

const token = process.env.BOT_TOKEN!
const bot = new Bot(token)

bot.startPolling(async (update, { bot }) => {
  const msg = update.message
  if (msg?.text) {
    await bot.sendMessage({ chat_id: msg.chat.id, text: `echo: ${msg.text}` })
  }
}, { timeoutSec: 60 })
```

## Webhook (Express)

```ts
import express from 'express'
import { Bot, createExpressMiddleware } from 'telethio'

const app = express()
app.use(express.json())

const bot = new Bot(process.env.BOT_TOKEN!)
app.post('/webhook', createExpressMiddleware(bot, async (update, { bot }) => {
  const msg = update.message
  if (msg?.text) {
    await bot.sendMessage({ chat_id: msg.chat.id, text: `echo: ${msg.text}` })
  }
}, { secretToken: process.env.TG_SECRET }))

app.listen(3000, () => console.log('listening on 3000'))
```

## API Overview

- **`new Bot(token, options?)`**: create a bot instance.
- **`bot.call(method, params?)`**: generic method for any Telegram API call.
- **`bot.getMe()`**: get bot info.
- **`bot.sendMessage(params)`**: send text messages.
- **`bot.setWebhook(params)` / `bot.deleteWebhook(params?)`**.
- **`bot.startPolling(handler, options?)`**: long polling with backoff and stop control.

### Types
Basic types are exported from `src/types.ts` like `Update`, `Message`, `User`, etc.

## Notes
- This library targets the Telegram Bot API (HTTP) and does not implement MTProto.
- For file uploads/multipart, support can be added later.

## License
MIT
