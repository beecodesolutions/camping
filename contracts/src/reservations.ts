import { z } from 'zod'
import {
  ageRangesSchema,
  countries,
  moneySchema,
  paymentMethodSchema,
  ratesSchema,
  safeCount,
} from './index'

/**
 * Reservation dates are calendar dates. The end date is exclusive, so a
 * reservation must cover at least one night.
 *
 * Zod refinements are intentionally kept in the source contract. They are
 * not represented by z.toJSONSchema and must also be enforced by services.
 */
const dateRangeMessage = 'checkOutDate must be after checkInDate'
const dateRange = {
  checkInDate: z.iso.date(),
  checkOutDate: z.iso.date(),
}

const optionalDateRangeSchema = z
  .strictObject({
    checkInDate: dateRange.checkInDate.optional(),
    checkOutDate: dateRange.checkOutDate.optional(),
  })
  .refine(
    (value) =>
      value.checkInDate === undefined ||
      value.checkOutDate === undefined ||
      value.checkOutDate > value.checkInDate,
    {
      path: ['checkOutDate'],
      message: dateRangeMessage,
    },
  )
// A partial patch may contain either date alone. Services must merge it with
// the stored reservation and validate the complete replacement range.

const nonBlankText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => /\S/.test(value))

const optionalText = (max: number) => z.string().max(max)
const postgresIntMax = 2_147_483_647
const reservationCount = safeCount.max(postgresIntMax)
const reservationVersion = safeCount.min(1).max(postgresIntMax)
const reservationPhoneSchema = z
  .string()
  .refine(
    (value) => value === '' || /^\+[1-9]\d{1,14}$/.test(value),
    'phone must use E.164 format',
  )
const reservationNationalitySchema = z.union([z.literal(''), z.enum(countries)])

const reservationPriceOverrideFields = {
  /** A negotiated total in the camping currency, in minor units. */
  agreedTotalMinor: moneySchema.optional(),
  priceAdjustmentReason: nonBlankText(500).optional(),
}

const priceOverrideIsComplete = (value: {
  agreedTotalMinor?: number
  priceAdjustmentReason?: string
}) =>
  (value.agreedTotalMinor === undefined &&
    value.priceAdjustmentReason === undefined) ||
  (value.agreedTotalMinor !== undefined &&
    value.priceAdjustmentReason !== undefined)

const priceOverrideMessage =
  'agreedTotalMinor and priceAdjustmentReason must be supplied together'

const reservationGuestCountIsPositive = (value: {
  adults: number
  children: number
  infants: number
}) =>
  Number.isSafeInteger(value.adults + value.children + value.infants) &&
  value.adults + value.children + value.infants > 0

export const inventoryModeSchema = z.enum(['individual', 'unlimited'])
export type InventoryMode = z.infer<typeof inventoryModeSchema>

export const reservationStatusSchema = z.enum([
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
])
export type ReservationStatus = z.infer<typeof reservationStatusSchema>

/** Provider-neutral source code, for example `manual` or `website`. */
export const reservationSourceSchema = nonBlankText(100)
export type ReservationSource = z.infer<typeof reservationSourceSchema>

export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/)
export type CurrencyCode = z.infer<typeof currencyCodeSchema>

const idSchema = z.uuid()
const safeSignedAmountSchema = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER)

const priceSnapshotCommon = {
  currency: currencyCodeSchema,
  totalMinor: moneySchema,
  /** Signed to support either a surcharge or a negotiated discount. */
  adjustmentMinor: safeSignedAmountSchema.optional(),
  adjustmentReason: optionalText(500).optional(),
}

const priceAdjustmentIsComplete = (
  value: z.infer<typeof priceSnapshotCommonSchema>,
) =>
  (value.adjustmentMinor === undefined &&
    value.adjustmentReason === undefined) ||
  (value.adjustmentMinor !== undefined &&
    value.adjustmentReason !== undefined &&
    /\S/.test(value.adjustmentReason))

const priceSnapshotCommonSchema = z.strictObject(priceSnapshotCommon)

