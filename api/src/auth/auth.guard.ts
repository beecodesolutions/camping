import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { unauthorized } from '../common/errors'
import { hashToken, readCookie, SESSION_COOKIE } from '../common/security'
import { SessionEntity } from '../database/entities/session.entity'
import type { AuthenticatedRequest } from './auth.types'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = readCookie(request, SESSION_COOKIE)
    if (!token) throw unauthorized()
    const session = await this.dataSource.getRepository(SessionEntity).findOne({
      where: { tokenHash: hashToken(token) },
      relations: { user: { camping: true } },
    })
    if (
      !session ||
      session.expiresAt <= new Date() ||
      !session.user.enabled ||
      !session.user.camping
    )
      throw unauthorized()
    request.auth = { user: session.user, camping: session.user.camping }
    return true
  }
}
