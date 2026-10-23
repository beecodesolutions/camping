import {
  reservationResponseSchema,
  reservationPriceSnapshotSchema,
  type ReservationResponse,
} from '@camping/contracts'
import type { EntityManager } from 'typeorm'
import { conflict, notFound } from '../common/errors'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogEntity } from '../database/entities/audit-log.entity'
import { OutboxEventEntity } from '../database/entities/outbox-event.entity'
import { PaymentEntity } from '../database/entities/payment.entity'
import { ReservationEntity } from '../database/entities/reservation.entity'

const payloadFields = [
  'reservationId',
  'version',
  'status',
  'checkInDate',
  'checkOutDate',
  'typeId',
  'unitId',
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
  const payments =
    row.payments ??
    (await manager.find(PaymentEntity, {
      where: { campingId: context.camping.id, reservationId: row.id },
      order: { createdAt: 'ASC', id: 'ASC' },
    }))
  let paidMinor = 0
  for (const payment of payments)
    if (payment.voidedAt === null)
      paidMinor = safeAdd(paidMinor, payment.amountMinor)
  const totalMinor = row.priceSnapshot.totalMinor
  const value = {
    id: row.id,
    campingId: row.campingId,
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
    'source',
    'adults',
    'children',
    'infants',
    'priceSnapshot',
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
