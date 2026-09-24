import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
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

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
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
  async session(@Req() request: AuthenticatedRequest) {
    return this.authService.current(request.auth!)
  }

  @Post('logout')
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
