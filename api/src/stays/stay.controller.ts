import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../auth/auth.guard'
import type { AuthenticatedRequest } from '../auth/auth.types'
import { assertAllowedOrigin } from '../common/security'
import { StayService } from './stay.service'
import { ApiEndpoint } from '../openapi/decorators'
import { openApiRef } from '../openapi/schemas'

@Controller('api/stays')
@UseGuards(AuthGuard)
@ApiTags('stays')
@ApiCookieAuth('camping_session')
export class StayController {
  constructor(private readonly stayService: StayService) {}

  @Post()
  @ApiEndpoint({
    operationId: 'stayCreate',
    summary: 'Registrar una estadía',
    status: 201,
    body: openApiRef('CheckInRequest'),
    response: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
      additionalProperties: false,
    },
    errors: [400, 401, 403, 413, 500],
  })
  create(@Req() request: AuthenticatedRequest) {
    assertAllowedOrigin(request)
    return this.stayService.create(request.auth!, request.body)
  }

  @Get()
  @ApiEndpoint({
    operationId: 'stayList',
    summary: 'Listar estadías por estado',
    status: 200,
    response: openApiRef('StayPage'),
    errors: [400, 401, 500],
  })
  @ApiQuery({
    name: 'accommodation',
    required: false,
    enum: ['total', 'camping', 'individual'],
  })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'closed'] })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    minimum: 1,
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    minimum: 1,
    example: 25,
  })
  list(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('accommodation') accommodation?: string,
  ) {
    return this.stayService.list(
      request.auth!,
      status,
      page,
      pageSize,
      accommodation,
    )
  }

  @Get(':id')
  @ApiEndpoint({
    operationId: 'stayGet',
    summary: 'Consultar una estadía',
    status: 200,
    response: openApiRef('Stay'),
    errors: [400, 401, 404, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  get(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.stayService.get(request.auth!, id)
  }

  @Post(':id/quote')
  @ApiEndpoint({
    operationId: 'stayQuote',
    summary: 'Cotizar una fecha de salida',
    status: 201,
    body: openApiRef('QuoteRequest'),
    response: openApiRef('StayQuote'),
    errors: [400, 401, 403, 404, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  quote(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.stayService.quote(request.auth!, id, request.body)
  }

  @Post(':id/payments')
  @ApiEndpoint({
    operationId: 'stayRecordPayment',
    summary: 'Registrar un pago o anticipo',
    status: 201,
    body: openApiRef('PaymentInput'),
    response: openApiRef('Stay'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  recordPayment(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.stayService.recordPayment(request.auth!, id, request.body)
  }

  @Post(':id/close')
  @ApiEndpoint({
    operationId: 'stayClose',
    summary: 'Cerrar una estadía con saldo cero',
    status: 201,
    body: openApiRef('CloseRequest'),
    response: openApiRef('Stay'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  close(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.stayService.close(request.auth!, id, request.body)
  }
}
