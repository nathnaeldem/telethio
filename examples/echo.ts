import { Bot } from '../src'

async function main() {
  const token = process.env.BOT_TOKEN
  if (!token) {
    console.error('Please set BOT_TOKEN env var')
    process.exit(1)
  }

  const bot = new Bot(token)
  // Ensure long polling works even if a webhook was previously set
  try {
    await bot.deleteWebhook({ drop_pending_updates: false })
  } catch {}
  const ctl = bot.startPolling(async (update, { bot }) => {
    const msg = update.message
    if (msg?.text) {
      await bot.sendMessage({ chat_id: msg.chat.id, text: `echo: ${msg.text}` })
    }
  }, { timeoutSec: 60, onError: (err) => console.error('polling error:', err) })
  console.log('telethio echo bot polling...')

  process.on('SIGINT', () => { ctl.stop(); process.exit(0) })
  process.on('SIGTERM', () => { ctl.stop(); process.exit(0) })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
