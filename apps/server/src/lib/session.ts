import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

type SessionPayload = {
  sub: string
}

export function signSessionToken(playerId: string) {
  return jwt.sign({ sub: playerId }, env.JWT_SECRET, {
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
  })
}

export function verifySessionToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as SessionPayload
}
