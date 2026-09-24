import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import type { ZodError } from 'zod'

export function zodBadRequest(error: ZodError): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'La solicitud no es válida',
    fields: error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
    })),
  })
}

export function notFound(resource = 'Recurso'): NotFoundException {
  return new NotFoundException({
    code: 'NOT_FOUND',
    message: `${resource} no encontrado`,
  })
}

export function conflict(
  message: string,
  code = 'CONFLICT',
): ConflictException {
  return new ConflictException({ code, message })
}

export function unauthorized(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'UNAUTHORIZED',
    message: 'Sesión no válida',
  })
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof HttpException
    ? false
    : Boolean(
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505',
      )
}
