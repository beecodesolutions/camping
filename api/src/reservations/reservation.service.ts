import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { DataSource, In, type EntityManager } from 'typeorm'
import {
  reservationCreateSchema,
  reservationListQuerySchema,
  reservationPageSchema,
  reservationPatchSchema,
  reservationPriceSnapshotSchema,
  reservationQuoteCreateSchema,
  reservationQuoteSchema,
  reservationQuoteUpdateSchema,
  reservationUpdateQuoteSchema,
  reservationStatusCommandSchema,
  type ReservationCreate,
  type ReservationPage,
  type ReservationPatch,
  type ReservationQuote,
  type ReservationQuoteCreate,
  type ReservationQuoteUpdate,
  type ReservationResponse,
  type ReservationUpdateQuote,
} from '@camping/contracts'
import type { AuthContext } from '../auth/auth.types'
import { conflict, notFound, zodBadRequest } from '../common/errors'
import { todayInTimezone } from '@camping/contracts'
import { CampingEntity } from '../database/entities/camping.entity'
import { AccommodationTypeEntity } from '../database/entities/accommodation-type.entity'
import { AccommodationUnitEntity } from '../database/entities/accommodation-unit.entity'
import { PaymentEntity } from '../database/entities/payment.entity'
import {
  ReservationEntity,
  type ReservationStatus,
} from '../database/entities/reservation.entity'
import { withInventoryTransaction } from '../accommodations/inventory-transaction'
import { assertUnitAvailable } from '../accommodations/accommodations.service'
import {
  baseFromSnapshot,
  priceAffectsReservation,
  priceSnapshotFor,
  snapshotWithoutInternalBase,
  type PriceSnapshot,
} from './reservation-pricing'
import {
  appendReservationMutation,
  lockReservation,
  nextReservationVersion,
  reservationView,
} from './reservation-support'

type QuoteInput = ReservationQuoteCreate
type CreateInput = ReservationCreate
type PatchInput = ReservationPatch

function state(row: ReservationEntity): Record<string, unknown> {
  return {
    reservationId: row.id,
    version: row.version,
    status: row.status,
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
    accommodationTypeId: row.accommodationTypeId,
    unitId: row.unitId,
    adults: row.adults,
    children: row.children,
    infants: row.infants,
    priceSnapshot: reservationPriceSnapshotSchema.parse(row.priceSnapshot),
    source: row.source,
  }
}

function hashCreate(value: CreateInput): string {
  const normalized = {
    ...value,
    unitId: value.unitId ?? null,
    email: value.email ?? null,
    phone: value.phone ?? null,
    document: value.document ?? null,
    nationality: value.nationality ?? null,
    source: value.source ?? 'manual',
    notes: value.notes ?? '',
  }
  const ordered = Object.fromEntries(
    Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b)),
  )
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex')
}

function ensureAccepted(
  value:
    | Pick<CreateInput, 'acceptedTotalMinor'>
    | Pick<PatchInput, 'acceptedTotalMinor'>,
  total: number,
): void {
  const accepted = value.acceptedTotalMinor
  if (accepted === undefined || !Number.isSafeInteger(accepted) || accepted < 0)
    throw conflict('Debe aceptar el total cotizado', 'PRICE_CHANGED')
  if (accepted !== total)
    throw conflict('El precio cambió; cotizá nuevamente', 'PRICE_CHANGED')
}

function parseCreate(raw: unknown): CreateInput {
  const parsed = reservationCreateSchema.safeParse(raw)
  if (!parsed.success) throw zodBadRequest(parsed.error)
  const value: CreateInput = parsed.data
  if (
    !Number.isSafeInteger(value.acceptedTotalMinor) ||
    value.acceptedTotalMinor < 0
  )
    throw conflict('Debe aceptar el total cotizado', 'PRICE_CHANGED')
  return value
}

function parsePatch(raw: unknown): PatchInput {
  const parsed = reservationPatchSchema.safeParse(raw)
  if (!parsed.success) throw zodBadRequest(parsed.error)
  return parsed.data
}

