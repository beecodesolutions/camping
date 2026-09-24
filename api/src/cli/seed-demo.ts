import { createHash } from 'node:crypto'
import { todayInTimezone, checkInRequestSchema } from '@camping/contracts'
import { CampingEntity } from '../database/entities/camping.entity'
import { UserEntity } from '../database/entities/user.entity'
import { StayEntity } from '../database/entities/stay.entity'
import { ExtraTemplateEntity } from '../database/entities/extra-template.entity'
import { AppliedExtraEntity } from '../database/entities/applied-extra.entity'
import { StayService } from '../stays/stay.service'
import {
  createAdminDataSource,
  destroy,
  inputError,
  reportCliFailure,
} from './common'

function demoId(campingId: string, index: number): string {
  const hash = createHash('sha256')
    .update(`camping-demo-v1:${campingId}:${index}`)
    .digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

async function seedDemo(): Promise<void> {
  // Demo data must never be sent to the remote pilot, even with admin credentials.
  const url = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL
  const host = url
    ? new URL(url).hostname
    : (process.env.DB_HOST ?? 'localhost')
  if (
    process.env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)
  ) {
    inputError('Demo seed is restricted to local PostgreSQL outside production')
  }
  const dataSource = await createAdminDataSource()
  try {
    await dataSource.initialize()
    const result = await dataSource.transaction(async (manager) => {
      const camping = await manager.findOne(CampingEntity, {
        where: { stableKey: process.env.CAMPING_KEY ?? 'la-izuelina' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!camping) inputError('Run pnpm db:seed first')
      const user = await manager.findOne(UserEntity, {
        where: { campingId: camping.id, enabled: true },
        order: { createdAt: 'ASC', id: 'ASC' },
      })
      if (!user)
        inputError(
          'Create a local user with pnpm user before seeding demo stays',
        )
      const templates = await manager.find(ExtraTemplateEntity, {
        where: { campingId: camping.id, enabled: true },
        order: { description: 'ASC' },
      })
      const today = todayInTimezone(camping.timezone)
      const date = (offset: number) => {
        const value = new Date(`${today}T12:00:00Z`)
        value.setUTCDate(value.getUTCDate() + offset)
        return value.toISOString().slice(0, 10)
      }
      const service = new StayService(dataSource)
      const names = [
        'Familia Río',
        'Grupo Cordillera',
        'Pareja Bosque',
        'Viajero Lago',
        'Familia Cóndor',
        'Grupo Sendero',
        'Pareja Sur',
        'Familia Arrayán',
        'Grupo Volcán',
        'Viajera Estrella',
        'Familia Cascada',
        'Grupo Mirador',
      ]
      let inserted = 0
      for (let index = 0; index < 24; index++) {
        const id = demoId(camping.id, index)
        if (await manager.existsBy(StayEntity, { id })) continue
        const closed = index >= 12
        const departureOffset = -(index - 11) * 5
        const arrivalOffset = closed
          ? departureOffset - (index % 4)
          : -(index % 6)
        const arrivalDate = date(arrivalOffset)
        const fields = checkInRequestSchema.parse({
          responsibleName: `[DEMO] ${names[index % names.length]}${closed ? ' · historial' : ''}`,
          document: index % 3 ? `DEMO-${index + 1}` : '',
          nationality: ['CL', 'AR', 'BR', ''][index % 4],
          phone: '',
          arrivalDate,
          estimatedDeparture:
            index % 3 === 0
              ? ''
              : date(closed ? departureOffset : 2 + (index % 4)),
          adults: 1 + (index % 3),
          children: index % 3,
          infants: index % 2,
          hasVehicle: index % 3 !== 0,
          vehicleDescription: index % 2 ? 'Camper de prueba' : '',
          licensePlate: '',
          location: index % 4 ? `Sector demo ${index % 4}` : '',
        })
        const stay = manager.create(StayEntity, {
          ...fields,
          id,
          campingId: camping.id,
          createdById: user.id,
          estimatedDeparture: fields.estimatedDeparture || null,
          currency: camping.currency,
          rates: { ...camping.rates },
          ageRanges: camping.ageRanges,
          version: 1,
          closedAt: null,
          closedById: null,
          closure: null,
          createdAt: new Date(`${arrivalDate}T12:00:00Z`),
        })
        await manager.save(stay)
        const extras: AppliedExtraEntity[] = []
        if (index % 3 !== 0 && templates.length) {
          const template = templates[index % templates.length]!
          extras.push(
            manager.create(AppliedExtraEntity, {
              stayId: id,
              templateId: template.id,
              description: template.description,
              category: template.category,
              unitPriceMinor: template.unitPriceMinor,
              quantity: 1 + (index % 3),
              createdAt: stay.createdAt,
            }),
          )
        }
        if (index % 4 === 1)
          extras.push(
            manager.create(AppliedExtraEntity, {
              stayId: id,
              templateId: null,
              description: '[DEMO] Servicio libre',
              category: 'Servicios',
              quantity: 2,
              unitPriceMinor: 1500,
              createdAt: stay.createdAt,
            }),
          )
        if (extras.length) await manager.save(extras)
        stay.extras = extras
        stay.version += extras.length
        if (closed) {
          const departureDate = date(departureOffset)
          stay.closedAt = new Date(`${departureDate}T18:00:00Z`)
          stay.closedById = user.id
          stay.closure = {
            ...service.calculate(stay, departureDate),
            closedAt: stay.closedAt.toISOString(),
            closedBy: user.id,
          }
        }
        await manager.update(StayEntity, id, {
          version: stay.version,
          closedAt: stay.closedAt,
          closedById: stay.closedById,
          closure: stay.closure,
        })
        inserted++
      }
      return inserted
    })
    console.log(
      `Demo seed: ${result} stays added; ${24 - result} existing stays preserved`,
    )
  } finally {
    await destroy(dataSource)
  }
}

void seedDemo().catch((error: unknown) => {
  reportCliFailure('Demo seed', error)
  process.exitCode = 1
})
