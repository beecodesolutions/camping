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

export type PricingInput = {
  inventoryMode: 'individual' | 'unlimited'
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

function perPersonBase(input: PricingInput, nights: number): number {
  if (!input.rates || !input.ageRanges)
    throw conflict('Faltan tarifas del camping', 'PRICE_CONFIGURATION_INVALID')
  let nightly = 0
  nightly = addMoney(nightly, multiplyMoney(input.adults, input.rates.adults))
  nightly = addMoney(
    nightly,
    multiplyMoney(input.children, input.rates.children),
  )
  nightly = addMoney(nightly, multiplyMoney(input.infants, input.rates.infants))
  return multiplyMoney(nightly, nights)
}

export function priceSnapshotFor(input: PricingInput): PriceSnapshot {
  const nights = daysBetween(input.checkInDate, input.checkOutDate)
  if (!Number.isSafeInteger(nights) || nights < 1)
    throw conflict('Rango de fechas inválido', 'VALIDATION_ERROR')
  const baseTotalMinor =
    input.inventoryMode === 'individual'
      ? multiplyMoney(
          safeInteger(
            input.baseNightlyPriceMinor ?? -1,
            'baseNightlyPriceMinor',
          ),
          nights,
        )
      : perPersonBase(input, nights)

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
    input.inventoryMode === 'individual'
      ? {
          basis: 'per_unit' as const,
          currency: input.currency,
          ...precision,
          baseNightlyPriceMinor: safeInteger(
            input.baseNightlyPriceMinor ?? -1,
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
          rates: input.rates!,
          ageRanges: input.ageRanges!,
          nights,
          totalMinor,
          ...(adjustmentMinor === undefined
            ? {}
            : { adjustmentMinor, adjustmentReason }),
        }
  const validated = reservationPriceSnapshotSchema.parse(snapshot)
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
): PriceSnapshot {
  const nights = daysBetween(checkInDate, checkOutDate)
  const baseTotalMinor =
    snapshot.basis === 'per_unit'
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
