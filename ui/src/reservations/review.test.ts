import { expect, it } from 'vitest'
import { reservationGuestGroups, reservationReviewDate } from './review'

it('uses readable dates and omits only the current camping year', () => {
  expect(reservationReviewDate('2026-10-30', '2026-10-30', 'es-CL')).toBe(
    '30 de octubre',
  )
  expect(reservationReviewDate('2026-11-09', '2026-10-30', 'es-CL')).toBe(
    '9 de noviembre',
  )
  expect(reservationReviewDate('2027-01-02', '2026-12-31', 'es-CL')).toBe(
    '2 de enero de 2027',
  )
  expect(reservationReviewDate('2025-10-30', '2026-10-30', 'es-CL')).toBe(
    '30 de octubre de 2025',
  )
})

it('omits empty guest groups while retaining children/infants when used', () => {
  expect(
    reservationGuestGroups({ adults: 1, children: 0, infants: 0 }),
  ).toEqual([{ name: 'adults', count: 1 }])
  expect(
    reservationGuestGroups({ adults: 0, children: 2, infants: 1 }),
  ).toEqual([
    { name: 'children', count: 2 },
    { name: 'infants', count: 1 },
  ])
})
