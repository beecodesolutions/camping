import { Module, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger'
import { AuthController } from '../auth/auth.controller'
import { AuthGuard } from '../auth/auth.guard'
import { AuthService } from '../auth/auth.service'
import { CampingController } from '../camping/camping.controller'
import { CampingService } from '../camping/camping.service'
import { ExtraController } from '../extras/extra.controller'
import { ExtraService } from '../extras/extra.service'
import { StayController } from '../stays/stay.controller'
import { StayService } from '../stays/stay.service'
import { openApiSchemas } from './schemas'
import { AccommodationsController } from '../accommodations/accommodations.controller'
import { AccommodationsService } from '../accommodations/accommodations.service'
import { AvailabilityController } from '../accommodations/availability.controller'
import { AvailabilityService } from '../accommodations/availability.service'
import { ReservationController } from '../reservations/reservation.controller'
import { ReservationPaymentsController } from '../reservations/reservation-payments.controller'
import { ReservationService } from '../reservations/reservation.service'
import { ReservationPaymentsService } from '../reservations/reservation-payments.service'
import { ReservationCheckInService } from '../reservations/reservation-checkin.service'

const documentationDataSource = {}

/**
 * This module contains the real controllers but inert providers. It is used by
 * the export CLI so creating a document never initializes TypeORM or requires
 * DATABASE_URL (or a reachable PostgreSQL server).
 */
@Module({
  controllers: [
    AuthController,
    CampingController,
    StayController,
    ExtraController,
    AccommodationsController,
    AvailabilityController,
    ReservationController,
    ReservationPaymentsController,
  ],
  providers: [
    { provide: DataSource, useValue: documentationDataSource },
    AuthService,
    AuthGuard,
    CampingService,
    StayService,
    ExtraService,
    AccommodationsService,
    AvailabilityService,
    ReservationService,
    ReservationPaymentsService,
    ReservationCheckInService,
  ],
})
export class OpenApiModule {}

export function openApiConfig() {
  return new DocumentBuilder()
    .setTitle('Maytu API')
    .setDescription(
      'HTTP contract for the Camping La Izuelina pilot. Business endpoints are scoped to the authenticated camping. Mutating requests must include an allowed Origin header; production requires an exact HTTPS origin.',
    )
    .setVersion('1.0.0')
    .setOpenAPIVersion('3.0.3')
    .addCookieAuth(
      'camping_session',
      {
        type: 'apiKey',
        in: 'cookie',
        description: 'HttpOnly session cookie issued by POST /api/auth/login.',
      },
      'camping_session',
    )
    .build()
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const document = SwaggerModule.createDocument(app, openApiConfig(), {
    deepScanRoutes: true,
  })
  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      ...openApiSchemas,
    },
  }
  return document
}

export async function createOfflineOpenApiDocument(): Promise<OpenAPIObject> {
  const app = await NestFactory.create(OpenApiModule, { logger: false })
  try {
    return createOpenApiDocument(app)
  } finally {
    await app.close()
  }
}