function parseQuoteUpdate(raw: unknown): ReservationQuoteUpdate {
  const parsed = reservationQuoteUpdateSchema.safeParse(raw)
  if (!parsed.success) throw zodBadRequest(parsed.error)
  return parsed.data
}

function parseQuote(raw: unknown): QuoteInput {
  const parsed = reservationQuoteCreateSchema.safeParse(raw)
  if (!parsed.success) throw zodBadRequest(parsed.error)
  return parsed.data
}

function checkPeople(
  value: Pick<QuoteInput, 'adults' | 'children' | 'infants'>,
): void {
  if (!Number.isSafeInteger(value.adults + value.children + value.infants))
    throw conflict('Ocupación fuera de rango', 'OCCUPANCY_INVALID')
}

@Injectable()
export class ReservationService {
  constructor(private readonly dataSource: DataSource) {}

  async quote(context: AuthContext, raw: unknown): Promise<ReservationQuote> {
    const input = parseQuote(raw)
    return withInventoryTransaction(
      this.dataSource,
      { campingId: context.camping.id },
      async (manager) => {
        const type = await this.validateInventory(
          manager,
          context.camping.id,
          input,
          undefined,
        )
        const camping = await manager.findOneOrFail(CampingEntity, {
          where: { id: context.camping.id },
        })
        const snapshot = this.calculateSnapshot(input, type, camping, undefined)
        return reservationQuoteSchema.parse({
          priceSnapshot: snapshotWithoutInternalBase(snapshot),
        })
      },
    )
  }

  async create(
    context: AuthContext,
    raw: unknown,
  ): Promise<ReservationResponse> {
    const input = parseCreate(raw)
    checkPeople(input)
    const requestHash = hashCreate(input)
    return withInventoryTransaction(
      this.dataSource,
      { campingId: context.camping.id },
      async (manager) => {
        const existing = await manager.findOne(ReservationEntity, {
          where: {
            campingId: context.camping.id,
            idempotencyKey: input.idempotencyKey,
          },
          lock: { mode: 'pessimistic_write' },
        })
        if (existing) {
          if (existing.createRequestHash !== requestHash)
            throw conflict(
              'La clave de idempotencia ya fue utilizada con otros datos',
              'IDEMPOTENCY_CONFLICT',
            )
          return reservationView(manager, context, existing)
        }
        const type = await this.validateInventory(
          manager,
          context.camping.id,
          input,
          undefined,
        )
        const camping = await manager.findOneOrFail(CampingEntity, {
          where: { id: context.camping.id },
        })
        const snapshot = this.calculateSnapshot(input, type, camping, undefined)
        ensureAccepted(input, snapshot.totalMinor)
        const row = manager.create(ReservationEntity, {
          ...input,
          campingId: context.camping.id,
          unitId: input.unitId ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          document: input.document ?? null,
          nationality: input.nationality ?? null,
          source: input.source ?? 'manual',
          notes: input.notes ?? '',
          status: 'pending',
          priceSnapshot: snapshotWithoutInternalBase(snapshot),
          createRequestHash: requestHash,
          version: 1,
        })
        const saved = await manager.save(row)
        await appendReservationMutation(
          manager,
          context,
          saved,
          'reservation.created',
          'ReservationCreated',
          null,
          state(saved),
        )
        return reservationView(manager, context, saved)
      },
    )
  }

