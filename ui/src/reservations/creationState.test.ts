import { expect, it } from 'vitest'
import type { ReservationCreate } from '@camping/contracts'
import {
  creationReducer,
  initialCreationState,
  reservationFailure,
  type CreationQuote,
} from './creationState'

const input = {
  accommodationTypeId: '00000000-0000-4000-8000-000000000001',
  checkInDate: '2026-11-01',
  checkOutDate: '2026-11-02',
  adults: 1,
  children: 0,
  infants: 0,
}
const quote = {
  input,
  accommodationName: 'Camping',
  responsibleName: 'Ana',
  priceSnapshot: {
    basis: 'per_unit',
    currency: 'CLP',
    baseNightlyPriceMinor: 1000,
    nights: 1,
    totalMinor: 1000,
  },
} satisfies CreationQuote
const attempt = {
  ...input,
  responsibleName: 'Ana',
  acceptedTotalMinor: 1000,
  idempotencyKey: '00000000-0000-4000-8000-000000000002',
} satisfies ReservationCreate

it('invalidates an accepted quote after a price input changes and ignores late responses', () => {
  const ready = creationReducer(initialCreationState, {
    type: 'quote-success',
    revision: 0,
    quote,
  })
  const changed = creationReducer(ready, { type: 'change' })
  expect(changed.quote).toBeNull()
  expect(
    creationReducer(changed, { type: 'quote-success', revision: 0, quote }),
  ).toBe(changed)
  expect(
    creationReducer(changed, {
      type: 'quote-error',
      revision: 0,
      error: 'old',
    }),
  ).toBe(changed)
})

it('preserves the exact request/key through an uncertain save and disallows changes', () => {
  const ready = creationReducer(initialCreationState, {
    type: 'quote-success',
    revision: 0,
    quote,
  })
  const sending = creationReducer(ready, { type: 'save-start', attempt })
  const uncertain = creationReducer(sending, {
    type: 'save-error',
    uncertain: true,
    error: 'network',
  })
  expect(uncertain.phase).toBe('uncertain')
  expect(uncertain.attempt).toBe(attempt)
  expect(uncertain.quote).toBe(quote)
  expect(creationReducer(uncertain, { type: 'change' })).toBe(uncertain)
  const rejected = creationReducer(uncertain, {
    type: 'save-error',
    uncertain: false,
    error: 'price',
  })
  expect(rejected.attempt).toBeNull()
  expect(rejected.quote).toBeNull()
})

it('distinguishes definite price/inventory errors from ambiguous transport/server failures', () => {
  expect(
    reservationFailure({ status: 409, data: { code: 'PRICE_CHANGED' } }),
  ).toEqual({ uncertain: false, message: 'reservationCreate.priceChanged' })
  expect(
    reservationFailure({ status: 409, data: { code: 'INVENTORY_UNAVAILABLE' } })
      .uncertain,
  ).toBe(false)
  expect(reservationFailure({ status: 400 }).uncertain).toBe(false)
  for (const error of [
    { status: 'FETCH_ERROR' },
    { status: 'PARSING_ERROR', originalStatus: 201 },
    { status: 503 },
    new Error('bad response'),
  ])
    expect(reservationFailure(error).uncertain).toBe(true)
})
