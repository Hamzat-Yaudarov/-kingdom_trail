import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootEnvPath = path.resolve(__dirname, '../../../../.env')

dotenv.config({ path: rootEnvPath })

function normalizeSupabaseUrl(rawUrl: string) {
  return rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url(),
  WEBAPP_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_PROJECT_ID: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  SESSION_TTL_HOURS: z.coerce.number().default(168),
})

const parsedEnv = envSchema.parse(process.env)

export const env = {
  ...parsedEnv,
  SUPABASE_URL: normalizeSupabaseUrl(parsedEnv.SUPABASE_URL),
}
