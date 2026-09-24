import { createHash, randomBytes } from 'node:crypto'
import type { Request } from 'express'
import { ForbiddenException } from '@nestjs/common'

export const SESSION_COOKIE = 'camping_session'
export const SESSION_TTL_SECONDS = 12 * 60 * 60

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.origin
  const configured = (process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (origin && !configured.includes(origin)) {
    throw new ForbiddenException({
      code: 'ORIGIN_NOT_ALLOWED',
      message: 'Origen no autorizado',
    })
  }
  if (
    !origin &&
    (process.env.REQUIRE_ORIGIN === 'true' ||
      process.env.NODE_ENV === 'production')
  ) {
    throw new ForbiddenException({
      code: 'ORIGIN_REQUIRED',
      message: 'Origen requerido',
    })
  }
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.cookie
  if (!header) return null
  for (const item of header.split(';')) {
    const [key, ...value] = item.trim().split('=')
    if (key === name) return value.join('=') || null
  }
  return null
}
