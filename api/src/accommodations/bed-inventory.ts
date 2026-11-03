import type { EntityManager } from 'typeorm'
import { conflict } from '../common/errors'
import { calendarNights } from '../reservations/nightly-pricing'
import type { ReservationEntity } from '../database/entities/reservation.entity'

export type Bed = {
  id: string
  name: string
  unitId: string
  enabled: boolean
  position: number
}
export async function availableBeds(
  manager: EntityManager,
  campingId: string,
  unitId: string,
  start: string,
  end: string,
  excludeReservationId?: string,
): Promise<Bed[]> {
  return manager.query(
    `SELECT b.id, b.name, b.unit_id AS "unitId", b.enabled, b.position
    FROM camping_private.accommodation_beds b
    WHERE b.camping_id=$1 AND b.unit_id=$2 AND b.enabled
      AND NOT EXISTS (SELECT 1 FROM camping_private.accommodation_blocks x WHERE x.camping_id=b.camping_id AND x.unit_id=b.unit_id AND x.check_in_date<$4::date AND x.check_out_date>$3::date)
      AND NOT EXISTS (SELECT 1 FROM camping_private.bed_occupancy o WHERE o.camping_id=b.camping_id AND o.bed_id=b.id AND o.night >= $3::date AND o.night < $4::date AND ($5::uuid IS NULL OR o.reservation_id<>$5))
    ORDER BY b.position, b.name, b.id`,
    [campingId, unitId, start, end, excludeReservationId ?? null],
  )
}
export async function assignBeds(
  manager: EntityManager,
  row: ReservationEntity,
  count: number,
): Promise<void> {
  if (!row.unitId || row.priceSnapshot.basis !== 'per_bed') {
    await manager.query(
      `DELETE FROM camping_private.bed_occupancy WHERE camping_id=$1 AND reservation_id=$2`,
      [row.campingId, row.id],
    )
    await manager.query(
      `DELETE FROM camping_private.reservation_beds WHERE camping_id=$1 AND reservation_id=$2`,
      [row.campingId, row.id],
    )
    return
  }
  const beds = await availableBeds(
    manager,
    row.campingId,
    row.unitId,
    row.checkInDate,
    row.checkOutDate,
    row.id,
  )
  if (beds.length < count)
    throw conflict(
      'No hay suficientes camas disponibles',
      'INVENTORY_UNAVAILABLE',
    )
  const previous = (await manager.query(
    `SELECT bed_id FROM camping_private.reservation_beds WHERE camping_id=$1 AND reservation_id=$2`,
    [row.campingId, row.id],
  )) as { bed_id: string }[]
  const prior = new Set(previous.map((b) => b.bed_id))
  beds.sort((a, b) => Number(prior.has(b.id)) - Number(prior.has(a.id)))
  await manager.query(
    `DELETE FROM camping_private.bed_occupancy WHERE camping_id=$1 AND reservation_id=$2`,
    [row.campingId, row.id],
  )
  await manager.query(
    `DELETE FROM camping_private.reservation_beds WHERE camping_id=$1 AND reservation_id=$2`,
    [row.campingId, row.id],
  )
  for (const bed of beds.slice(0, count)) {
    await manager.query(
      `INSERT INTO camping_private.reservation_beds(camping_id,reservation_id,unit_id,bed_id) VALUES($1,$2,$3,$4)`,
      [row.campingId, row.id, row.unitId, bed.id],
    )
    for (const date of calendarNights(row.checkInDate, row.checkOutDate))
      await manager.query(
        `INSERT INTO camping_private.bed_occupancy(camping_id,reservation_id,bed_id,night) VALUES($1,$2,$3,$4)`,
        [row.campingId, row.id, bed.id, date],
      )
  }
}