  async list(context: AuthContext, raw: unknown): Promise<ReservationPage> {
    const parsed = reservationListQuerySchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    const query = parsed.data
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction('REPEATABLE READ')
    try {
      const repository = runner.manager.getRepository(ReservationEntity)
      if (query.typeId) {
        const type = await runner.manager.findOne(AccommodationTypeEntity, {
          where: { id: query.typeId, campingId: context.camping.id },
          select: { id: true },
        })
        if (!type) throw notFound('Tipo de alojamiento')
      }
      const builder = repository
        .createQueryBuilder('reservation')
        .where('reservation.camping_id = :campingId', {
          campingId: context.camping.id,
        })
      if (query.status)
        builder.andWhere('reservation.status = :status', {
          status: query.status,
        })
      if (query.typeId)
        builder.andWhere('reservation.accommodation_type_id = :typeId', {
          typeId: query.typeId,
        })
      if (query.checkInDate)
        builder.andWhere(
          'reservation.check_in_date < :checkOutDate AND reservation.check_out_date > :checkInDate',
          query,
        )
      const [rows, total] = await builder
        .orderBy('reservation.check_in_date', 'ASC')
        .addOrderBy('reservation.created_at', 'DESC')
        .addOrderBy('reservation.id', 'ASC')
        .skip((query.page - 1) * query.pageSize)
        .take(query.pageSize)
        .getManyAndCount()
      if (rows.length) {
        const payments = await runner.manager.find(PaymentEntity, {
          where: {
            campingId: context.camping.id,
            reservationId: In(rows.map((row) => row.id)),
          },
          order: { createdAt: 'ASC', id: 'ASC' },
        })
        const paymentsByReservation = new Map<string, PaymentEntity[]>()
        for (const payment of payments) {
          const list = paymentsByReservation.get(payment.reservationId!) ?? []
          list.push(payment)
          paymentsByReservation.set(payment.reservationId!, list)
        }
        for (const row of rows)
          row.payments = paymentsByReservation.get(row.id) ?? []
      }
      const items = await Promise.all(
        rows.map((row) => reservationView(runner.manager, context, row)),
      )
      await runner.commitTransaction()
      return reservationPageSchema.parse({
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
      })
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction()
      throw error
    } finally {
      await runner.release()
    }
  }

  async get(context: AuthContext, id: string): Promise<ReservationResponse> {
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction('REPEATABLE READ')
    try {
      const row = await lockReservation(runner.manager, context.camping.id, id)
      const value = await reservationView(runner.manager, context, row)
      await runner.commitTransaction()
      return value
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction()
      throw error
    } finally {
      await runner.release()
    }
  }

  async quoteEdit(
    context: AuthContext,
    id: string,
    raw: unknown,
  ): Promise<ReservationUpdateQuote> {
    const patch = parseQuoteUpdate(raw)
    return withInventoryTransaction(
      this.dataSource,
      { campingId: context.camping.id },
      async (manager) => {
        const row = await lockReservation(manager, context.camping.id, id)
        if (row.status !== 'pending' && row.status !== 'confirmed')
          throw conflict(
            'La reserva no se puede editar',
            'INVALID_RESERVATION_STATE',
          )
        if (row.version !== patch.version)
          throw conflict(
            'La reserva cambió; actualizá la pantalla',
            'STALE_RESERVATION',
          )
        const replacement = this.replacement(row, patch)
        const type = await this.validateInventory(
          manager,
          context.camping.id,
          replacement,
          row.id,
        )
        const camping = await manager.findOneOrFail(CampingEntity, {
          where: { id: context.camping.id },
        })
        const snapshot = this.calculateSnapshot(replacement, type, camping, row)
        return reservationUpdateQuoteSchema.parse({
          reservationId: row.id,
          version: row.version,
          priceSnapshot: snapshotWithoutInternalBase(snapshot),
        })
      },
    )
  }

