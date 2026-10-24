import type {
  AccommodationType,
  AccommodationUnit,
  ReservationResponse,
  Stay,
} from '@camping/contracts'

export type IndividualOccupancy = {
  occupied: number
  total: number
  unoccupied: number
}

export function summarizeIndividualOccupancy(
  types: ReadonlyArray<
    Pick<AccommodationType, 'id' | 'enabled' | 'inventoryMode'>
  >,
  units: ReadonlyArray<Pick<AccommodationUnit, 'id' | 'typeId' | 'enabled'>>,
  reservations: ReadonlyArray<
    Pick<
      ReservationResponse,
      'status' | 'stayId' | 'unitId' | 'accommodationTypeId'
    >
  >,
  stays: ReadonlyArray<Pick<Stay, 'id'>>,
): IndividualOccupancy {
  const individualTypeIds = new Set(
    types
      .filter((type) => type.inventoryMode === 'individual')
      .map((type) => type.id),
  )
  const enabledTypeIds = new Set(
    types
      .filter((type) => type.enabled && type.inventoryMode === 'individual')
      .map((type) => type.id),
  )
  const activeStayIds = new Set(stays.map((stay) => stay.id))
  const occupiedUnitIds = new Set(
    reservations
      .filter(
        (reservation) =>
          reservation.status === 'checked_in' &&
          reservation.stayId !== null &&
          activeStayIds.has(reservation.stayId) &&
          reservation.unitId !== null &&
          individualTypeIds.has(reservation.accommodationTypeId),
      )
      .map((reservation) => reservation.unitId as string),
  )
  const totalUnitIds = new Set(
    units
      .filter((unit) => unit.enabled && enabledTypeIds.has(unit.typeId))
      .map((unit) => unit.id),
  )
  // Keep active disabled units in the denominator so transient inventory
  // changes cannot report more occupied units than the total.
  for (const unitId of occupiedUnitIds) totalUnitIds.add(unitId)
  return {
    occupied: occupiedUnitIds.size,
    total: totalUnitIds.size,
    unoccupied: Math.max(0, totalUnitIds.size - occupiedUnitIds.size),
  }
}
