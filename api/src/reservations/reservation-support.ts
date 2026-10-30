import {
  reservationResponseSchema,
  reservationPriceSnapshotSchema,
  type ReservationResponse,
} from '@camping/contracts'
import { In, type EntityManager } from 'typeorm'
import { conflict, notFound } from '../common/errors'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogEntity } from '../database/entities/audit-log.entity'
import { OutboxEventEntity } from '../database/entities/outbox-event.entity'
import { PaymentEntity } from '../database/entities/payment.entity'
import { ReservationEntity } from '../database/entities/reservation.entity'
import { AppliedExtraEntity } from '../database/entities/applied-extra.entity'
import { StayEntity } from '../database/entities/stay.entity'

const payloadFields = [
  'reservationId',
  'version',
  'status',
  'checkInDate',
  'checkOutDate',
  'typeId',
  'unitId',
  'stayId',
] as const

export async function lockReservation(
  manager: EntityManager,
  campingId: string,
  id: string,
): Promise<ReservationEntity> {
  const row = await manager.findOne(ReservationEntity, {
    where: { id, campingId },
    lock: { mode: 'pessimistic_write' },
  })
  if (!row) throw notFound('Reserva')
  return row
}

export async function lockReservationStay(
  manager: EntityManager,
  campingId: string,
  reservationId: string,
): Promise<StayEntity> {
  const stay = await manager.findOne(StayEntity, {
    where: { campingId, reservationId },
    lock: { mode: 'pessimistic_write' },
  })
  if (!stay) throw notFound('Estadía vinculada')
  stay.extras = await manager.find(AppliedExtraEntity, {
    where: { stayId: stay.id },
  })
  stay.payments = await manager.find(PaymentEntity, {
    where: { campingId, stayId: stay.id },
  })
  return stay
}

function safeAdd(left: number, right: number): number {
  const result = left + right
  if (!Number.isSafeInteger(result))
    throw conflict('Importe fuera de rango', 'MONEY_OVERFLOW')
  return result
}

export function nextReservationVersion(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value >= 2_147_483_647)
    throw conflict(
      'La versión de la reserva está fuera de rango',
      'VERSION_OVERFLOW',
    )
  return value + 1
}

export async function reservationView(
  manager: EntityManager,
  context: AuthContext,
  row: ReservationEntity,
): Promise<ReservationResponse> {
  const stay = await manager.findOne(StayEntity, {
    where: { campingId: context.camping.id, reservationId: row.id },
    relations: { extras: true },
  })
  const payments = await manager.find(PaymentEntity, {
    where: [
      { campingId: context.camping.id, reservationId: row.id },
      ...(stay ? [{ campingId: context.camping.id, stayId: stay.id }] : []),
    ],
    order: { createdAt: 'ASC', id: 'ASC' },
  })
  return reservationViewFromAssociation(context, row, stay, payments)
}

function safeMultiply(left: number, right: number): number {
  const result = left * right
  if (!Number.isSafeInteger(result) || result < 0)
    throw conflict('Importe fuera de rango', 'MONEY_OVERFLOW')
  return result
}

function activeExtrasTotal(stay: StayEntity): number {
  let total = 0
  for (const extra of stay.extras ?? [])
    total = safeAdd(total, safeMultiply(extra.quantity, extra.unitPriceMinor))
  return total
}

function reservationTotal(
  row: ReservationEntity,
  stay: StayEntity | null,
): number {
  if (stay?.closure) {
    const total = stay.closure.totalMinor
    if (!Number.isSafeInteger(total) || total < 0)
      throw conflict('Importe fuera de rango', 'MONEY_OVERFLOW')
    return total
  }
  if (!stay) return row.priceSnapshot.totalMinor
  return safeAdd(row.priceSnapshot.totalMinor, activeExtrasTotal(stay))
}

