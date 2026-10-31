import { z } from 'zod'
import { getCountries, parsePhoneNumberFromString } from 'libphonenumber-js/min'
import {
  reservationQuoteCreateSchema,
  todayInTimezone,
  type AccommodationType,
  type AccommodationUnit,
  type ReservationQuoteCreate,
} from '@camping/contracts'
import { addDays } from '../services/calendar'

const countries = getCountries()
const count = z
  .number({ error: 'validation.count' })
  .int('validation.count')
  .min(0, 'validation.count')
  .max(2_147_483_647, 'validation.count')
const fields = z.object({
  accommodationTypeId: z.string().min(1, 'reservationCreate.selectType'),
  unitId: z.string(),
  checkInDate: z.iso.date({ error: 'validation.date' }),
  checkOutDate: z.iso.date({ error: 'validation.date' }),
  adults: count,
  children: count,
  infants: count,
  responsibleName: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(200, 'validation.invalid'),
  document: z.string().trim().max(100, 'validation.invalid'),
  nationality: z.union([z.literal(''), z.enum(countries)]),
  phoneCountry: z.union([z.literal(''), z.enum(countries)]),
  phone: z.string().trim(),
  email: z.union([
    z.literal(''),
    z.email({ error: 'reservationCreate.invalidEmail' }).max(254),
  ]),
  source: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(100, 'validation.invalid'),
  notes: z.string().trim().max(500, 'validation.invalid'),
})
export type ReservationFormValues = z.infer<typeof fields>

export function reservationFormSchema(
  types: AccommodationType[],
  units: AccommodationUnit[],
) {
  return fields.superRefine((value, ctx) => {
    const type = types.find(
      (item) => item.id === value.accommodationTypeId && item.enabled,
    )
    if (!type)
      ctx.addIssue({
        code: 'custom',
        path: ['accommodationTypeId'],
        message: 'reservationCreate.selectType',
      })
    if (
      type?.inventoryMode === 'individual' &&
      !units.some(
        (unit) =>
          unit.id === value.unitId && unit.typeId === type.id && unit.enabled,
      )
    )
      ctx.addIssue({
        code: 'custom',
        path: ['unitId'],
        message: 'reservationCreate.selectUnit',
      })
    if (value.checkOutDate <= value.checkInDate)
      ctx.addIssue({
        code: 'custom',
        path: ['checkOutDate'],
        message: 'reservationCreate.invalidDeparture',
      })
    if (value.adults + value.children + value.infants === 0)
      ctx.addIssue({
        code: 'custom',
        path: ['adults'],
        message: 'reservationCreate.guestsRequired',
      })
    if (value.phone) {
      if (!value.phoneCountry)
        ctx.addIssue({
          code: 'custom',
          path: ['phoneCountry'],
          message: 'validation.phoneCountryCode',
        })
      if (
        !/^[0-9 ()-]+$/.test(value.phone) ||
        !value.phoneCountry ||
        !parsePhoneNumberFromString(
          value.phone,
          value.phoneCountry,
        )?.isPossible()
      )
        ctx.addIssue({
          code: 'custom',
          path: ['phone'],
          message: 'validation.phone',
        })
    }
  })
}

export function reservationDefaults(timezone: string): ReservationFormValues {
  const checkInDate = todayInTimezone(timezone)
  return {
    accommodationTypeId: '',
    unitId: '',
    checkInDate,
    checkOutDate: addDays(checkInDate, 1),
    adults: 1,
    children: 0,
    infants: 0,
    responsibleName: '',
    document: '',
    nationality: '',
    phoneCountry: '',
    phone: '',
    email: '',
    notes: '',
    source: 'manual',
  }
}

export function reservationQuoteInput(
  value: ReservationFormValues,
  type: AccommodationType,
): ReservationQuoteCreate {
  return reservationQuoteCreateSchema.parse({
    accommodationTypeId: value.accommodationTypeId,
    ...(type.inventoryMode === 'individual' ? { unitId: value.unitId } : {}),
    checkInDate: value.checkInDate,
    checkOutDate: value.checkOutDate,
    adults: value.adults,
    children: value.children,
    infants: value.infants,
  })
}

export function reservationContact(value: ReservationFormValues) {
  return {
    responsibleName: value.responsibleName,
    ...(value.document ? { document: value.document } : {}),
    ...(value.nationality ? { nationality: value.nationality } : {}),
    ...(value.email ? { email: value.email } : {}),
    ...(value.phone && value.phoneCountry
      ? {
          phone: parsePhoneNumberFromString(value.phone, value.phoneCountry)
            ?.number,
        }
      : {}),
    notes: value.notes,
    source: value.source,
  }
}

export function reservationValidationFields(
  error: unknown,
): (keyof ReservationFormValues)[] {
  const parsed = z
    .object({
      data: z.object({
        fields: z.array(z.object({ path: z.array(z.string()) })),
      }),
    })
    .safeParse(error)
  if (!parsed.success) return []
  return parsed.data.data.fields.flatMap(({ path }) => {
    const field = fields.keyof().safeParse(path[0])
    return field.success ? [field.data] : []
  })
}
