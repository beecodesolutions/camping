import { nightlyPrice } from './nightly-pricing'
import { humanOccupancy, type AccommodationPricing } from '@camping/contracts'
import {
  reservationPriceSnapshotSchema,
  roundMoneyMinor,
  hasMoneyPrecision,
  type MoneyDecimals,
  type AgeRanges,
  type Rates,
  type ReservationPriceSnapshot,
} from '@camping/contracts'
import { daysBetween } from '../common/date'
import { conflict } from '../common/errors'

function calculateNightlyPrice(
  ...args: Parameters<typeof nightlyPrice>
): ReturnType<typeof nightlyPrice> {
  try {
    return nightlyPrice(...args)
  } catch (error) {
    if (error instanceof RangeError)
      throw conflict('Importe fuera de rango', 'MONEY_OVERFLOW')
    throw error
  }
}

export type PricingInput = {
  inventoryMode: 'individual' | 'unlimited' | 'shared'
  pricing?: AccommodationPricing | null
  infantsConsumeCapacity?: boolean
  pets?: number
  currency: string
  moneyDecimals?: MoneyDecimals
  baseNightlyPriceMinor?: number
  rates?: Rates
  ageRanges?: AgeRanges
  checkInDate: string
  checkOutDate: string
  adults: number
  children: number
  infants: number
  agreedTotalMinor?: number
  priceAdjustmentReason?: string
}

export type PriceSnapshot = ReservationPriceSnapshot & {
  baseTotalMinor: number
}

function safeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw conflict(`Importe inválido: ${name}`, 'MONEY_OVERFLOW')
  return value
}

function safeSignedInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
    throw conflict(`Importe inválido: ${name}`, 'MONEY_OVERFLOW')
  return value
}

function addMoney(left: number, right: number): number {
  return safeInteger(left + right, 'total')
}

function multiplyMoney(left: number, right: number): number {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right))
    throw conflict('Importe inválido', 'MONEY_OVERFLOW')
  return safeInteger(left * right, 'total')
}

export function priceSnapshotFor(input: PricingInput): PriceSnapshot {
  const nights = daysBetween(input.checkInDate, input.checkOutDate)
  if (!Number.isSafeInteger(nights) || nights < 1)
    throw conflict('Rango de fechas inválido', 'VALIDATION_ERROR')
  if (
    !input.pricing &&
    input.inventoryMode !== 'unlimited' &&
    input.baseNightlyPriceMinor === undefined
  )
    throw conflict('Falta la tarifa base', 'PRICE_CONFIGURATION_INVALID')
  const pricing =
    input.pricing ??
    ({
      basis:
        input.inventoryMode === 'shared'
          ? 'per_bed'
          : input.inventoryMode === 'individual'
            ? 'per_unit'
            : 'per_person',
      baseNightlyPriceMinor: input.baseNightlyPriceMinor ?? 0,
      rates: input.rates ?? { adults: 0, children: 0, infants: 0 },
      extraPersonRates: { adults: 0, children: 0, infants: 0 },
      includedOccupancy: { adults: 0, children: 0, infants: 0 },
      petNightlyPriceMinor: 0,
      weekdays: [],
      discounts: [],
    } satisfies AccommodationPricing)
  const calculated = calculateNightlyPrice(
    pricing,
    {
      adults: input.adults,
      children: input.children,
      infants: input.infants,
      pets: input.pets ?? 0,
    },
    input.checkInDate,
    input.checkOutDate,
    humanOccupancy(input, input.infantsConsumeCapacity ?? false),
  )
  const { totalMinor: baseTotalMinor, ...breakdown } = calculated
  if (
    !input.pricing &&
    input.inventoryMode === 'unlimited' &&
    (!input.rates || !input.ageRanges)
  )
    throw conflict('Faltan tarifas del camping', 'PRICE_CONFIGURATION_INVALID')

  let totalMinor = baseTotalMinor
  let adjustmentMinor: number | undefined
  let adjustmentReason: string | undefined
  const hasOverride =
    input.agreedTotalMinor !== undefined ||
    input.priceAdjustmentReason !== undefined
  if (hasOverride) {
    if (
      input.agreedTotalMinor === undefined ||
      input.priceAdjustmentReason === undefined ||
      !/\S/.test(input.priceAdjustmentReason)
    )
      throw conflict(
        'El total acordado y el motivo del ajuste son obligatorios juntos',
        'PRICE_ADJUSTMENT_INVALID',
      )
    totalMinor = safeInteger(input.agreedTotalMinor, 'agreedTotalMinor')
    if (!hasMoneyPrecision(totalMinor, input.currency, input.moneyDecimals))
      throw conflict(
        'El total acordado no admite centavos',
        'MONEY_PRECISION_INVALID',
      )
    adjustmentMinor = safeSignedInteger(
      totalMinor - baseTotalMinor,
      'adjustmentMinor',
    )
    adjustmentReason = input.priceAdjustmentReason.trim()
  }

  const roundedTotal = roundMoneyMinor(
    totalMinor,
    input.currency,
    input.moneyDecimals,
  )
  const roundingMinor = roundedTotal - totalMinor
  totalMinor = roundedTotal
  const precision = {
    ...(input.moneyDecimals === undefined
      ? {}
      : { moneyDecimals: input.moneyDecimals }),
    ...(roundingMinor === 0 ? {} : { roundingMinor }),
  }
  const snapshot =
    pricing.basis !== 'per_person'
      ? {
          basis: pricing.basis,
          currency: input.currency,
          ...precision,
          baseNightlyPriceMinor: safeInteger(
            pricing.baseNightlyPriceMinor,
            'baseNightlyPriceMinor',
          ),
          nights,
          totalMinor,
          ...(adjustmentMinor === undefined
            ? {}
            : { adjustmentMinor, adjustmentReason }),
        }
      : {
          basis: 'per_person' as const,
          currency: input.currency,
          ...precision,
          rates: pricing.rates,
          ageRanges: input.ageRanges!,
          nights,
          totalMinor,
          ...(adjustmentMinor === undefined
            ? {}
            : { adjustmentMinor, adjustmentReason }),
        }
  const validated = reservationPriceSnapshotSchema.parse({
    ...snapshot,
    pricing,
    breakdown,
    pets: input.pets ?? 0,
    infantsConsumeCapacity: input.infantsConsumeCapacity ?? false,
  })
  return { ...validated, baseTotalMinor } as PriceSnapshot
}