export const perUnitPriceSnapshotSchema = z
  .strictObject({
    basis: z.literal('per_unit'),
    ...priceSnapshotCommon,
    baseNightlyPriceMinor: moneySchema,
    nights: reservationCount.min(1),
  })
  .refine(priceAdjustmentIsComplete, {
    path: ['adjustmentReason'],
    message: 'adjustmentMinor and adjustmentReason must be supplied together',
  })

export const perPersonPriceSnapshotSchema = z
  .strictObject({
    basis: z.literal('per_person'),
    ...priceSnapshotCommon,
    ageRanges: ageRangesSchema,
    rates: ratesSchema,
    nights: reservationCount.min(1),
  })
  .refine(priceAdjustmentIsComplete, {
    path: ['adjustmentReason'],
    message: 'adjustmentMinor and adjustmentReason must be supplied together',
  })

export const reservationPriceSnapshotSchema = z.discriminatedUnion('basis', [
  perUnitPriceSnapshotSchema,
  perPersonPriceSnapshotSchema,
])
export type ReservationPriceSnapshot = z.infer<
  typeof reservationPriceSnapshotSchema
>

const accommodationTypeValuesSchema = z.strictObject({
  name: nonBlankText(200),
  inventoryMode: inventoryModeSchema,
  maxOccupancy: reservationCount.nullable(),
  baseNightlyPriceMinor: moneySchema,
  enabled: z.boolean(),
})

const accommodationTypeInvariant = (value: {
  inventoryMode: InventoryMode
  maxOccupancy: number | null
}) =>
  (value.inventoryMode === 'unlimited' && value.maxOccupancy === null) ||
  (value.inventoryMode === 'individual' &&
    value.maxOccupancy !== null &&
    value.maxOccupancy >= 1)

const accommodationTypeInvariantMessage =
  'individual inventory requires maxOccupancy >= 1; unlimited inventory requires null'

export const accommodationTypeCreateSchema =
  accommodationTypeValuesSchema.refine(accommodationTypeInvariant, {
    path: ['maxOccupancy'],
    message: accommodationTypeInvariantMessage,
  })
export type AccommodationTypeCreate = z.infer<
  typeof accommodationTypeCreateSchema
>

export const accommodationTypePatchSchema = accommodationTypeValuesSchema
  .partial()
  .strict()
// Mode/maxOccupancy compatibility is validated after merging a patch with the
// stored type; a partial patch cannot establish that invariant by itself.
export type AccommodationTypePatch = z.infer<
  typeof accommodationTypePatchSchema
>

