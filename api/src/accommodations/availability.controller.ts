import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../auth/auth.guard'
import type { AuthenticatedRequest } from '../auth/auth.types'
import { ApiEndpoint } from '../openapi/decorators'
import { openApiRef } from '../openapi/schemas'
import { AvailabilityService } from './availability.service'

@Controller('api/availability')
@UseGuards(AuthGuard)
@ApiTags('availability')
@ApiCookieAuth('camping_session')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @ApiEndpoint({
    operationId: 'availabilityRead',
    summary: 'Consultar disponibilidad por fecha',
    status: 200,
    response: openApiRef('AvailabilityResponse'),
    errors: [400, 401, 404, 500],
  })
  @ApiQuery({
    name: 'checkInDate',
    required: true,
    type: String,
    format: 'date',
  })
  @ApiQuery({
    name: 'checkOutDate',
    required: true,
    type: String,
    format: 'date',
  })
  @ApiQuery({
    name: 'typeId',
    required: false,
    type: String,
    format: 'uuid',
  })
  read(
    @Req() request: AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.availabilityService.read(request.auth!, query)
  }
}
