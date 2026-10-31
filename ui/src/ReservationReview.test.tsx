import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ReservationReview from './ReservationReview'
import type { CreationQuote } from './reservations/creationState'
import { i18nReady } from './app/i18n'

await i18nReady
const quote = {
  accommodationName: 'Habitación privada · Habitación 1',
  responsibleName: 'Ana',
  input: {
    accommodationTypeId: '00000000-0000-4000-8000-000000000001',
    checkInDate: '2026-10-30',
    checkOutDate: '2026-11-09',
    adults: 1,
    children: 0,
    infants: 0,
  },
  priceSnapshot: {
    basis: 'per_unit',
    currency: 'MXN',
    baseNightlyPriceMinor: 90000,
    totalMinor: 900000,
    nights: 10,
  },
} satisfies CreationQuote

it('shows singular guests, readable dates and one formatted total with no empty groups', () => {
  const markup = renderToStaticMarkup(
    <ReservationReview quote={quote} today="2026-10-30" />,
  )
  for (const text of [
    'Habitación privada',
    'Ana',
    '1 adulto',
    '30 de octubre',
    '9 de noviembre',
    '10 noches',
    'Total de la reserva',
  ])
    expect(markup).toContain(text)
  expect(markup).not.toContain('0 niños')
  expect(markup).not.toContain('0 bebés')
  expect(markup).not.toContain('2026-10-30')
  expect(markup).not.toContain('MXN 9.000 MXN')
})

it('also omits empty groups from person pricing and retains an advisory capacity warning', () => {
  const personQuote = {
    ...quote,
    occupancyWarning: { maxOccupancy: 2, people: 3 },
    priceSnapshot: {
      basis: 'per_person',
      currency: 'CLP',
      totalMinor: 12000,
      nights: 1,
      ageRanges: {
        adults: { min: 18, max: null },
        children: { min: 6, max: 17 },
        infants: { min: 0, max: 5 },
      },
      rates: { adults: 12000, children: 6000, infants: 0 },
    },
  } satisfies CreationQuote
  const markup = renderToStaticMarkup(
    <ReservationReview quote={personQuote} today="2026-10-30" />,
  )
  expect(markup).toContain('1 ×')
  expect(markup).not.toMatch(/>0 ×/)
  expect(markup).toContain('Podés crear la reserva igualmente')
})