function reservationViewFromAssociation(
  context: AuthContext,
  row: ReservationEntity,
  stay: StayEntity | null,
  payments: PaymentEntity[],
): ReservationResponse {
  let paidMinor = 0
  for (const payment of payments)
    if (payment.voidedAt === null)
      paidMinor = safeAdd(paidMinor, payment.amountMinor)
  const totalMinor = reservationTotal(row, stay)
  const value = {
    id: row.id,
    campingId: row.campingId,
    stayId: stay?.id ?? null,
    accommodationTypeId: row.accommodationTypeId,
    unitId: row.unitId,
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
    responsibleName: row.responsibleName,
    email: row.email,
    phone: row.phone,
    document: row.document,
    nationality: row.nationality,
    adults: row.adults,
    children: row.children,
    infants: row.infants,
    status: row.status,
    source: row.source,
    notes: row.notes,
    priceSnapshot: reservationPriceSnapshotSchema.parse(row.priceSnapshot),
    payments: payments.map((payment) => ({
      id: payment.id,
      reservationId: row.id,
      amountMinor: payment.amountMinor,
      method: payment.method,
      paidOn: payment.paidOn,
      note: payment.note,
      idempotencyKey: payment.idempotencyKey,
      createdAt: payment.createdAt.toISOString(),
      recordedBy: payment.recordedById,
      voidedAt: payment.voidedAt?.toISOString() ?? null,
      voidedBy: payment.voidedById,
      voidReason: payment.voidReason,
    })),
    account: {
      totalMinor,
      paidMinor,
      balanceMinor: totalMinor - paidMinor,
    },
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
  return reservationResponseSchema.parse(value)
}

/**
 * Render a page of reservations with one stay, extras, and payment query per
 * page. Individual reads still use reservationView above.
 */
export async function reservationViews(
  manager: EntityManager,
  context: AuthContext,
  rows: ReservationEntity[],
): Promise<ReservationResponse[]> {
  if (!rows.length) return []
  const reservationIds = rows.map((row) => row.id)
  const stays = await manager.find(StayEntity, {
    where: { campingId: context.camping.id, reservationId: In(reservationIds) },
    relations: { extras: true },
  })
  const staysByReservation = new Map(
    stays.map((stay) => [stay.reservationId!, stay]),
  )
  const staysById = new Map(stays.map((stay) => [stay.id, stay]))
  const stayIds = stays.map((stay) => stay.id)
  const payments = await manager.find(PaymentEntity, {
    where: [
      { campingId: context.camping.id, reservationId: In(reservationIds) },
      ...(stayIds.length
        ? [{ campingId: context.camping.id, stayId: In(stayIds) }]
        : []),
    ],
    order: { createdAt: 'ASC', id: 'ASC' },
  })
  const paymentsByReservation = new Map<string, PaymentEntity[]>()
  for (const payment of payments) {
    const reservationId =
      payment.reservationId ??
      staysById.get(payment.stayId ?? '')?.reservationId
    if (!reservationId) continue
    const list = paymentsByReservation.get(reservationId) ?? []
    list.push(payment)
    paymentsByReservation.set(reservationId, list)
  }
  return rows.map((row) =>
    reservationViewFromAssociation(
      context,
      row,
      staysByReservation.get(row.id) ?? null,
      paymentsByReservation.get(row.id) ?? [],
    ),
  )
}

function minimalPayload(row: ReservationEntity): Record<string, unknown> {
  const value: Record<string, unknown> = {
    reservationId: row.id,
    version: row.version,
    status: row.status,
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
    typeId: row.accommodationTypeId,
    unitId: row.unitId,
  }
  return Object.fromEntries(payloadFields.map((key) => [key, value[key]]))
}

function auditState(
  value: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!value) return null
  const allowed = [
    'reservationId',
    'version',
    'status',
    'checkInDate',
    'checkOutDate',
    'accommodationTypeId',
    'typeId',
    'unitId',
    'stayId',
    'source',
    'adults',
    'children',
    'infants',
    'responsibleName',
    'email',
    'phone',
    'document',
    'nationality',
    'source',
    'notes',
    'priceSnapshot',
    'stay',
    'stayVersion',
    'paymentId',
    'paymentAmountMinor',
    'paymentIdempotencyKey',
    'amountMinor',
    'method',
    'paidOn',
    'idempotencyKey',
    'voidedAt',
    'voidedBy',
    'voidReason',
  ]
  return Object.fromEntries(
    allowed.filter((key) => key in value).map((key) => [key, value[key]]),
  )
}

export async function appendReservationMutation(
  manager: EntityManager,
  context: AuthContext,
  row: ReservationEntity,
  action: string,
  eventType: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Promise<void> {
  await manager.save(
    manager.create(AuditLogEntity, {
      campingId: row.campingId,
      actorId: context.user.id,
      action,
      entityType: 'Reservation',
      entityId: row.id,
      beforeState: auditState(before),
      afterState: auditState(after),
    }),
  )
  await manager.save(
    manager.create(OutboxEventEntity, {
      campingId: row.campingId,
      aggregateType: 'Reservation',
      aggregateId: row.id,
      eventType,
      payload: {
        ...minimalPayload(row),
        origin: 'manual',
        bookingSource: row.source,
        ...(after?.stayId ? { stayId: after.stayId } : {}),
        ...(after?.paymentId ? { paymentId: after.paymentId } : {}),
        ...(after?.paymentAmountMinor
          ? { paymentAmountMinor: after.paymentAmountMinor }
          : {}),
        ...(after?.paymentIdempotencyKey
          ? { paymentIdempotencyKey: after.paymentIdempotencyKey }
          : {}),
      },
      publishedAt: null,
      attempts: 0,
      lastError: null,
    }),
  )
}
