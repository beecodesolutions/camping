import { getCountries } from 'libphonenumber-js/min'
import { z } from 'zod'

export const countries = getCountries()

export const safeCount = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)

export const moneySchema = safeCount

export const ratesSchema = z.strictObject({
  adults: moneySchema,
  children: moneySchema,
  infants: moneySchema,
})
export type Rates = z.infer<typeof ratesSchema>

const ageRange = z.strictObject({ min: safeCount, max: safeCount.nullable() })
export const ageRangesSchema = z
  .strictObject({ adults: ageRange, children: ageRange, infants: ageRange })
  .refine(
    (r) =>
      r.infants.min === 0 &&
      r.infants.max !== null &&
      r.infants.max >= 0 &&
      r.children.min === r.infants.max + 1 &&
      r.children.max !== null &&
      r.children.max >= r.children.min &&
      r.adults.min === r.children.max + 1 &&
      r.adults.max === null,
    'Invalid age ranges',
  )
export type AgeRanges = z.infer<typeof ageRangesSchema>

export const paymentMethodSchema = z.enum(['cash', 'transfer', 'card'])

export const safeSignedAmountSchema = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER)
