import { startBotPolling } from '@kingdom-trail/bot'
import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

async function bootstrap() {
  try {
    await app.listen({ host: '0.0.0.0', port: env.PORT })

    if (env.NODE_ENV === 'development') {
      await startBotPolling({
        botToken: env.BOT_TOKEN,
        webAppUrl: env.WEBAPP_URL,
      })
    }
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

void bootstrap()
