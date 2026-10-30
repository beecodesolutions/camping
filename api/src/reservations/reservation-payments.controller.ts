import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiParam, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../auth/auth.guard'
import type { AuthenticatedRequest } from '../auth/auth.types'
import { assertAllowedOrigin } from '../common/security'
import { ApiEndpoint } from '../openapi/decorators'
import { openApiRef } from '../openapi/schemas'
import { ReservationPaymentsService } from './reservation-payments.service'

@Controller('api/reservations')
@UseGuards(AuthGuard)
@ApiTags('reservations')
@ApiCookieAuth('camping_session')
export class ReservationPaymentsController {
  constructor(private readonly payments: ReservationPaymentsService) {}

  @Post(':id/payments')
  @ApiEndpoint({
    operationId: 'reservationPaymentRecord',
    summary: 'Registrar un pago de reserva',
    status: 201,
    body: openApiRef('ReservationPaymentInput'),
    response: openApiRef('Reservation'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  record(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.payments.recordPayment(request.auth!, id, request.body)
  }

  @Post(':id/payments/:paymentId/void')
  @ApiEndpoint({
    operationId: 'reservationPaymentVoid',
    summary: 'Anular un pago de reserva',
    status: 201,
    body: openApiRef('ReservationPaymentVoid'),
    response: openApiRef('Reservation'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  @ApiParam({ name: 'paymentId', format: 'uuid', type: String })
  void(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
  ) {
    assertAllowedOrigin(request)
    return this.payments.voidPayment(request.auth!, id, paymentId, request.body)
  }
}
