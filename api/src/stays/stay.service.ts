import { BadRequestException, Injectable } from '@nestjs/common'
import { DataSource, IsNull, Not, type EntityManager } from 'typeorm'
import {
  checkInSchemaForTimezone,
  closeRequestSchema,
  paymentInputSchema,
  quoteRequestSchema,
  todayInTimezone,
  type AgeRanges,
  type CostBreakdown,
  type Payment,
  type Rates,
  type Stay,
  type StayAccount,
  type StayPage,
  type StayQuote,
} from '@camping/contracts'
import { daysBetween, ensureSafeMoney, validateDeparture } from '../common/date'
import {
  conflict,
  isUniqueViolation,
  notFound,
  zodBadRequest,
} from '../common/errors'
import { CampingEntity } from '../database/entities/camping.entity'
import { StayEntity } from '../database/entities/stay.entity'
import { AppliedExtraEntity } from '../database/entities/applied-extra.entity'
import { PaymentEntity } from '../database/entities/payment.entity'
import type { AuthContext } from '../auth/auth.types'

type ClosureValue = CostBreakdown & { closedAt: string; closedBy: string }
type PaymentValues = {
  amountMinor: number
  method: Payment['method']
  paidOn: string
  note: string
  idempotencyKey: string
}

@Injectable()
export class StayService {
  constructor(private readonly dataSource: DataSource) {}

  async create(context: AuthContext, raw: unknown): Promise<{ id: string }> {
    const camping = await this.loadCamping(context.camping.id)
    const parsed = checkInSchemaForTimezone(camping.timezone).safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    const stay = this.dataSource.getRepository(StayEntity).create({
      ...parsed.data,
      campingId: camping.id,
      createdById: context.user.id,
      estimatedDeparture: parsed.data.estimatedDeparture || null,
      currency: camping.currency,
      ageRanges: camping.ageRanges,
      rates: camping.rates,
      version: 1,
      closedAt: null,
      closedById: null,
      closure: null,
    })
    this.calculate(
      { ...stay, extras: [], payments: [] } as StayEntity,
      stay.arrivalDate,
    )
    const saved = await this.dataSource.getRepository(StayEntity).save(stay)
    return { id: saved.id }
  }

  async list(
    context: AuthContext,
    status: string | undefined,
    pageRaw: string | undefined,
    pageSizeRaw: string | undefined,
  ): Promise<StayPage> {
    const page = this.pageNumber(pageRaw, 1)
    const pageSize = Math.min(this.pageNumber(pageSizeRaw, 25), 100)
    if (!Number.isSafeInteger((page - 1) * pageSize))
      throw new BadRequestException('Paginación inválida')
    if (status && status !== 'active' && status !== 'closed')
      throw new BadRequestException('Estado inválido')
    const where =
      status === 'closed'
        ? { campingId: context.camping.id, closedAt: Not(IsNull()) }
        : { campingId: context.camping.id, closedAt: IsNull() }
    const [items, total] = await this.dataSource
      .getRepository(StayEntity)
      .findAndCount({
        where,
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        relations: { extras: true, payments: true },
      })
    return {
      items: items.map((stay) => this.toStay(stay, context.camping.timezone)),
      total,
      page,
      pageSize,
    }
  }

  async get(context: AuthContext, id: string): Promise<Stay> {
    return this.toStay(
      await this.findStay(context.camping.id, id),
      context.camping.timezone,
    )
  }

  async quote(
    context: AuthContext,
    id: string,
    raw: unknown,
  ): Promise<StayQuote> {
    const parsed = quoteRequestSchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    const stay = await this.findStay(context.camping.id, id)
    if (stay.closure) {
      const breakdown = this.asBreakdown(stay.closure)
      return {
        ...breakdown,
        account: this.accountForTotal(
          stay,
          breakdown.totalMinor,
          breakdown.departureDate,
        ),
      }
    }
    validateDeparture(
      stay.arrivalDate,
      parsed.data.departureDate,
      context.camping.timezone,
    )
    const breakdown = this.calculate(stay, parsed.data.departureDate)
    return {
      ...breakdown,
      account: this.accountForTotal(
        stay,
        breakdown.totalMinor,
        breakdown.departureDate,
      ),
    }
  }