export const accommodationTypeSchema = accommodationTypeValuesSchema
  .extend({
    id: idSchema,
    campingId: idSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .refine(accommodationTypeInvariant, {
    path: ['maxOccupancy'],
    message: accommodationTypeInvariantMessage,
  })
export type AccommodationType = z.infer<typeof accommodationTypeSchema>

const accommodationUnitValuesSchema = z.strictObject({
  typeId: idSchema,
  name: nonBlankText(200),
  enabled: z.boolean(),
})

export const accommodationUnitCreateSchema = accommodationUnitValuesSchema
export type AccommodationUnitCreate = z.infer<
  typeof accommodationUnitCreateSchema
>

export const accommodationUnitPatchSchema = accommodationUnitValuesSchema
  .partial()
  .strict()
export type AccommodationUnitPatch = z.infer<
  typeof accommodationUnitPatchSchema
>

export const accommodationUnitSchema = accommodationUnitValuesSchema.extend({
  id: idSchema,
  campingId: idSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type AccommodationUnit = z.infer<typeof accommodationUnitSchema>

const reservationBlockValuesSchema = z
  .strictObject({
    typeId: idSchema,
    unitId: idSchema,
    ...dateRange,
    reason: nonBlankText(200),
  })
  .refine((value) => value.checkOutDate > value.checkInDate, {
    path: ['checkOutDate'],
    message: dateRangeMessage,
  })

export const reservationBlockCreateSchema = reservationBlockValuesSchema
export type ReservationBlockCreate = z.infer<
  typeof reservationBlockCreateSchema
>

export const reservationBlockPatchSchema = z
  .strictObject({
    typeId: idSchema.optional(),
    unitId: idSchema.optional(),
    checkInDate: z.iso.date().optional(),
    checkOutDate: z.iso.date().optional(),
    reason: nonBlankText(200).optional(),
  })
  .refine(
    (value) =>
      value.checkInDate === undefined ||
      value.checkOutDate === undefined ||
      value.checkOutDate > value.checkInDate,
    { path: ['checkOutDate'], message: dateRangeMessage },
  )
export type ReservationBlockPatch = z.infer<typeof reservationBlockPatchSchema>

export const reservationBlockSchema = reservationBlockValuesSchema.extend({
  id: idSchema,
  campingId: idSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ReservationBlock = z.infer<typeof reservationBlockSchema>

const reservationValuesSchema = z
  .strictObject({
    accommodationTypeId: idSchema,
    unitId: idSchema.optional(),
    ...dateRange,
    responsibleName: nonBlankText(200),
    email: z.email().max(254).optional(),
    phone: reservationPhoneSchema.optional(),
    document: optionalText(100).optional(),
    nationality: reservationNationalitySchema.optional(),
    adults: reservationCount,
    children: reservationCount,
    infants: reservationCount,
    source: reservationSourceSchema.optional(),
    notes: optionalText(500).optional(),
    idempotencyKey: idSchema,
    acceptedTotalMinor: moneySchema,
    ...reservationPriceOverrideFields,
  })
  .refine((value) => value.checkOutDate > value.checkInDate, {
    path: ['checkOutDate'],
    message: dateRangeMessage,
  })
  .refine(reservationGuestCountIsPositive, {
    path: ['adults'],
    message: 'at least one guest is required',
  })
  .refine(priceOverrideIsComplete, {
    path: ['priceAdjustmentReason'],
    message: priceOverrideMessage,
  })

export const reservationCreateSchema = reservationValuesSchema
export type ReservationCreate = z.infer<typeof reservationCreateSchema>

/**
 * Inputs for a creation preview. Contact and idempotency fields are omitted
 * because a quote does not create a reservation or consume a key.
 */
export const reservationQuoteCreateSchema = z
  .strictObject({
    accommodationTypeId: idSchema,
    unitId: idSchema.optional(),
    ...dateRange,
    adults: reservationCount,
    children: reservationCount,
    infants: reservationCount,
    ...reservationPriceOverrideFields,
  })
  .refine((value) => value.checkOutDate > value.checkInDate, {
    path: ['checkOutDate'],
    message: dateRangeMessage,
  })
  .refine(reservationGuestCountIsPositive, {
    path: ['adults'],
    message: 'at least one guest is required',
  })
  .refine(priceOverrideIsComplete, {
    path: ['priceAdjustmentReason'],
    message: priceOverrideMessage,
  })
export type ReservationQuoteCreate = z.infer<
  typeof reservationQuoteCreateSchema
>

const reservationPatchFields = {
  accommodationTypeId: idSchema.optional(),
  unitId: idSchema.nullable().optional(),
  ...optionalDateRangeSchema.shape,
  responsibleName: nonBlankText(200).optional(),
  email: z.email().max(254).nullable().optional(),
  phone: reservationPhoneSchema.nullable().optional(),
  document: optionalText(100).nullable().optional(),
  nationality: reservationNationalitySchema.nullable().optional(),
  adults: reservationCount.optional(),
  children: reservationCount.optional(),
  infants: reservationCount.optional(),
  source: reservationSourceSchema.optional(),
  notes: optionalText(500).nullable().optional(),
  version: reservationVersion,
  acceptedTotalMinor: moneySchema.optional(),
  ...reservationPriceOverrideFields,
}

const {
  acceptedTotalMinor: _acceptedTotalMinor,
  ...reservationQuoteUpdateFields
} = reservationPatchFields

const reservationPatchGuestCountIsValid = (value: {
  adults?: number
  children?: number
  infants?: number
}) =>
  !(
    value.adults !== undefined &&
    value.children !== undefined &&
    value.infants !== undefined &&
    value.adults + value.children + value.infants === 0
  )

const reservationPatchDateRangeIsValid = (value: {
  checkInDate?: string
  checkOutDate?: string
}) =>
  value.checkInDate === undefined ||
  value.checkOutDate === undefined ||
  value.checkOutDate > value.checkInDate

const reservationPatchSchemaFromFields = z
  .strictObject(reservationPatchFields)
  .refine(reservationPatchDateRangeIsValid, {
    path: ['checkOutDate'],
    message: dateRangeMessage,
  })
  .refine(reservationPatchGuestCountIsValid, {
    path: ['adults'],
    message: 'at least one guest is required',
  })
  .refine(priceOverrideIsComplete, {
    path: ['priceAdjustmentReason'],
    message: priceOverrideMessage,
  })

export const reservationPatchSchema = reservationPatchSchemaFromFields
export type ReservationPatch = z.infer<typeof reservationPatchSchema>

/** Same editable fields as PATCH, excluding the accepted price. */
export const reservationQuoteUpdateSchema = z
  .strictObject(reservationQuoteUpdateFields)
  .refine(reservationPatchDateRangeIsValid, {
    path: ['checkOutDate'],
    message: dateRangeMessage,
  })
  .refine(reservationPatchGuestCountIsValid, {
    path: ['adults'],
    message: 'at least one guest is required',
  })
  .refine(priceOverrideIsComplete, {
    path: ['priceAdjustmentReason'],
    message: priceOverrideMessage,
  })
export type ReservationQuoteUpdate = z.infer<
  typeof reservationQuoteUpdateSchema
>

export const reservationAccountSchema = z.strictObject({
  totalMinor: moneySchema,
  paidMinor: moneySchema,
  balanceMinor: safeSignedAmountSchema,
})
export type ReservationAccount = z.infer<typeof reservationAccountSchema>

export const reservationResponseSchema = z.strictObject({
  id: idSchema,
  campingId: idSchema,
  accommodationTypeId: idSchema,
  unitId: idSchema.nullable(),
  checkInDate: dateRange.checkInDate,
  checkOutDate: dateRange.checkOutDate,
  responsibleName: nonBlankText(200),
  email: z.email().max(254).nullable(),
  phone: reservationPhoneSchema.nullable(),
  document: optionalText(100).nullable(),
  nationality: reservationNationalitySchema.nullable(),
  adults: reservationCount,
  children: reservationCount,
  infants: reservationCount,
  status: reservationStatusSchema,
  source: reservationSourceSchema,
  notes: optionalText(500),
  priceSnapshot: reservationPriceSnapshotSchema,
  payments: z.array(z.lazy(() => reservationPaymentSchema)),
  account: reservationAccountSchema,
  version: reservationVersion,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ReservationResponse = z.infer<typeof reservationResponseSchema>
export type Reservation = ReservationResponse

/** Price returned by either creation or edit previews. */
export const reservationQuoteSchema = z.strictObject({
  priceSnapshot: reservationPriceSnapshotSchema,
})
export type ReservationQuote = z.infer<typeof reservationQuoteSchema>

/** Price returned by an edit preview, with the current reservation version. */
export const reservationUpdateQuoteSchema = z.strictObject({
  reservationId: idSchema,
  version: reservationVersion,
  priceSnapshot: reservationPriceSnapshotSchema,
})
export type ReservationUpdateQuote = z.infer<
  typeof reservationUpdateQuoteSchema
>

export const reservationStatusCommandSchema = z.strictObject({
  version: reservationVersion,
})
export type ReservationStatusCommand = z.infer<
  typeof reservationStatusCommandSchema
>

const reservationListDateRange = {
  checkInDate: z.iso.date().optional(),
  checkOutDate: z.iso.date().optional(),
}

const calendarDayNumber = (value: string): number => {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}

export const reservationListQuerySchema = z
  .strictObject({
    status: reservationStatusSchema.optional(),
    typeId: idSchema.optional(),
    ...reservationListDateRange,
    page: z.coerce.number().int().min(1).max(postgresIntMax).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
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
    { path: ['checkOutDate'], message: dateRangeMessage },
  )
  .refine(
    (value) =>
      value.checkInDate === undefined ||
      value.checkOutDate === undefined ||
      calendarDayNumber(value.checkOutDate) -
        calendarDayNumber(value.checkInDate) <=
        366,
    {
      path: ['checkOutDate'],
      message: 'date range cannot exceed 366 nights',
    },
  )
export type ReservationListQuery = z.infer<typeof reservationListQuerySchema>

export const reservationPageSchema = z.strictObject({
  items: z.array(reservationResponseSchema),
  total: safeCount,
  page: reservationVersion,
  pageSize: reservationCount.min(1).max(100),
})
export type ReservationPage = z.infer<typeof reservationPageSchema>

export const reservationPaymentMethodSchema = paymentMethodSchema
export type ReservationPaymentMethod = z.infer<
  typeof reservationPaymentMethodSchema
>

export const reservationPaymentInputSchema = z.strictObject({
  amountMinor: moneySchema.min(1),
  method: reservationPaymentMethodSchema,
  paidOn: z.iso.date(),
  note: optionalText(200).optional(),
  idempotencyKey: idSchema,
})
export type ReservationPaymentInput = z.infer<
  typeof reservationPaymentInputSchema
>

export const reservationPaymentVoidSchema = z.strictObject({
  voidReason: nonBlankText(200),
})
export type ReservationPaymentVoid = z.infer<
  typeof reservationPaymentVoidSchema
>

export const reservationPaymentSchema = z
  .strictObject({
    id: idSchema,
    reservationId: idSchema,
    amountMinor: moneySchema.min(1),
    method: paymentMethodSchema,
    paidOn: z.iso.date(),
    note: optionalText(200),
    idempotencyKey: idSchema,
    createdAt: z.iso.datetime(),
    recordedBy: idSchema,
    voidedAt: z.iso.datetime().nullable(),
    voidedBy: idSchema.nullable(),
    voidReason: nonBlankText(200).nullable(),
  })
  .refine(
    (value) =>
      (value.voidedAt === null &&
        value.voidedBy === null &&
        value.voidReason === null) ||
      (value.voidedAt !== null &&
        value.voidedBy !== null &&
        value.voidReason !== null),
    {
      path: ['voidedAt'],
      message: 'void metadata must be all null or all present',
    },
  )
export type ReservationPayment = z.infer<typeof reservationPaymentSchema>

/**
 * These are the source schemas used to produce OpenAPI components. Refinements
 * such as date ordering and non-empty guest totals need service-level
 * documentation/validation because JSON Schema cannot express them here.
 */
export const reservationOpenApiSchemas = {
  accommodationType: accommodationTypeSchema,
  accommodationTypeCreate: accommodationTypeCreateSchema,
  accommodationTypePatch: accommodationTypePatchSchema,
  accommodationUnit: accommodationUnitSchema,
  accommodationUnitCreate: accommodationUnitCreateSchema,
  accommodationUnitPatch: accommodationUnitPatchSchema,
  reservationBlock: reservationBlockSchema,
  reservationBlockCreate: reservationBlockCreateSchema,
  reservationBlockPatch: reservationBlockPatchSchema,
  reservationPriceSnapshot: reservationPriceSnapshotSchema,
  perUnitPriceSnapshot: perUnitPriceSnapshotSchema,
  perPersonPriceSnapshot: perPersonPriceSnapshotSchema,
  reservationQuote: reservationQuoteSchema,
  reservationQuoteCreate: reservationQuoteCreateSchema,
  reservationQuoteUpdate: reservationQuoteUpdateSchema,
  reservationUpdateQuote: reservationUpdateQuoteSchema,
  reservationAccount: reservationAccountSchema,
  reservation: reservationResponseSchema,
  reservationPage: reservationPageSchema,
  reservationListQuery: reservationListQuerySchema,
  reservationCreate: reservationCreateSchema,
  reservationPatch: reservationPatchSchema,
  reservationStatusCommand: reservationStatusCommandSchema,
  reservationPayment: reservationPaymentSchema,
  reservationPaymentInput: reservationPaymentInputSchema,
  reservationPaymentVoid: reservationPaymentVoidSchema,
} as const
export type ReservationOpenApiSchemas = typeof reservationOpenApiSchemas
