import { z } from 'zod'
import { getCountries, parsePhoneNumberFromString } from 'libphonenumber-js/min'
import {
  checkInRequestSchema as sharedCheckInRequestSchema,
  todayInTimezone,
} from '@camping/contracts'

export const countries = getCountries()
export { todayInTimezone }

export function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const count = z
  .number({ error: 'validation.count' })
  .int('validation.count')
  .nonnegative('validation.count')
  .max(Number.MAX_SAFE_INTEGER, 'validation.count')
const date = z.iso.date({ error: 'validation.date' })

const checkInFields = z.object({
  responsibleName: z.string().trim().min(1, 'validation.required'),
  document: z.string().trim(),
  nationality: z.union([z.literal(''), z.enum(countries)], {
    error: 'validation.nationality',
  }),
  phoneCountry: z.union([z.literal(''), z.enum(countries)], {
    error: 'validation.phoneCountryCode',
  }),
  phone: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' || (/^[0-9 ()-]+$/.test(value) && /[0-9]/.test(value)),
      'validation.phone',
    ),
  arrivalDate: date,
  estimatedDeparture: z.union([z.literal(''), date]),
  adults: count,
  children: count,
  infants: count,
  hasVehicle: z.boolean(),
  vehicleDescription: z.string().trim(),
  licensePlate: z.string().trim(),
  location: z.string().trim(),
})

export function checkInSchemaForTimezone(timezone: string) {
  return checkInFields
    .refine((values) => values.arrivalDate <= todayInTimezone(timezone), {
      path: ['arrivalDate'],
      error: 'validation.futureArrival',
    })
    .refine((values) => values.phone === '' || !!values.phoneCountry, {
      path: ['phoneCountry'],
      error: 'validation.phoneCountryCode',
    })
    .refine(
      (values) =>
        !values.phone ||
        !values.phoneCountry ||
        !!parsePhoneNumberFromString(
          values.phone,
          values.phoneCountry,
        )?.isPossible(),
      { path: ['phone'], error: 'validation.phone' },
    )
    .transform(({ phoneCountry, ...values }) => ({
      ...values,
      phone:
        values.phone && phoneCountry
          ? (parsePhoneNumberFromString(values.phone, phoneCountry)?.number ??
            '')
          : '',
      vehicleDescription: values.hasVehicle ? values.vehicleDescription : '',
      licensePlate: values.hasVehicle ? values.licensePlate : '',
    }))
    .pipe(sharedCheckInRequestSchema)
}

export const checkInSchema = checkInSchemaForTimezone('America/Santiago')
export const checkInRequestSchema = sharedCheckInRequestSchema
export type CheckInValues = z.input<ReturnType<typeof checkInSchemaForTimezone>>
export type CheckInRequest = z.output<
  ReturnType<typeof checkInSchemaForTimezone>
>

export function checkInDefaults(timezone = 'America/Santiago'): CheckInValues {
  return {
    responsibleName: '',
    document: '',
    nationality: '',
    phoneCountry: '',
    phone: '',
    arrivalDate: todayInTimezone(timezone),
    estimatedDeparture: '',
    adults: 1,
    children: 0,
    infants: 0,
    hasVehicle: true,
    vehicleDescription: '',
    licensePlate: '',
    location: '',
  }
}
