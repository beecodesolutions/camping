import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import argon2 from 'argon2'
import { DataSource } from 'typeorm'
import { loginSchema, type SessionUser } from '@camping/contracts'
import { zodBadRequest, unauthorized } from '../common/errors'
import {
  createSessionToken,
  hashToken,
  SESSION_TTL_SECONDS,
} from '../common/security'
import { SessionEntity } from '../database/entities/session.entity'
import { UserEntity } from '../database/entities/user.entity'
import type { AuthContext } from './auth.types'

const MAX_FAILED_LOGINS = 5
const LOGIN_BLOCK_SECONDS = 5 * 60

@Injectable()
export class AuthService {
  constructor(private readonly dataSource: DataSource) {}

  async login(rawBody: unknown): Promise<{ user: SessionUser; token: string }> {
    const parsed = loginSchema.safeParse(rawBody)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      const user = await runner.manager.findOne(UserEntity, {
        where: { username: parsed.data.username },
        lock: { mode: 'pessimistic_write' },
      })
      const now = new Date()
      if (
        !user ||
        !user.enabled ||
        (user.loginBlockedUntil && user.loginBlockedUntil > now)
      )
        throw unauthorized()
      const valid = await argon2
        .verify(user.passwordHash, parsed.data.password)
        .catch(() => false)
      if (!valid) {
        user.failedLoginCount += 1
        if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
          user.failedLoginCount = 0
          user.loginBlockedUntil = new Date(
            now.getTime() + LOGIN_BLOCK_SECONDS * 1000,
          )
        }
        await runner.manager.save(user)
        await runner.commitTransaction()
        throw unauthorized()
      }
      user.failedLoginCount = 0
      user.loginBlockedUntil = null
      await runner.manager.save(user)
      const token = createSessionToken()
      await runner.manager.save(
        runner.manager.create(SessionEntity, {
          id: randomUUID(),
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000),
        }),
      )
      await runner.commitTransaction()
      return { user: this.toSessionUser(user), token }
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction()
      throw error
    } finally {
      await runner.release()
    }
  }

  async current(context: AuthContext): Promise<SessionUser> {
    return this.toSessionUser(context.user)
  }

  async logout(token: string | null): Promise<void> {
    if (!token) return
    await this.dataSource
      .getRepository(SessionEntity)
      .delete({ tokenHash: hashToken(token) })
  }

  async createUser(input: {
    username: string
    name: string
    password: string
    campingId: string
  }): Promise<SessionUser> {
    const repository = this.dataSource.getRepository(UserEntity)
    const user = repository.create({
      username: input.username.trim(),
      name: input.name.trim(),
      campingId: input.campingId,
      passwordHash: await argon2.hash(input.password, {
        type: argon2.argon2id,
      }),
      enabled: true,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      loginBlockedUntil: null,
    })
    await repository.save(user)
    return this.toSessionUser(user)
  }

  private toSessionUser(user: UserEntity): SessionUser {
    return { id: user.id, username: user.username, name: user.name }
  }
}
