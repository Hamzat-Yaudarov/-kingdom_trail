import { Bot, InlineKeyboard, webhookCallback } from 'grammy'

export type BotEnv = {
  botToken: string
  webAppUrl: string
}

export function createBot(env: BotEnv) {
  const bot = new Bot(env.botToken)

  bot.command('start', async (ctx) => {
    const isRussian = ctx.from?.language_code?.toLowerCase().startsWith('ru')
    const keyboard = new InlineKeyboard().webApp('Open Game', env.webAppUrl)
    const message = isRussian
      ? 'Развивайте базу, собирайте ресурсы и открывайте новые здания в Kingdom Trail.'
      : 'Build your kingdom, collect resources, and grow your base in Kingdom Trail.'

    await ctx.reply(message, { reply_markup: keyboard })
  })

  return bot
}

export async function startBotPolling(env: BotEnv) {
  const bot = createBot(env)
  await bot.start({
    onStart: ({ username }) => {
      console.log(`[bot] polling started for @${username}`)
    },
  })

  return bot
}

export function createBotWebhookHandler(env: BotEnv) {
  const bot = createBot(env)
  return webhookCallback(bot, 'fastify')
}