  async recordPayment(
    context: AuthContext,
    stayId: string,
    raw: unknown,
  ): Promise<Stay> {
    const parsed = paymentInputSchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    this.validatePaymentDate(parsed.data.paidOn, context.camping.timezone)
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      const stay = await this.lockStay(
        runner.manager,
        context.camping.id,
        stayId,
      )
      await this.appendPayment(runner.manager, context, stay, parsed.data)
      const result = this.toStay(stay, context.camping.timezone)
      await runner.commitTransaction()
      return result
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction()
      if (isUniqueViolation(error)) throw this.idempotencyConflict()
      throw error
    } finally {
      await runner.release()
    }
  }

  async close(context: AuthContext, id: string, raw: unknown): Promise<Stay> {
    const parsed = closeRequestSchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    if (parsed.data.payment)
      this.validatePaymentDate(
        parsed.data.payment.paidOn,
        context.camping.timezone,
      )
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const stay = await this.lockStay(
        queryRunner.manager,
        context.camping.id,
        id,
      )
      if (stay.closure) {
        if (stay.closure.departureDate !== parsed.data.departureDate)
          throw conflict(
            'La estadía ya fue cerrada con otra fecha',
            'STAY_CLOSED',
          )
        if (parsed.data.payment) {
          const existing = await this.findIdempotentPayment(
            queryRunner.manager,
            context.camping.id,
            parsed.data.payment.idempotencyKey,
          )
          if (!existing)
            throw conflict(
              'La estadía ya fue cerrada; registrá el pago por separado',
              'STAY_CLOSED',
            )
          this.assertSamePayment(existing, stay.id, parsed.data.payment)
        }
        await queryRunner.commitTransaction()
        return this.toStay(stay, context.camping.timezone)
      }
      if (stay.version !== parsed.data.version)
        throw conflict(
          'La estadía cambió; actualizá el presupuesto',
          'STALE_STAY',
        )
      validateDeparture(
        stay.arrivalDate,
        parsed.data.departureDate,
        context.camping.timezone,
      )
      if (parsed.data.payment)
        await this.appendPayment(
          queryRunner.manager,
          context,
          stay,
          parsed.data.payment,
        )
      const breakdown = this.calculate(stay, parsed.data.departureDate)
      const account = this.accountForTotal(
        stay,
        breakdown.totalMinor,
        breakdown.departureDate,
      )
      if (account.balanceMinor !== 0)
        throw conflict(
          'El saldo debe quedar en cero para cerrar la estadía',
          'BALANCE_NOT_ZERO',
        )
      const closedAt = new Date().toISOString()
      stay.closedAt = new Date(closedAt)
      stay.closedById = context.user.id
      stay.closure = { ...breakdown, closedAt, closedBy: context.user.id }
      await queryRunner.manager.save(stay)
      await queryRunner.commitTransaction()
      return this.toStay(stay, context.camping.timezone)
    } catch (error) {
      if (queryRunner.isTransactionActive)
        await queryRunner.rollbackTransaction()
      if (isUniqueViolation(error)) throw this.idempotencyConflict()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  calculate(stay: StayEntity, departureDate: string): CostBreakdown {
    const nights = daysBetween(stay.arrivalDate, departureDate)
    const accommodationMinor = ensureSafeMoney(
      stay.adults * stay.rates.adults * nights +
        stay.children * stay.rates.children * nights +
        stay.infants * stay.rates.infants * nights,
    )
    const extrasMinor = ensureSafeMoney(
      (stay.extras ?? []).reduce(
        (total, extra) =>
          ensureSafeMoney(total + extra.quantity * extra.unitPriceMinor),
        0,
      ),
    )
    return {
      departureDate,
      nights,
      accommodationMinor,
      extrasMinor,
      totalMinor: ensureSafeMoney(accommodationMinor + extrasMinor),
      version: stay.version,
    }
  }

  account(stay: StayEntity, timezone: string): StayAccount {
    const breakdown = stay.closure
      ? this.asBreakdown(stay.closure)
      : this.calculate(stay, todayInTimezone(timezone))
    return this.accountForTotal(
      stay,
      breakdown.totalMinor,
      breakdown.departureDate,
    )
  }

  async findStay(
    campingId: string,
    id: string,
    manager = this.dataSource.manager,
  ): Promise<StayEntity> {
    const stay = await manager.findOne(StayEntity, {
      where: { id, campingId },
      relations: { extras: true, payments: true },
    })
    if (!stay) throw notFound('Estadía')
    return stay
  }

  toStay(stay: StayEntity, timezone: string): Stay {
    return {
      id: stay.id,
      responsibleName: stay.responsibleName,
      document: stay.document,
      nationality: stay.nationality,
      phone: stay.phone,
      arrivalDate: stay.arrivalDate,
      estimatedDeparture: stay.estimatedDeparture ?? '',
      adults: stay.adults,
      children: stay.children,
      infants: stay.infants,
      hasVehicle: stay.hasVehicle,
      vehicleDescription: stay.vehicleDescription,
      licensePlate: stay.licensePlate,
      location: stay.location,
      currency: stay.currency,
      ageRanges: stay.ageRanges as AgeRanges,
      rates: stay.rates as Rates,
      version: stay.version,
      extras: (stay.extras ?? []).map((extra) => ({
        id: extra.id,
        templateId: extra.templateId,
        category: extra.category,
        description: extra.description,
        quantity: extra.quantity,
        unitPriceMinor: extra.unitPriceMinor,
      })),
      payments: [...(stay.payments ?? [])]
        .sort(
          (left, right) =>
            left.createdAt.getTime() - right.createdAt.getTime() ||
            left.id.localeCompare(right.id),
        )
        .map((payment) => this.toPayment(payment)),
      account: this.account(stay, timezone),
      closure: stay.closure,
      createdAt: stay.createdAt.toISOString(),
    }
  }

  private async lockStay(
    manager: EntityManager,
    campingId: string,
    id: string,
  ): Promise<StayEntity> {
    const stay = await manager.findOne(StayEntity, {
      where: { id, campingId },
      lock: { mode: 'pessimistic_write' },
    })
    if (!stay) throw notFound('Estadía')
    stay.extras = await manager.find(AppliedExtraEntity, {
      where: { stayId: stay.id },
    })
    stay.payments = await manager.find(PaymentEntity, {
      where: { stayId: stay.id },
    })
    return stay
  }

  private async appendPayment(
    manager: EntityManager,
    context: AuthContext,
    stay: StayEntity,
    input: PaymentValues,
  ): Promise<void> {
    const existing = await this.findIdempotentPayment(
      manager,
      context.camping.id,
      input.idempotencyKey,
    )
    if (existing) {
      this.assertSamePayment(existing, stay.id, input)
      return
    }
    if (stay.closure) {
      const balance = this.account(stay, context.camping.timezone).balanceMinor
      if (balance <= 0 || input.amountMinor > balance)
        throw conflict(
          'El pago supera el saldo pendiente de la estadía cerrada',
          'OVERPAYMENT',
        )
    }
    const payment = manager.create(PaymentEntity, {
      campingId: context.camping.id,
      stayId: stay.id,
      amountMinor: input.amountMinor,
      method: input.method,
      paidOn: input.paidOn,
      note: input.note,
      recordedById: context.user.id,
      idempotencyKey: input.idempotencyKey,
    })
    await manager.save(payment)
    stay.payments.push(payment)
    stay.version += 1
    await manager.update(StayEntity, stay.id, { version: stay.version })
  }

  private async findIdempotentPayment(
    manager: EntityManager,
    campingId: string,
    idempotencyKey: string,
  ): Promise<PaymentEntity | null> {
    return manager.findOne(PaymentEntity, {
      where: { campingId, idempotencyKey },
    })
  }

  private assertSamePayment(
    existing: PaymentEntity,
    stayId: string,
    input: PaymentValues,
  ): void {
    if (
      existing.stayId !== stayId ||
      existing.amountMinor !== input.amountMinor ||
      existing.method !== input.method ||
      existing.paidOn !== input.paidOn ||
      existing.note !== input.note
    )
      throw this.idempotencyConflict()
  }

  private idempotencyConflict() {
    return conflict(
      'La clave de idempotencia ya fue usada con otro pago',
      'IDEMPOTENCY_CONFLICT',
    )
  }

  private accountForTotal(
    stay: StayEntity,
    totalMinor: number,
    asOfDate: string,
  ): StayAccount {
    const paidMinor = (stay.payments ?? []).reduce(
      (total, payment) =>
        ensureSafeMoney(total + ensureSafeMoney(payment.amountMinor)),
      0,
    )
    const balanceMinor = totalMinor - paidMinor
    if (!Number.isSafeInteger(balanceMinor))
      throw new BadRequestException({
        code: 'MONEY_OVERFLOW',
        message: 'Importe inválido',
      })
    return { totalMinor, paidMinor, balanceMinor, asOfDate }
  }

  private toPayment(payment: PaymentEntity): Payment {
    return {
      id: payment.id,
      amountMinor: payment.amountMinor,
      method: payment.method,
      paidOn: payment.paidOn,
      note: payment.note,
      createdAt: payment.createdAt.toISOString(),
      recordedBy: payment.recordedById,
    }
  }

  private validatePaymentDate(paidOn: string, timezone: string): void {
    if (paidOn > todayInTimezone(timezone))
      throw new BadRequestException({
        code: 'FUTURE_PAYMENT_DATE',
        message: 'La fecha del pago no puede ser futura',
      })
  }

  private asBreakdown(value: ClosureValue): CostBreakdown {
    const { closedAt: _closedAt, closedBy: _closedBy, ...breakdown } = value
    return breakdown
  }

  private async loadCamping(id: string): Promise<CampingEntity> {
    const camping = await this.dataSource
      .getRepository(CampingEntity)
      .findOne({ where: { id } })
    if (!camping) throw notFound('Camping')
    return camping
  }

  private pageNumber(value: string | undefined, fallback: number): number {
    if (value === undefined) return fallback
    const parsed = Number(value)
    if (!Number.isSafeInteger(parsed) || parsed < 1)
      throw new BadRequestException('Paginación inválida')
    return parsed
  }
}
