import { expect, it } from 'vitest'
import { departureForNights, reservationNights } from './dates'

it.each([
  ['2026-10-30', '2026-11-06', 7],
  ['2026-12-31', '2027-01-02', 2],
  ['2028-02-28', '2028-03-01', 2],
  ['2026-09-05', '2026-09-07', 2],
])(
  'keeps dates and calendar nights synchronized across boundaries: %s',
  (arrival, departure, nights) => {
    expect(reservationNights(arrival, departure)).toBe(nights)
    expect(departureForNights(arrival, String(nights))).toBe(departure)
  },
)

it('recalculates duration when either date changes and departure when nights changes', () => {
  expect(reservationNights('2026-10-31', '2026-11-06')).toBe(6)
  expect(reservationNights('2026-10-30', '2026-11-08')).toBe(9)
  expect(departureForNights('2026-10-30', '3')).toBe('2026-11-02')
})

it.each(['', '0', '-1', '1.5', 'NaN', 'Infinity', '999999999999999999'])(
  'rejects invalid night counts without inventing a departure: %s',
  (value) => {
    expect(departureForNights('2026-10-30', value)).toBeNull()
  },
)

it('handles incomplete, invalid, reversed and out-of-range dates', () => {
  for (const [arrival, departure] of [
    ['', '2026-11-06'],
    ['2026-02-30', '2026-03-01'],
    ['2026-11-06', '2026-11-06'],
    ['2026-11-07', '2026-11-06'],
  ])
    expect(reservationNights(arrival, departure)).toBe('')
  expect(departureForNights('', '1')).toBeNull()
  expect(departureForNights('9999-12-31', '1')).toBeNull()
})