  async update(
    context: AuthContext,
    id: string,
    raw: unknown,
  ): Promise<ReservationResponse> {
    const patch = parsePatch(raw)
    return withInventoryTransaction(
      this.dataSource,
      { campingId: context.camping.id },
      async (manager) => {
        const row = await lockReservation(manager, context.camping.id, id)
        if (row.status !== 'pending' && row.status !== 'confirmed')
          throw conflict(
            'La reserva no se puede editar',
            'INVALID_RESERVATION_STATE',
          )
        if (row.version !== patch.version)
          throw conflict(
            'La reserva cambió; actualizá la pantalla',
            'STALE_RESERVATION',
          )
        const replacement = this.replacement(row, patch)
        const pricing = priceAffectsReservation(patch)
        const before = state(row)
        let nextSnapshot: PriceSnapshot | null = null
        if (pricing) {
          const type = await this.validateInventory(
            manager,
            context.camping.id,
            replacement,
            row.id,
          )
          const camping = await manager.findOneOrFail(CampingEntity, {
            where: { id: context.camping.id },
          })
          nextSnapshot = this.calculateSnapshot(replacement, type, camping, row)
          ensureAccepted(patch, nextSnapshot.totalMinor)
        }
        Object.assign(row, {
          ...replacement,
          unitId: replacement.unitId ?? null,
          email: replacement.email ?? null,
          phone: replacement.phone ?? null,
          document: replacement.document ?? null,
          nationality: replacement.nationality ?? null,
          notes: replacement.notes ?? '',
          priceSnapshot:
            pricing && nextSnapshot
              ? snapshotWithoutInternalBase(nextSnapshot)
              : row.priceSnapshot,
          version: nextReservationVersion(row.version),
          updatedAt: new Date(),
        })
        const saved = await manager.save(row)
        await appendReservationMutation(
          manager,
          context,
          saved,
          'reservation.updated',
          'ReservationUpdated',
          before,
          state(saved),
        )
        return reservationView(manager, context, saved)
      },
    )
  }

  async command(
    context: AuthContext,
    id: string,
    action: 'confirm' | 'cancel' | 'no-show',
    raw: unknown,
  ): Promise<ReservationResponse> {
    const parsed = reservationStatusCommandSchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    return withInventoryTransaction(
      this.dataSource,
      { campingId: context.camping.id },
      async (manager) => {
        const row = await lockReservation(manager, context.camping.id, id)
        const target: ReservationStatus =
          action === 'confirm'
            ? 'confirmed'
            : action === 'cancel'
              ? 'cancelled'
              : 'no_show'
        if (row.status === target) return reservationView(manager, context, row)
        if (row.version !== parsed.data.version)
          throw conflict(
            'La reserva cambió; actualizá la pantalla',
            'STALE_RESERVATION',
          )
        const allowed =
          action === 'confirm'
            ? row.status === 'pending'
            : row.status === 'pending' || row.status === 'confirmed'
        if (!allowed)
          throw conflict(
            'La transición de estado no es válida',
            'INVALID_RESERVATION_STATE',
          )
        if (
          action === 'no-show' &&
          todayInTimezone(context.camping.timezone) < row.checkInDate
        )
          throw conflict(
            'Todavía no corresponde marcar no presentado',
            'NO_SHOW_TOO_EARLY',
          )
        const before = state(row)
        row.status = target
        row.version = nextReservationVersion(row.version)
        row.updatedAt = new Date()
        const saved = await manager.save(row)
        await appendReservationMutation(
          manager,
          context,
          saved,
          `reservation.${action}`,
          `Reservation${action[0].toUpperCase()}${action.slice(1).replace('-', '')}`,
          before,
          state(saved),
        )
        return reservationView(manager, context, saved)
      },
    )
  }

  private replacement(
    row: ReservationEntity,
    patch: PatchInput | ReservationQuoteUpdate,
  ): QuoteInput & Partial<ReservationCreate> {
    return {
      accommodationTypeId: patch.accommodationTypeId ?? row.accommodationTypeId,
      unitId:
        patch.unitId !== undefined
          ? (patch.unitId ?? undefined)
          : (row.unitId ?? undefined),
      checkInDate: patch.checkInDate ?? row.checkInDate,
      checkOutDate: patch.checkOutDate ?? row.checkOutDate,
      adults: patch.adults ?? row.adults,
      children: patch.children ?? row.children,
      infants: patch.infants ?? row.infants,
      agreedTotalMinor: patch.agreedTotalMinor,
      priceAdjustmentReason: patch.priceAdjustmentReason,
      responsibleName: patch.responsibleName ?? row.responsibleName,
      email:
        patch.email !== undefined
          ? (patch.email ?? undefined)
          : (row.email ?? undefined),
      phone:
        patch.phone !== undefined
          ? (patch.phone ?? undefined)
          : (row.phone ?? undefined),
      document:
        patch.document !== undefined
          ? (patch.document ?? undefined)
          : (row.document ?? undefined),
      nationality: (patch.nationality !== undefined
        ? (patch.nationality ?? undefined)
        : (row.nationality ?? undefined)) as ReservationCreate['nationality'],
      source: patch.source ?? row.source,
      notes: patch.notes !== undefined ? (patch.notes ?? undefined) : row.notes,
    }
  }

