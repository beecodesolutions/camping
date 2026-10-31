import { z } from 'zod'

const calendarDate = z.iso.date()
const dayMs = 86_400_000
const lastDeparture = Date.parse('9999-12-31T12:00:00Z')

export function reservationNights(
  checkInDate: string,
  checkOutDate: string,
): number | '' {
  if (
    !calendarDate.safeParse(checkInDate).success ||
    !calendarDate.safeParse(checkOutDate).success
  )
    return ''
  const nights =
    (Date.parse(`${checkOutDate}T12:00:00Z`) -
      Date.parse(`${checkInDate}T12:00:00Z`)) /
    dayMs
  return nights >= 1 ? nights : ''
}

export function departureForNights(
  checkInDate: string,
  value: string,
): string | null {
  if (!calendarDate.safeParse(checkInDate).success || value.trim() === '')
    return null
  const nights = Number(value)
  if (!Number.isSafeInteger(nights) || nights < 1) return null
  const departure = Date.parse(`${checkInDate}T12:00:00Z`) + nights * dayMs
  if (!Number.isFinite(departure) || departure > lastDeparture) return null
  return new Date(departure).toISOString().slice(0, 10)
}
