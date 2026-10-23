import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { CampingController } from './camping/camping.controller'
import { CampingService } from './camping/camping.service'
import { StayController } from './stays/stay.controller'
import { StayService } from './stays/stay.service'
import { ExtraController } from './extras/extra.controller'
import { ExtraService } from './extras/extra.service'
import { DatabaseModule } from './database/database.module'
import { AccommodationsController } from './accommodations/accommodations.controller'
import { AccommodationsService } from './accommodations/accommodations.service'
import { AvailabilityController } from './accommodations/availability.controller'
import { AvailabilityService } from './accommodations/availability.service'
import { ReservationController } from './reservations/reservation.controller'
import { ReservationPaymentsController } from './reservations/reservation-payments.controller'
import { ReservationService } from './reservations/reservation.service'
import { ReservationPaymentsService } from './reservations/reservation-payments.service'

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    CampingController,
    StayController,
    ExtraController,
    AccommodationsController,
    AvailabilityController,
    ReservationController,
    ReservationPaymentsController,
  ],
  providers: [
    CampingService,
    StayService,
    ExtraService,
    AccommodationsService,
    AvailabilityService,
    ReservationService,
    ReservationPaymentsService,
  ],
})
export class AppModule {}
