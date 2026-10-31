import type { ReservationQuoteCreate } from '@camping/contracts'

export function reservationReviewDate(
  date: string,
  today: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    ...(date.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

export function reservationGuestGroups(
  input: Pick<ReservationQuoteCreate, 'adults' | 'children' | 'infants'>,
) {
  return (['adults', 'children', 'infants'] as const)
    .filter((name) => input[name] > 0)
    .map((name) => ({ name, count: input[name] }))
}
