import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../auth/auth.guard'
import type { AuthenticatedRequest } from '../auth/auth.types'
import { assertAllowedOrigin } from '../common/security'
import { ApiEndpoint } from '../openapi/decorators'
import { openApiRef } from '../openapi/schemas'
import { AccommodationsService } from './accommodations.service'

@Controller('api/accommodations')
@UseGuards(AuthGuard)
@ApiTags('accommodations')
@ApiCookieAuth('camping_session')
export class AccommodationsController {
  constructor(private readonly accommodationsService: AccommodationsService) {}

  @Get('types')
  @ApiEndpoint({
    operationId: 'accommodationsTypeList',
    summary: 'Listar tipos de alojamiento',
    status: 200,
    response: { type: 'array', items: openApiRef('AccommodationType') },
    errors: [401, 500],
  })
  listTypes(
    @Req() request: AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.accommodationsService.listTypes(request.auth!, query)
  }

  @Get('types/:id')
  @ApiEndpoint({
    operationId: 'accommodationsTypeRead',
    summary: 'Consultar un tipo de alojamiento',
    status: 200,
    response: openApiRef('AccommodationType'),
    errors: [400, 401, 404, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  readType(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.accommodationsService.readType(request.auth!, id)
  }

  @Post('types')
  @ApiEndpoint({
    operationId: 'accommodationsTypeCreate',
    summary: 'Crear un tipo de alojamiento',
    status: 201,
    body: openApiRef('AccommodationTypeCreate'),
    response: openApiRef('AccommodationType'),
    errors: [400, 401, 403, 409, 413, 500],
  })
  createType(@Req() request: AuthenticatedRequest) {
    assertAllowedOrigin(request)
    return this.accommodationsService.createType(request.auth!, request.body)
  }

  @Patch('types/:id')
  @ApiEndpoint({
    operationId: 'accommodationsTypeUpdate',
    summary: 'Actualizar un tipo de alojamiento',
    status: 200,
    body: openApiRef('AccommodationTypePatch'),
    response: openApiRef('AccommodationType'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  updateType(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.accommodationsService.updateType(
      request.auth!,
      id,
      request.body,
    )
  }

  @Get('units')
  @ApiEndpoint({
    operationId: 'accommodationsUnitList',
    summary: 'Listar unidades de alojamiento',
    status: 200,
    response: { type: 'array', items: openApiRef('AccommodationUnit') },
    errors: [400, 401, 404, 500],
  })
  @ApiQuery({ name: 'typeId', required: false, format: 'uuid', type: String })
  listUnits(
    @Req() request: AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.accommodationsService.listUnits(request.auth!, query)
  }

  @Get('units/:id')
  @ApiEndpoint({
    operationId: 'accommodationsUnitRead',
    summary: 'Consultar una unidad de alojamiento',
    status: 200,
    response: openApiRef('AccommodationUnit'),
    errors: [400, 401, 404, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  readUnit(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.accommodationsService.readUnit(request.auth!, id)
  }

  @Post('units')
  @ApiEndpoint({
    operationId: 'accommodationsUnitCreate',
    summary: 'Crear una unidad de alojamiento',
    status: 201,
    body: openApiRef('AccommodationUnitCreate'),
    response: openApiRef('AccommodationUnit'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  createUnit(@Req() request: AuthenticatedRequest) {
    assertAllowedOrigin(request)
    return this.accommodationsService.createUnit(request.auth!, request.body)
  }

  @Patch('units/:id')
  @ApiEndpoint({
    operationId: 'accommodationsUnitUpdate',
    summary: 'Actualizar una unidad de alojamiento',
    status: 200,
    body: openApiRef('AccommodationUnitPatch'),
    response: openApiRef('AccommodationUnit'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  updateUnit(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.accommodationsService.updateUnit(
      request.auth!,
      id,
      request.body,
    )
  }

  @Get('blocks')
  @ApiEndpoint({
    operationId: 'accommodationsBlockList',
    summary: 'Listar bloqueos de inventario',
    status: 200,
    response: { type: 'array', items: openApiRef('ReservationBlock') },
    errors: [400, 401, 404, 500],
  })
  @ApiQuery({ name: 'typeId', required: false, format: 'uuid', type: String })
  @ApiQuery({ name: 'unitId', required: false, format: 'uuid', type: String })
  @ApiQuery({
    name: 'checkInDate',
    required: false,
    type: String,
    format: 'date',
  })
  @ApiQuery({
    name: 'checkOutDate',
    required: false,
    type: String,
    format: 'date',
  })
  listBlocks(
    @Req() request: AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.accommodationsService.listBlocks(request.auth!, query)
  }

  @Get('blocks/:id')
  @ApiEndpoint({
    operationId: 'accommodationsBlockRead',
    summary: 'Consultar un bloqueo de inventario',
    status: 200,
    response: openApiRef('ReservationBlock'),
    errors: [400, 401, 404, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  readBlock(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.accommodationsService.readBlock(request.auth!, id)
  }

  @Post('blocks')
  @ApiEndpoint({
    operationId: 'accommodationsBlockCreate',
    summary: 'Crear un bloqueo de inventario',
    status: 201,
    body: openApiRef('ReservationBlockCreate'),
    response: openApiRef('ReservationBlock'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  createBlock(@Req() request: AuthenticatedRequest) {
    assertAllowedOrigin(request)
    return this.accommodationsService.createBlock(request.auth!, request.body)
  }

  @Patch('blocks/:id')
  @ApiEndpoint({
    operationId: 'accommodationsBlockUpdate',
    summary: 'Actualizar un bloqueo de inventario',
    status: 200,
    body: openApiRef('ReservationBlockPatch'),
    response: openApiRef('ReservationBlock'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  updateBlock(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.accommodationsService.updateBlock(
      request.auth!,
      id,
      request.body,
    )
  }

  @Delete('blocks/:id')
  @ApiEndpoint({
    operationId: 'accommodationsBlockRelease',
    summary: 'Liberar un bloqueo de inventario',
    status: 200,
    response: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
      required: ['ok'],
      additionalProperties: false,
    },
    errors: [400, 401, 403, 404, 409, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  deleteBlock(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.accommodationsService.deleteBlock(request.auth!, id)
  }
}
