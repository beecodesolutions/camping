import type { ReservationResponse } from '@camping/contracts'

export type AccommodationIdentityKind = 'individual' | 'camping' | 'neutral'
export type AccommodationIdentityValue = {
  kind: AccommodationIdentityKind
  label: string
}
type Labels = {
  accommodation: string
  freeCamping: string
  unknownUnit: string
}
type ReservationIdentity = Pick<
  ReservationResponse,
  'accommodationTypeId' | 'unitId'
>

export function indexReservationsById<
  T extends Pick<ReservationResponse, 'id'>,
>(reservations: ReadonlyArray<T>): Map<string, T> {
  return new Map(
    reservations.map((reservation) => [reservation.id, reservation]),
  )
}

export function buildAccommodationIdentity({
  reservation,
  hasReservation = false,
  location,
  typeNames,
  typeModes,
  unitNames,
  labels,
}: {
  reservation?: ReservationIdentity
  hasReservation?: boolean
  location?: string | null
  typeNames?: Map<string, string>
  typeModes?: Map<string, string>
  unitNames?: Map<string, string>
  labels: Labels
}): AccommodationIdentityValue {
  if (reservation) {
    const mode = typeModes?.get(reservation.accommodationTypeId)
    const typeName =
      typeNames?.get(reservation.accommodationTypeId) ?? labels.accommodation
    const unitName = reservation.unitId
      ? (unitNames?.get(reservation.unitId) ?? labels.unknownUnit)
      : mode === 'unlimited'
        ? labels.freeCamping
        : ''
    return {
      kind:
        mode === 'individual' || Boolean(reservation.unitId)
          ? 'individual'
          : mode === 'unlimited'
            ? 'camping'
            : 'neutral',
      label:
        !unitName || unitName === typeName
          ? typeName
          : `${typeName} · ${unitName}`,
    }
  }
  if (hasReservation) {
    return { kind: 'neutral', label: labels.accommodation }
  }
  return location
    ? { kind: 'camping', label: `${labels.freeCamping} · ${location}` }
    : { kind: 'camping', label: labels.freeCamping }
}
