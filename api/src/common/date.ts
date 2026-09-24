import { BadRequestException } from '@nestjs/common'
import { todayInTimezone } from '@camping/contracts'

export function daysBetween(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`)
  const endMs = Date.parse(`${end}T00:00:00Z`)
  return Math.max(1, Math.round((endMs - startMs) / 86_400_000))
}

export function validateDeparture(
  arrivalDate: string,
  departureDate: string,
  timezone: string,
): void {
  if (departureDate < arrivalDate) {
    throw new BadRequestException({
      code: 'DEPARTURE_BEFORE_ARRIVAL',
      message: 'La salida no puede ser anterior al ingreso',
    })
  }
  if (departureDate > todayInTimezone(timezone)) {
    throw new BadRequestException({
      code: 'FUTURE_DEPARTURE',
      message: 'La salida no puede ser futura',
    })
  }
}

export function ensureSafeMoney(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new BadRequestException({
      code: 'MONEY_OVERFLOW',
      message: 'Importe inválido',
    })
  return value
}
