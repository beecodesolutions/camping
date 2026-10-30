import { z } from 'zod'
import { safeCount } from './index'

const dateRangeMessage = 'checkOutDate must be after checkInDate'
const dateRangeMaximumMessage = 'date range cannot exceed 366 nights'

/**
 * Count calendar nights without applying a timezone. Availability dates are
 * PostgreSQL date values, so daylight-saving transitions must not change the
 * length of a requested range.
 */
function calendarDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}

function dateRangeIsValid(value: {
  checkInDate?: string
  checkOutDate?: string
}): boolean {
  return (
    value.checkInDate !== undefined &&
    value.checkOutDate !== undefined &&
    calendarDayNumber(value.checkOutDate) > calendarDayNumber(value.checkInDate)
  )
}

function dateRangeIsAtMost366Nights(value: {
  checkInDate?: string
  checkOutDate?: string
}): boolean {
  if (value.checkInDate === undefined || value.checkOutDate === undefined) {
    return true
  }
  return (
    calendarDayNumber(value.checkOutDate) -
      calendarDayNumber(value.checkInDate) <=
    366
  )
}

const availabilityDateRange = {
  checkInDate: z.iso.date(),
  checkOutDate: z.iso.date(),
}

/** Query parameters for GET /api/availability. */
export const availabilityQuerySchema = z
  .strictObject({
    ...availabilityDateRange,
    typeId: z.uuid().optional(),
  })
  .refine(dateRangeIsValid, {
    path: ['checkOutDate'],
    message: dateRangeMessage,
  })
  .refine(dateRangeIsAtMost366Nights, {
    path: ['checkOutDate'],
    message: dateRangeMaximumMessage,
  })
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>

/** GET /api/accommodations/types returns both enabled and disabled types. */
export const accommodationTypeListQuerySchema = z.strictObject({})
export type AccommodationTypeListQuery = z.infer<
  typeof accommodationTypeListQuerySchema
>

/** Optional type filter for GET /api/accommodations/units. */
export const accommodationUnitListQuerySchema = z.strictObject({
  typeId: z.uuid().optional(),
})
export type AccommodationUnitListQuery = z.infer<
  typeof accommodationUnitListQuerySchema
>

/**
 * Optional filters for GET /api/accommodations/blocks. Date filters are an
 * all-or-nothing range and use the same exclusive-end calendar semantics as
 * reservations.
 */
export const reservationBlockListQuerySchema = z
  .strictObject({
    typeId: z.uuid().optional(),
    unitId: z.uuid().optional(),
    checkInDate: z.iso.date().optional(),
    checkOutDate: z.iso.date().optional(),
  })
  .refine(
    (value) =>
      (value.checkInDate === undefined) === (value.checkOutDate === undefined),
    {
      path: ['checkOutDate'],
      message: 'checkInDate and checkOutDate must be supplied together',
    },
  )
  .refine(
    (value) =>
      value.checkInDate === undefined ||
      value.checkOutDate === undefined ||
      calendarDayNumber(value.checkOutDate) >
        calendarDayNumber(value.checkInDate),
    {
      path: ['checkOutDate'],
      message: dateRangeMessage,
    },
  )
export type ReservationBlockListQuery = z.infer<
  typeof reservationBlockListQuerySchema
>

const availabilityNightSchema = z.strictObject({
  date: z.iso.date(),
})

export const individualAvailabilityNightSchema = availabilityNightSchema.extend(
  {
    totalUnits: safeCount,
    reservedUnits: safeCount,
    blockedUnits: safeCount,
    availableUnits: safeCount,
  },
)

export const unlimitedAvailabilityNightSchema = availabilityNightSchema.extend({
  reservations: safeCount,
  adults: safeCount,
  children: safeCount,
  infants: safeCount,
})

export const individualAvailabilitySchema = z.strictObject({
  typeId: z.uuid(),
  inventoryMode: z.literal('individual'),
  nights: z.array(individualAvailabilityNightSchema),
  availableUnitIds: z.array(z.uuid()),
})

export const unlimitedAvailabilitySchema = z.strictObject({
  typeId: z.uuid(),
  inventoryMode: z.literal('unlimited'),
  nights: z.array(unlimitedAvailabilityNightSchema),
})

export const availabilityTypeSchema = z.discriminatedUnion('inventoryMode', [
  individualAvailabilitySchema,
  unlimitedAvailabilitySchema,
])

export const availabilityResponseSchema = z.strictObject({
  checkInDate: z.iso.date(),
  checkOutDate: z.iso.date(),
  types: z.array(availabilityTypeSchema),
})
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>
export type IndividualAvailability = z.infer<
  typeof individualAvailabilitySchema
>
export type UnlimitedAvailability = z.infer<typeof unlimitedAvailabilitySchema>

/** Schemas exposed as stable OpenAPI components for the availability routes. */
export const availabilityOpenApiSchemas = {
  availabilityQuery: availabilityQuerySchema,
  availabilityIndividualNight: individualAvailabilityNightSchema,
  availabilityUnlimitedNight: unlimitedAvailabilityNightSchema,
  availabilityIndividual: individualAvailabilitySchema,
  availabilityUnlimited: unlimitedAvailabilitySchema,
  availabilityType: availabilityTypeSchema,
  availabilityResponse: availabilityResponseSchema,
} as const
export type AvailabilityOpenApiSchemas = typeof availabilityOpenApiSchemas
