import { accommodationPricingSchema } from './accommodation-pricing'
import { z } from 'zod'
import { moneyDecimalsSchema } from './money'
import {
  ageRangesSchema,
  moneySchema,
  ratesSchema,
  safeCount,
  safeSignedAmountSchema,
} from './contract-primitives'

export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/)
export type CurrencyCode = z.infer<typeof currencyCodeSchema>

const postgresIntMax = 2_147_483_647
const reservationCount = safeCount.max(postgresIntMax)

const priceSnapshotCommon = {
  pricing: accommodationPricingSchema.optional(),
  infantsConsumeCapacity: z.boolean().optional(),
  pets: safeCount.optional(),
  breakdown: z
    .strictObject({
      nights: z.array(
        z.strictObject({
          date: z.iso.date(),
          baseMinor: moneySchema,
          humanMinor: moneySchema,
          petMinor: moneySchema,
          categoryCharges: ratesSchema.optional(),
        }),
      ),
      categoryCharges: ratesSchema.optional(),
      accommodationMinor: moneySchema,
      humanMinor: moneySchema,
      discountMinor: moneySchema,
      petMinor: moneySchema,
      discountRuleIndex: safeCount.nullable(),
    })
    .optional(),
  moneyDecimals: moneyDecimalsSchema.optional(),
  roundingMinor: safeSignedAmountSchema.optional(),
  currency: currencyCodeSchema,
  totalMinor: moneySchema,
  /** Signed to support either a surcharge or a negotiated discount. */
  adjustmentMinor: safeSignedAmountSchema.optional(),
  adjustmentReason: z.string().max(500).optional(),
}

const priceSnapshotCommonSchema = z.strictObject(priceSnapshotCommon)

const priceAdjustmentIsComplete = (
  value: z.infer<typeof priceSnapshotCommonSchema>,
) =>
  (value.adjustmentMinor === undefined &&
    value.adjustmentReason === undefined) ||
  (value.adjustmentMinor !== undefined &&
    value.adjustmentReason !== undefined &&
    /\S/.test(value.adjustmentReason))

export const perUnitPriceSnapshotSchema = z
  .strictObject({
    basis: z.enum(['per_unit', 'per_bed']),
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
