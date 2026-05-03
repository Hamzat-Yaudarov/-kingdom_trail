import { env } from '../config/env.js'

async function main() {
  const webhookUrl = `${env.APP_URL.replace(/\/$/, '')}/webhook/telegram`
  const telegramApiUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`

  const response = await fetch(telegramApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
    }),
  })

  const payload = await response.json()

  if (!response.ok || !payload.ok) {
    console.error('Failed to register Telegram webhook')
    console.error(payload)
    process.exit(1)
  }

  console.log('Telegram webhook registered successfully')
  console.log(`Webhook URL: ${webhookUrl}`)
}

void main()
