import {
  ArgumentsHost,
  Catch,
  HttpException,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'

// Never log database errors: they can contain guest data or credentials.
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    if (error instanceof HttpException) {
      const body = error.getResponse()
      // Nest wraps JSON parser errors in BadRequestException, dropping their type.
      // Only our explicitly structured validation responses may retain messages.
      if (
        error.getStatus() === 400 &&
        !(typeof body === 'object' && 'code' in body)
      ) {
        response.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'La solicitud no es válida',
        })
        return
      }
      response
        .status(error.getStatus())
        .json(typeof body === 'string' ? { message: body } : body)
      return
    }
    if (
      error &&
      typeof error === 'object' &&
      'type' in error &&
      (error.type === 'entity.parse.failed' ||
        error.type === 'entity.too.large')
    ) {
      response
        .status(error.type === 'entity.too.large' ? 413 : 400)
        .json({ code: 'INVALID_BODY', message: 'Cuerpo de solicitud inválido' })
      return
    }
    response.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'No se pudo completar la operación',
    })
  }
}
