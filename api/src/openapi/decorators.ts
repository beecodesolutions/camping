import { applyDecorators } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger'
import type { OpenApiSchema } from './schemas'
import { openApiRef } from './schemas'

type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 500

const errorDescriptions: Record<ApiErrorStatus, string> = {
  400: 'La solicitud no es válida',
  401: 'La sesión no es válida',
  403: 'El origen de la solicitud no está permitido',
  404: 'El recurso no existe',
  409: 'La operación entra en conflicto con el estado actual',
  413: 'El cuerpo de la solicitud es demasiado grande',
  500: 'No se pudo completar la operación',
}

export type ApiEndpointOptions = {
  operationId: string
  summary: string
  description?: string
  status: 200 | 201
  response?: OpenApiSchema
  responseDescription?: string
  body?: OpenApiSchema
  bodyDescription?: string
  errors?: readonly ApiErrorStatus[]
}

export function ApiEndpoint(options: ApiEndpointOptions): MethodDecorator {
  const decorators: MethodDecorator[] = [
    ApiOperation({
      operationId: options.operationId,
      summary: options.summary,
      description: options.description,
    }),
  ]
  if (options.body) {
    decorators.push(
      ApiBody({
        schema: options.body,
        description: options.bodyDescription,
        required: true,
      }),
    )
  }
  if (options.response) {
    decorators.push(
      ApiResponse({
        status: options.status,
        description: options.responseDescription ?? 'Operación exitosa',
        schema: options.response,
      }),
    )
  } else {
    decorators.push(
      ApiResponse({
        status: options.status,
        description: options.responseDescription ?? 'Operación exitosa',
      }),
    )
  }
  for (const status of options.errors ?? []) {
    decorators.push(
      ApiResponse({
        status,
        description: errorDescriptions[status],
        schema: openApiRef('Error'),
      }),
    )
  }
  return applyDecorators(...decorators)
}

export function ApiErrors(
  statuses: readonly ApiErrorStatus[],
): MethodDecorator {
  return applyDecorators(
    ...statuses.map((status): MethodDecorator =>
      ApiResponse({
        status,
        description: errorDescriptions[status],
        schema: openApiRef('Error'),
      }),
    ),
  )
}