  private calculateSnapshot(
    input: QuoteInput,
    type: AccommodationTypeEntity,
    camping: CampingEntity,
    row: ReservationEntity | undefined,
  ): PriceSnapshot {
    const sameType = row && row.accommodationTypeId === type.id
    const prior = sameType ? row.priceSnapshot : undefined
    const explicitOverride =
      input.agreedTotalMinor !== undefined ||
      input.priceAdjustmentReason !== undefined
    if (sameType && prior) {
      const frozen = baseFromSnapshot(
        prior,
        input.checkInDate,
        input.checkOutDate,
        input.adults,
        input.children,
        input.infants,
      )
      if (explicitOverride)
        return priceSnapshotFor({
          ...input,
          inventoryMode: type.inventoryMode,
          currency: prior.currency,
          baseNightlyPriceMinor:
            prior.basis === 'per_unit'
              ? prior.baseNightlyPriceMinor
              : undefined,
          rates: prior.basis === 'per_person' ? prior.rates : undefined,
          ageRanges: prior.basis === 'per_person' ? prior.ageRanges : undefined,
        })
      if (frozen.adjustmentMinor !== undefined) {
        const totalMinor = frozen.baseTotalMinor + frozen.adjustmentMinor
        if (!Number.isSafeInteger(totalMinor) || totalMinor < 0)
          throw conflict(
            'El ajuste ya no permite ese rango; indicá un nuevo total',
            'PRICE_ADJUSTMENT_INVALID',
          )
        return { ...frozen, totalMinor }
      }
      return frozen
    }
    const result = priceSnapshotFor({
      ...input,
      inventoryMode: type.inventoryMode,
      currency: camping.currency,
      baseNightlyPriceMinor: type.baseNightlyPriceMinor,
      rates: camping.rates,
      ageRanges: camping.ageRanges,
    })
    return result
  }

  private async validateInventory(
    manager: EntityManager,
    campingId: string,
    input: QuoteInput,
    excludeReservationId: string | undefined,
  ): Promise<AccommodationTypeEntity> {
    checkPeople(input)
    if (input.checkOutDate <= input.checkInDate)
      throw conflict(
        'checkOutDate must be after checkInDate',
        'VALIDATION_ERROR',
      )
    const type = await manager.findOne(AccommodationTypeEntity, {
      where: { id: input.accommodationTypeId, campingId },
    })
    if (!type) throw notFound('Tipo de alojamiento')
    if (!type.enabled)
      throw conflict(
        'El tipo de alojamiento no está habilitado',
        'INVENTORY_UNAVAILABLE',
      )
    const totalPeople = input.adults + input.children + input.infants
    if (type.inventoryMode === 'unlimited') {
      if (input.unitId)
        throw conflict('El camping libre no admite unidad', 'UNIT_NOT_ALLOWED')
      return type
    }
    if (!input.unitId)
      throw conflict('La reserva requiere una unidad', 'UNIT_REQUIRED')
    if (type.maxOccupancy !== null && totalPeople > type.maxOccupancy)
      throw conflict('La ocupación supera el máximo', 'OCCUPANCY_EXCEEDED')
    const unit = await manager.findOne(AccommodationUnitEntity, {
      where: { id: input.unitId, campingId },
    })
    if (!unit) throw notFound('Unidad')
    if (unit.typeId !== type.id)
      throw conflict(
        'La unidad no pertenece al tipo indicado',
        'UNIT_TYPE_MISMATCH',
      )
    if (!unit.enabled)
      throw conflict('La unidad no está habilitada', 'INVENTORY_UNAVAILABLE')
    await assertUnitAvailable(
      manager,
      campingId,
      input.unitId,
      input.checkInDate,
      input.checkOutDate,
      undefined,
      excludeReservationId,
    )
    return type
  }
}
