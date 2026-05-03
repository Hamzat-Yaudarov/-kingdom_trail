import crypto from 'node:crypto'

export type TelegramInitUser = {
  id: number
  username?: string
  first_name?: string
  language_code?: string
}

export type TelegramInitData = {
  authDate: number
  queryId: string | null
  user: TelegramInitUser
}

function timingSafeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')

  if (left.length !== right.length) {
    return false
  }

  return crypto.timingSafeEqual(left, right)
}

export function validateTelegramInitData(initData: string, botToken: string): TelegramInitData {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')

  if (!hash) {
    throw new Error('Missing Telegram hash')
  }

  params.delete('hash')

  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (!timingSafeEqualHex(computedHash, hash)) {
    throw new Error('Invalid Telegram signature')
  }

  const authDate = Number(params.get('auth_date'))

  if (!Number.isFinite(authDate)) {
    throw new Error('Invalid Telegram auth_date')
  }

  const maxAgeSeconds = 60 * 60 * 24
  if (Math.floor(Date.now() / 1000) - authDate > maxAgeSeconds) {
    throw new Error('Telegram auth has expired')
  }

  const userRaw = params.get('user')
  if (!userRaw) {
    throw new Error('Missing Telegram user')
  }

  const user = JSON.parse(userRaw) as TelegramInitUser

  return {
    authDate,
    queryId: params.get('query_id'),
    user,
  }
}
