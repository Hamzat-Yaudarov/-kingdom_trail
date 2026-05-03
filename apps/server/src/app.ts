import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import staticPlugin from '@fastify/static'
import Fastify from 'fastify'
import {
  BASE_SLOTS,
  BUILDING_CONFIG,
  CASTLE_REQUIREMENTS,
  en,
  ru,
  type BuildingActionRequest,
  type LanguageRequest,
  type TelegramAuthRequest,
} from '@kingdom-trail/shared'
import { createBotWebhookHandler } from '@kingdom-trail/bot'
import { env } from './config/env.js'
import { requireAuth } from './plugins/auth.js'
import { signSessionToken } from './lib/session.js'
import { validateTelegramInitData } from './lib/telegram.js'
import {
  ActionError,
  buildBuilding,
  collectBuildingResources,
  speedupConstruction,
  upgradeBuilding,
} from './services/game-action-service.js'
import { buildGameState } from './services/game-state-service.js'
import { ensurePlayerForTelegramUser } from './services/player-service.js'
import { supabaseAdmin } from './lib/supabase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webDistPath = path.resolve(__dirname, '../../web/dist')

export function createApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true, credentials: true })
  app.register(sensible)

  app.get('/health', async () => ({ ok: true }))

  app.get('/api/game/config', async () => ({
    appName: 'Kingdom Trail',
    slots: BASE_SLOTS,
    buildingConfig: BUILDING_CONFIG,
    castleRequirements: CASTLE_REQUIREMENTS,
    dictionaries: { en, ru },
  }))

  app.post<{ Body: TelegramAuthRequest }>('/api/auth/telegram', async (request, reply) => {
    try {
      const telegramData = validateTelegramInitData(request.body.initData, env.BOT_TOKEN)
      const player = await ensurePlayerForTelegramUser(telegramData.user)
      const token = signSessionToken(player.id)
      const gameState = await buildGameState(player.id)

      return { token, gameState }
    } catch (error) {
      request.log.error(error)
      return reply.unauthorized('Telegram authentication failed')
    }
  })

  if (env.NODE_ENV === 'development') {
    app.post('/api/auth/dev', async () => {
      const player = await ensurePlayerForTelegramUser({
        id: 9990001,
        username: 'dev_player',
        first_name: 'Developer',
        language_code: 'ru',
      })

      return {
        token: signSessionToken(player.id),
        gameState: await buildGameState(player.id),
      }
    })
  }

  app.get('/api/game/state', { preHandler: requireAuth }, async (request) => {
    return buildGameState(request.playerId)
  })

  app.post<{ Body: LanguageRequest }>('/api/game/language', { preHandler: requireAuth }, async (request, reply) => {
    const { error } = await supabaseAdmin
      .from('players')
      .update({ language: request.body.language, updated_at: new Date().toISOString() })
      .eq('id', request.playerId)

    if (error) {
      request.log.error(error)
      return reply.badRequest('Failed to update language')
    }

    return buildGameState(request.playerId)
  })

  app.post('/api/game/tutorial/complete', { preHandler: requireAuth }, async (request, reply) => {
    const { error } = await supabaseAdmin
      .from('players')
      .update({ tutorial_completed: true, updated_at: new Date().toISOString() })
      .eq('id', request.playerId)

    if (error) {
      request.log.error(error)
      return reply.badRequest('Failed to complete tutorial')
    }

    return buildGameState(request.playerId)
  })

  app.post<{ Body: BuildingActionRequest }>('/api/game/build', { preHandler: requireAuth }, async (request, reply) => {
    try {
      return await buildBuilding(request.playerId, request.body.buildingType)
    } catch (error) {
      if (error instanceof ActionError) {
        return reply.code(error.statusCode).send({ message: error.message })
      }

      request.log.error(error)
      return reply.internalServerError('Build failed')
    }
  })

  app.post<{ Body: BuildingActionRequest }>('/api/game/upgrade', { preHandler: requireAuth }, async (request, reply) => {
    try {
      return await upgradeBuilding(request.playerId, request.body.buildingType)
    } catch (error) {
      if (error instanceof ActionError) {
        return reply.code(error.statusCode).send({ message: error.message })
      }

      request.log.error(error)
      return reply.internalServerError('Upgrade failed')
    }
  })

  app.post<{ Body: BuildingActionRequest }>('/api/game/collect', { preHandler: requireAuth }, async (request, reply) => {
    try {
      return await collectBuildingResources(request.playerId, request.body.buildingType)
    } catch (error) {
      if (error instanceof ActionError) {
        return reply.code(error.statusCode).send({ message: error.message })
      }

      request.log.error(error)
      return reply.internalServerError('Collect failed')
    }
  })

  app.post('/api/game/construction/speedup', { preHandler: requireAuth }, async (request, reply) => {
    try {
      return await speedupConstruction(request.playerId)
    } catch (error) {
      if (error instanceof ActionError) {
        return reply.code(error.statusCode).send({ message: error.message })
      }

      request.log.error(error)
      return reply.internalServerError('Speedup failed')
    }
  })

  app.post('/webhook/telegram', {
    config: { rawBody: true },
    preHandler: (request, reply, done) => {
      const secret = request.headers['x-telegram-bot-api-secret-token']

      if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
        void reply.unauthorized('Invalid webhook secret')
        return
      }

      done()
    },
  }, createBotWebhookHandler({
    botToken: env.BOT_TOKEN,
    webAppUrl: env.WEBAPP_URL,
  }))

  if (env.NODE_ENV === 'production') {
    app.register(staticPlugin, {
      root: webDistPath,
      prefix: '/',
      wildcard: false,
    })

    app.get('/*', async (_request, reply) => {
      return reply.sendFile('index.html')
    })
  }

  return app
}
