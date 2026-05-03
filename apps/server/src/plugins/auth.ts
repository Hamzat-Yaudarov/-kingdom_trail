import type { FastifyReply, FastifyRequest } from 'fastify'
import { verifySessionToken } from '../lib/session.js'

declare module 'fastify' {
  interface FastifyRequest {
    playerId: string
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return reply.unauthorized('Missing bearer token')
  }

  const token = header.slice('Bearer '.length)

  try {
    const payload = verifySessionToken(token)
    request.playerId = payload.sub
  } catch {
    return reply.unauthorized('Invalid session token')
  }
}
