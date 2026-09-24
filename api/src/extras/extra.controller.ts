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
import { AuthGuard } from '../auth/auth.guard'
import type { AuthenticatedRequest } from '../auth/auth.types'
import { assertAllowedOrigin } from '../common/security'
import { ExtraService } from './extra.service'

@Controller('api')
@UseGuards(AuthGuard)
export class ExtraController {
  constructor(private readonly extraService: ExtraService) {}

  @Get('extra-templates')
  list(@Req() request: AuthenticatedRequest) {
    return this.extraService.listTemplates(request.auth!)
  }

  @Post('extra-templates')
  create(@Req() request: AuthenticatedRequest) {
    assertAllowedOrigin(request)
    return this.extraService.createTemplate(request.auth!, request.body)
  }

  @Patch('extra-templates/:id')
  patch(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.extraService.patchTemplate(request.auth!, id, request.body)
  }

  @Post('stays/:id/extras')
  add(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.extraService.add(request.auth!, id, request.body)
  }

  @Patch('stays/:id/extras/:extraId')
  patchApplied(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('extraId', new ParseUUIDPipe()) extraId: string,
  ) {
    assertAllowedOrigin(request)
    return this.extraService.patch(request.auth!, id, extraId, request.body)
  }

  @Delete('stays/:id/extras/:extraId')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('extraId', new ParseUUIDPipe()) extraId: string,
  ) {
    assertAllowedOrigin(request)
    return this.extraService.remove(request.auth!, id, extraId)
  }
}