export function snapshotWithoutInternalBase(
  snapshot: PriceSnapshot,
): ReservationPriceSnapshot {
  const { baseTotalMinor: _baseTotalMinor, ...publicSnapshot } = snapshot
  return reservationPriceSnapshotSchema.parse(publicSnapshot)
}

export function priceAffectsReservation(
  value: Record<string, unknown>,
): boolean {
  return [
    'accommodationTypeId',
    'unitId',
    'checkInDate',
    'checkOutDate',
    'adults',
    'children',
    'infants',
    'pets',
    'capacityOverrideReason',
    'agreedTotalMinor',
    'priceAdjustmentReason',
  ].some((key) => key in value)
}

export function baseFromSnapshot(
  snapshot: ReservationPriceSnapshot,
  checkInDate: string,
  checkOutDate: string,
  adults: number,
  children: number,
  infants: number,
  pets = snapshot.pets ?? 0,
): PriceSnapshot {
  if (snapshot.pricing)
    return priceSnapshotFor({
      inventoryMode:
        snapshot.basis === 'per_bed'
          ? 'shared'
          : snapshot.basis === 'per_unit'
            ? 'individual'
            : 'unlimited',
      pricing: snapshot.pricing,
      infantsConsumeCapacity: snapshot.infantsConsumeCapacity,
      currency: snapshot.currency,
      moneyDecimals: snapshot.moneyDecimals,
      ageRanges:
        snapshot.basis === 'per_person' ? snapshot.ageRanges : undefined,
      checkInDate,
      checkOutDate,
      adults,
      children,
      infants,
      pets,
      ...(snapshot.adjustmentMinor === undefined
        ? {}
        : {
            agreedTotalMinor: Math.max(
              0,
              calculateNightlyPrice(
                snapshot.pricing,
                { adults, children, infants, pets },
                checkInDate,
                checkOutDate,
                humanOccupancy(
                  { adults, children, infants },
                  snapshot.infantsConsumeCapacity ?? false,
                ),
              ).totalMinor + snapshot.adjustmentMinor,
            ),
            priceAdjustmentReason: snapshot.adjustmentReason,
          }),
    })
  const nights = daysBetween(checkInDate, checkOutDate)
  const baseTotalMinor =
    snapshot.basis !== 'per_person'
      ? multiplyMoney(snapshot.baseNightlyPriceMinor, nights)
      : (() => {
          let nightly = 0
          nightly = addMoney(
            nightly,
            multiplyMoney(adults, snapshot.rates.adults),
          )
          nightly = addMoney(
            nightly,
            multiplyMoney(children, snapshot.rates.children),
          )
          nightly = addMoney(
            nightly,
            multiplyMoney(infants, snapshot.rates.infants),
          )
          return multiplyMoney(nightly, nights)
        })()
  const adjustmentMinor = snapshot.adjustmentMinor
  const unroundedTotal =
    adjustmentMinor === undefined
      ? baseTotalMinor
      : safeInteger(baseTotalMinor + adjustmentMinor, 'total')
  const totalMinor = roundMoneyMinor(
    unroundedTotal,
    snapshot.currency,
    snapshot.moneyDecimals,
  )
  const { roundingMinor: _previousRounding, ...frozen } = snapshot
  const roundingMinor = totalMinor - unroundedTotal
  const validated = reservationPriceSnapshotSchema.parse({
    ...frozen,
    nights,
    totalMinor,
    ...(roundingMinor === 0 ? {} : { roundingMinor }),
  })
  return { ...validated, baseTotalMinor } as PriceSnapshot
}
