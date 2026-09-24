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
import { AuthGuard } from '../auth/auth.guard'
import type { AuthenticatedRequest } from '../auth/auth.types'
import { assertAllowedOrigin } from '../common/security'
import { StayService } from './stay.service'

@Controller('api/stays')
@UseGuards(AuthGuard)
export class StayController {
  constructor(private readonly stayService: StayService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest) {
    assertAllowedOrigin(request)
    return this.stayService.create(request.auth!, request.body)
  }

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.stayService.list(request.auth!, status, page, pageSize)
  }

  @Get(':id')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.stayService.get(request.auth!, id)
  }

  @Post(':id/quote')
  quote(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.stayService.quote(request.auth!, id, request.body)
  }

  @Post(':id/payments')
  recordPayment(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.stayService.recordPayment(request.auth!, id, request.body)
  }

  @Post(':id/close')
  close(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    assertAllowedOrigin(request)
    return this.stayService.close(request.auth!, id, request.body)
  }
}
