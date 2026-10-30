import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'
import type { AuthenticatedRequest } from './auth.types'
import {
  assertAllowedOrigin,
  clearSessionCookie,
  readCookie,
  sessionCookie,
  SESSION_COOKIE,
} from '../common/security'
import { ApiEndpoint } from '../openapi/decorators'
import { openApiRef } from '../openapi/schemas'

@Controller('api/auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiEndpoint({
    operationId: 'authLogin',
    summary: 'Iniciar sesión',
    status: 201,
    body: openApiRef('LoginRequest'),
    response: openApiRef('SessionUser'),
    errors: [400, 401, 403, 413, 500],
  })
  async login(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertAllowedOrigin(request)
    const result = await this.authService.login(request.body)
    response.setHeader('Set-Cookie', sessionCookie(result.token))
    return result.user
  }

  @Get('session')
  @UseGuards(AuthGuard)
  @ApiCookieAuth('camping_session')
  @ApiEndpoint({
    operationId: 'authSession',
    summary: 'Consultar la sesión actual',
    status: 200,
    response: openApiRef('SessionUser'),
    errors: [401, 500],
  })
  async session(@Req() request: AuthenticatedRequest) {
    return this.authService.current(request.auth!)
  }

  @Post('logout')
  @ApiEndpoint({
    operationId: 'authLogout',
    summary: 'Cerrar sesión',
    status: 201,
    response: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
      required: ['ok'],
    },
    errors: [403, 500],
  })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertAllowedOrigin(request)
    await this.authService.logout(readCookie(request, SESSION_COOKIE))
    response.setHeader('Set-Cookie', clearSessionCookie())
    return { ok: true }
  }
}
