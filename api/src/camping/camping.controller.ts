import { Controller, Get, Patch, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import type { AuthenticatedRequest } from '../auth/auth.types'
import { assertAllowedOrigin } from '../common/security'
import { CampingService } from './camping.service'

@Controller('api/camping')
@UseGuards(AuthGuard)
export class CampingController {
  constructor(private readonly campingService: CampingService) {}

  @Get()
  profile(@Req() request: AuthenticatedRequest) {
    return this.campingService.profile(request.auth!)
  }

  @Patch('rates')
  updateRates(@Req() request: AuthenticatedRequest) {
    assertAllowedOrigin(request)
    return this.campingService.updateRates(request.auth!, request.body)
  }
}
