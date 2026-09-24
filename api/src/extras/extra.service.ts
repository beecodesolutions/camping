import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  addExtraSchema,
  extraTemplateInputSchema,
  extraTemplatePatchSchema,
  extraTemplateSchema,
  updateExtraSchema,
  type ExtraTemplate,
  type Stay,
} from '@camping/contracts'
import {
  conflict,
  isUniqueViolation,
  notFound,
  zodBadRequest,
} from '../common/errors'
import { ExtraTemplateEntity } from '../database/entities/extra-template.entity'
import { AppliedExtraEntity } from '../database/entities/applied-extra.entity'
import { StayEntity } from '../database/entities/stay.entity'
import type { AuthContext } from '../auth/auth.types'
import { StayService } from '../stays/stay.service'

@Injectable()
export class ExtraService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly stayService: StayService,
  ) {}

  async listTemplates(context: AuthContext): Promise<ExtraTemplate[]> {
    const templates = await this.dataSource
      .getRepository(ExtraTemplateEntity)
      .find({
        where: { campingId: context.camping.id },
        order: { description: 'ASC' },
      })
    return templates.map((template) => this.toTemplate(template))
  }

  async createTemplate(
    context: AuthContext,
    raw: unknown,
  ): Promise<ExtraTemplate> {
    const parsed = extraTemplateInputSchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    try {
      const template = await this.dataSource
        .getRepository(ExtraTemplateEntity)
        .save(
          this.dataSource.getRepository(ExtraTemplateEntity).create({
            ...parsed.data,
            campingId: context.camping.id,
            seedKey: null,
            enabled: true,
          }),
        )
      return this.toTemplate(template)
    } catch (error) {
      if (isUniqueViolation(error))
        throw conflict(
          'Ya existe una plantilla con esa descripción',
          'DUPLICATE_TEMPLATE',
        )
      throw error
    }
  }

  async patchTemplate(
    context: AuthContext,
    id: string,
    raw: unknown,
  ): Promise<ExtraTemplate> {
    const parsed = extraTemplatePatchSchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    const repository = this.dataSource.getRepository(ExtraTemplateEntity)
    const template = await repository.findOne({
      where: { id, campingId: context.camping.id },
    })
    if (!template) throw notFound('Plantilla')
    try {
      Object.assign(template, parsed.data, { updatedAt: new Date() })
      await repository.save(template)
      return this.toTemplate(template)
    } catch (error) {
      if (isUniqueViolation(error))
        throw conflict(
          'Ya existe una plantilla con esa descripción',
          'DUPLICATE_TEMPLATE',
        )
      throw error
    }
  }

  async add(context: AuthContext, stayId: string, raw: unknown): Promise<Stay> {
    const parsed = addExtraSchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      const stay = await runner.manager.findOne(StayEntity, {
        where: { id: stayId, campingId: context.camping.id },
        lock: { mode: 'pessimistic_write' },
      })
      if (!stay) throw notFound('Estadía')
      stay.extras = await runner.manager.find(AppliedExtraEntity, {
        where: { stayId: stay.id },
      })
      if (stay.closure)
        throw conflict(
          'No se puede modificar una estadía cerrada',
          'STAY_CLOSED',
        )
      const values =
        'templateId' in parsed.data
          ? await this.templateValues(
              runner.manager,
              context.camping.id,
              parsed.data.templateId,
              parsed.data.quantity,
            )
          : parsed.data
      const extra = runner.manager.create(AppliedExtraEntity, {
        ...values,
        stayId,
        templateId: 'templateId' in parsed.data ? parsed.data.templateId : null,
      })
      await runner.manager.save(extra)
      stay.version += 1
      await runner.manager.update(StayEntity, stay.id, {
        version: stay.version,
      })
      const updated = await this.stayService.findStay(
        context.camping.id,
        stayId,
        runner.manager,
      )
      this.stayService.calculate(updated, stay.arrivalDate)
      const result = this.stayService.toStay(updated, context.camping.timezone)
      await runner.commitTransaction()
      return result
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction()
      throw error
    } finally {
      await runner.release()
    }
  }

  async patch(
    context: AuthContext,
    stayId: string,
    extraId: string,
    raw: unknown,
  ): Promise<Stay> {
    const parsed = updateExtraSchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    return this.mutateApplied(context, stayId, async (manager, stay) => {
      const extra = await manager.findOne(AppliedExtraEntity, {
        where: { id: extraId, stayId },
      })
      if (!extra) throw notFound('Extra aplicado')
      Object.assign(extra, parsed.data)
      await manager.save(extra)
      stay.version += 1
    })
  }

  async remove(
    context: AuthContext,
    stayId: string,
    extraId: string,
  ): Promise<Stay> {
    return this.mutateApplied(context, stayId, async (manager, stay) => {
      const extra = await manager.findOne(AppliedExtraEntity, {
        where: { id: extraId, stayId },
      })
      if (!extra) throw notFound('Extra aplicado')
      await manager.remove(extra)
      stay.version += 1
    })
  }

  private async mutateApplied(
    context: AuthContext,
    stayId: string,
    operation: (
      manager: ReturnType<DataSource['createQueryRunner']>['manager'],
      stay: StayEntity,
    ) => Promise<void>,
  ): Promise<Stay> {
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      const stay = await runner.manager.findOne(StayEntity, {
        where: { id: stayId, campingId: context.camping.id },
        lock: { mode: 'pessimistic_write' },
      })
      if (!stay) throw notFound('Estadía')
      stay.extras = await runner.manager.find(AppliedExtraEntity, {
        where: { stayId: stay.id },
      })
      if (stay.closure)
        throw conflict(
          'No se puede modificar una estadía cerrada',
          'STAY_CLOSED',
        )
      await operation(runner.manager, stay)
      await runner.manager.update(StayEntity, stay.id, {
        version: stay.version,
      })
      const updated = await this.stayService.findStay(
        context.camping.id,
        stayId,
        runner.manager,
      )
      this.stayService.calculate(updated, stay.arrivalDate)
      const result = this.stayService.toStay(updated, context.camping.timezone)
      await runner.commitTransaction()
      return result
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction()
      throw error
    } finally {
      await runner.release()
    }
  }

  private async templateValues(
    manager: ReturnType<DataSource['createQueryRunner']>['manager'],
    campingId: string,
    id: string,
    quantity: number,
  ) {
    const template = await manager.findOne(ExtraTemplateEntity, {
      where: { id, campingId },
    })
    if (!template || !template.enabled) throw notFound('Plantilla')
    return {
      category: template.category,
      description: template.description,
      unitPriceMinor: template.unitPriceMinor,
      quantity,
    }
  }

  private toTemplate(template: ExtraTemplateEntity): ExtraTemplate {
    return extraTemplateSchema.parse({
      id: template.id,
      category: template.category,
      description: template.description,
      unitPriceMinor: template.unitPriceMinor,
      enabled: template.enabled,
    })
  }
}
