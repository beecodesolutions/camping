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

export type OccupancyMetrics = {
  groups: number
  people: number
  vehicles: number
}

export type OccupancySummary = {
  total: OccupancyMetrics
  camping: OccupancyMetrics
  individual: OccupancyMetrics
  individualUnits: IndividualOccupancy
}

function metrics(
  stays: ReadonlyArray<
    Pick<Stay, 'adults' | 'children' | 'infants' | 'hasVehicle'>
  >,
): OccupancyMetrics {
  return {
    groups: stays.length,
    people: stays.reduce(
      (total, stay) => total + stay.adults + stay.children + stay.infants,
      0,
    ),
    vehicles: stays.filter((stay) => stay.hasVehicle).length,
  }
}

export function summarizeOccupancy(
  types: ReadonlyArray<
    Pick<AccommodationType, 'id' | 'enabled' | 'inventoryMode'>
  >,
  units: ReadonlyArray<Pick<AccommodationUnit, 'id' | 'typeId' | 'enabled'>>,
  reservations: ReadonlyArray<
    Pick<
      ReservationResponse,
      'id' | 'status' | 'stayId' | 'unitId' | 'accommodationTypeId'
    >
  >,
  stays: ReadonlyArray<
    Pick<
      Stay,
      'id' | 'reservationId' | 'adults' | 'children' | 'infants' | 'hasVehicle'
    >
  >,
): OccupancySummary {
  const uniqueStayMap = new Map<string, (typeof stays)[number]>()
  for (const stay of stays) {
    if (!uniqueStayMap.has(stay.id)) uniqueStayMap.set(stay.id, stay)
  }
  const uniqueStays = Array.from(uniqueStayMap.values())
  const reservationsById = new Map(
    reservations.map((reservation) => [reservation.id, reservation]),
  )
  const campingStays = uniqueStays.filter((stay) => {
    if (!stay.reservationId) return true
    const reservation = reservationsById.get(stay.reservationId)
    return (
      reservation?.status === 'checked_in' &&
      types.find((type) => type.id === reservation.accommodationTypeId)
        ?.inventoryMode === 'unlimited'
    )
  })
  const individualStays = uniqueStays.filter((stay) => {
    if (!stay.reservationId) return false
    const reservation = reservationsById.get(stay.reservationId)
    return (
      reservation?.status === 'checked_in' &&
      types.find((type) => type.id === reservation.accommodationTypeId)
        ?.inventoryMode === 'individual'
    )
  })
  return {
    total: metrics(uniqueStays),
    camping: metrics(campingStays),
    individual: metrics(individualStays),
    individualUnits: summarizeIndividualOccupancy(
      types,
      units,
      reservations,
      individualStays,
    ),
  }
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
