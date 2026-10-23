import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiParam, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../auth/auth.guard'
import type { AuthenticatedRequest } from '../auth/auth.types'
import { assertAllowedOrigin } from '../common/security'
import { ExtraService } from './extra.service'
import { ApiEndpoint } from '../openapi/decorators'
import { openApiRef } from '../openapi/schemas'

@Controller('api')
@UseGuards(AuthGuard)
@ApiTags('extras')
@ApiCookieAuth('camping_session')
export class ExtraController {
  constructor(private readonly extraService: ExtraService) {}

  @Get('extra-templates')
  @ApiEndpoint({
    operationId: 'extraTemplateList',
    summary: 'Listar plantillas de extras',
    status: 200,
    response: { type: 'array', items: openApiRef('ExtraTemplate') },
    errors: [401, 500],
  })
  list(@Req() request: AuthenticatedRequest) {
    return this.extraService.listTemplates(request.auth!)
  }

  @Post('extra-templates')
  @ApiEndpoint({
    operationId: 'extraTemplateCreate',
    summary: 'Crear una plantilla de extra',
    status: 201,
    body: openApiRef('ExtraTemplateInput'),
    response: openApiRef('ExtraTemplate'),
    errors: [400, 401, 403, 409, 413, 500],
  })
  create(@Req() request: AuthenticatedRequest) {
    assertAllowedOrigin(request)
    return this.extraService.createTemplate(request.auth!, request.body)
  }

  @Patch('extra-templates/:id')
  @ApiEndpoint({
    operationId: 'extraTemplatePatch',
    summary: 'Editar o desactivar una plantilla',
    status: 200,
    body: openApiRef('ExtraTemplatePatch'),
    response: openApiRef('ExtraTemplate'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  patch(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.extraService.patchTemplate(request.auth!, id, request.body)
  }

  @Post('stays/:id/extras')
  @ApiEndpoint({
    operationId: 'stayExtraAdd',
    summary: 'Aplicar un extra a una estadía',
    status: 201,
    body: openApiRef('AddExtra'),
    response: openApiRef('Stay'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  add(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.extraService.add(request.auth!, id, request.body)
  }

  @Patch('stays/:id/extras/:extraId')
  @ApiEndpoint({
    operationId: 'stayExtraPatch',
    summary: 'Editar un extra aplicado',
    status: 200,
    body: openApiRef('UpdateExtra'),
    response: openApiRef('Stay'),
    errors: [400, 401, 403, 404, 409, 413, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  @ApiParam({ name: 'extraId', format: 'uuid', type: String })
  patchApplied(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('extraId', new ParseUUIDPipe()) extraId: string,
  ) {
    assertAllowedOrigin(request)
    return this.extraService.patch(request.auth!, id, extraId, request.body)
  }

  @Delete('stays/:id/extras/:extraId')
  @ApiEndpoint({
    operationId: 'stayExtraRemove',
    summary: 'Eliminar un extra aplicado',
    status: 200,
    response: openApiRef('Stay'),
    errors: [400, 401, 403, 404, 409, 500],
  })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  @ApiParam({ name: 'extraId', format: 'uuid', type: String })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('extraId', new ParseUUIDPipe()) extraId: string,
  ) {
    assertAllowedOrigin(request)
    return this.extraService.remove(request.auth!, id, extraId)
  }
}
