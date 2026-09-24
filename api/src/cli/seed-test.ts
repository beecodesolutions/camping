import { createHash } from 'node:crypto'
import { parseArgs } from 'node:util'
import {
  checkInRequestSchema,
  todayInTimezone,
  type AgeRanges,
  type Rates,
} from '@camping/contracts'
import { CampingEntity } from '../database/entities/camping.entity'
import { ExtraTemplateEntity } from '../database/entities/extra-template.entity'
import { AppliedExtraEntity } from '../database/entities/applied-extra.entity'
import { PaymentEntity } from '../database/entities/payment.entity'
import { StayEntity } from '../database/entities/stay.entity'
import { UserEntity } from '../database/entities/user.entity'
import { StayService } from '../stays/stay.service'
import {
  createAdminDataSource,
  destroy,
  inputError,
  reportCliFailure,
} from './common'

const TEST_CAMPING = {
  key: 'valle-escondido',
  name: 'Camping Valle Escondido',
  country: 'CL',
  currency: 'CLP',
  timezone: 'America/Santiago',
  ageRanges: {
    infants: { min: 0, max: 5 },
    children: { min: 6, max: 17 },
    adults: { min: 18, max: null },
  } satisfies AgeRanges,
  rates: { adults: 14000, children: 7000, infants: 0 } satisfies Rates,
} as const

const TEST_EXTRAS = [
  {
    key: 'desayuno-campestre',
    category: 'Gastronomía',
    description: 'Desayuno campestre',
    unitPriceMinor: 6000,
  },
  {
    key: 'lena-fogon',
    category: 'Servicios',
    description: 'Leña para fogón',
    unitPriceMinor: 4500,
  },
  {
    key: 'bicicleta',
    category: 'Actividades',
    description: 'Arriendo de bicicleta',
    unitPriceMinor: 8000,
  },
] as const

type ExtraSeed =
  | { templateKey: (typeof TEST_EXTRAS)[number]['key']; quantity: number }
  | {
      description: string
      category: string
      quantity: number
      unitPriceMinor: number
    }

type StaySeed = {
  key: string
  responsibleName: string
  document: string
  nationality: string
  arrivalOffset: number
  departureOffset: number | null
  closed: boolean
  adults: number
  children: number
  infants: number
  hasVehicle: boolean
  vehicleDescription: string
  location: string
  extras: ExtraSeed[]
  payment: {
    amountMinor: number
    method: 'cash' | 'transfer' | 'card'
    offset: number
    note: string
  }
}

const STAYS: StaySeed[] = [
  {
    key: 'active-family',
    responsibleName: 'María González',
    document: '18.456.789-2',
    nationality: 'CL',
    arrivalOffset: -2,
    departureOffset: 2,
    closed: false,
    adults: 2,
    children: 1,
    infants: 0,
    hasVehicle: true,
    vehicleDescription: 'Camioneta blanca',
    location: 'Sector bosque',
    extras: [{ templateKey: 'desayuno-campestre', quantity: 2 }],
    payment: {
      amountMinor: 30000,
      method: 'transfer',
      offset: -1,
      note: 'Abono de reserva',
    },
  },
  {
    key: 'active-couple',
    responsibleName: 'Javier Morales',
    document: '15.238.441-7',
    nationality: 'CL',
    arrivalOffset: -1,
    departureOffset: null,
    closed: false,
    adults: 2,
    children: 0,
    infants: 0,
    hasVehicle: false,
    vehicleDescription: '',
    location: 'Terraza del río',
    extras: [
      { templateKey: 'lena-fogon', quantity: 1 },
      {
        description: 'Canasta de bienvenida',
        category: 'Atenciones',
        quantity: 1,
        unitPriceMinor: 9000,
      },
    ],
    payment: {
      amountMinor: 14000,
      method: 'cash',
      offset: 0,
      note: 'Pago parcial',
    },
  },
  {
    key: 'active-friends',
    responsibleName: 'Sofía Rojas',
    document: '21.984.320-1',
    nationality: 'AR',
    arrivalOffset: -4,
    departureOffset: 1,
    closed: false,
    adults: 3,
    children: 0,
    infants: 0,
    hasVehicle: true,
    vehicleDescription: 'Motorhome gris',
    location: 'Pradera central',
    extras: [{ templateKey: 'bicicleta', quantity: 2 }],
    payment: {
      amountMinor: 42000,
      method: 'card',
      offset: -3,
      note: 'Abono de reserva',
    },
  },
  {
    key: 'history-hikers',
    responsibleName: 'Diego Fernández',
    document: '16.778.901-5',
    nationality: 'CL',
    arrivalOffset: -15,
    departureOffset: -12,
    closed: true,
    adults: 2,
    children: 0,
    infants: 0,
    hasVehicle: false,
    vehicleDescription: '',
    location: 'Sector bosque',
    extras: [{ templateKey: 'desayuno-campestre', quantity: 2 }],
    payment: {
      amountMinor: 96000,
      method: 'transfer',
      offset: -12,
      note: 'Cuenta cancelada',
    },
  },
  {
    key: 'history-family',
    responsibleName: 'Valentina Silva',
    document: '14.332.118-9',
    nationality: 'CL',
    arrivalOffset: -24,
    departureOffset: -20,
    closed: true,
    adults: 2,
    children: 2,
    infants: 0,
    hasVehicle: true,
    vehicleDescription: 'SUV azul',
    location: 'Mirador norte',
    extras: [
      { templateKey: 'lena-fogon', quantity: 2 },
      { templateKey: 'bicicleta', quantity: 1 },
    ],
    payment: {
      amountMinor: 185000,
      method: 'card',
      offset: -20,
      note: 'Cuenta cancelada',
    },
  },
  {
    key: 'history-couple',
    responsibleName: 'Camila Navarro',
    document: '17.205.664-3',
    nationality: 'BR',
    arrivalOffset: -31,
    departureOffset: -29,
    closed: true,
    adults: 2,
    children: 0,
    infants: 0,
    hasVehicle: false,
    vehicleDescription: '',
    location: 'Terraza del río',
    extras: [],
    payment: {
      amountMinor: 56000,
      method: 'cash',
      offset: -29,
      note: 'Cuenta cancelada',
    },
  },
] as const

const HELP = `Usage:
  pnpm seed:test [--config-only]

Creates the isolated Valle Escondido tenant and representative stays.
Tenant key: valle-escondido.
Use --config-only before creating a user for the tenant.`

function seededUuid(scope: string, key: string): string {
  const hash = createHash('sha256')
    .update(`camping-${scope}-v1:${key}`)
    .digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

function dateFrom(today: string, offset: number): string {
  const value = new Date(`${today}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + offset)
  return value.toISOString().slice(0, 10)
}

function assertCampingIdentity(camping: CampingEntity): void {
  const ranges = camping.ageRanges
  const expectedRanges = TEST_CAMPING.ageRanges
  const matches =
    camping.name === TEST_CAMPING.name &&
    camping.country === TEST_CAMPING.country &&
    camping.currency === TEST_CAMPING.currency &&
    camping.timezone === TEST_CAMPING.timezone &&
    ranges.infants.min === expectedRanges.infants.min &&
    ranges.infants.max === expectedRanges.infants.max &&
    ranges.children.min === expectedRanges.children.min &&
    ranges.children.max === expectedRanges.children.max &&
    ranges.adults.min === expectedRanges.adults.min &&
    ranges.adults.max === expectedRanges.adults.max
  if (!matches)
    inputError(
      `Camping ${TEST_CAMPING.key} does not match the fixed test identity; refusing to seed`,
    )
}

async function ensureCampingAndExtras(
  dataSource: Awaited<ReturnType<typeof createAdminDataSource>>,
): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const repository = manager.getRepository(CampingEntity)
    let camping = await repository.findOne({
      where: { stableKey: TEST_CAMPING.key },
    })
    if (!camping) {
      camping = await repository.save(
        repository.create({ ...TEST_CAMPING, stableKey: TEST_CAMPING.key }),
      )
    } else assertCampingIdentity(camping)

    const templateRepository = manager.getRepository(ExtraTemplateEntity)
    for (const extra of TEST_EXTRAS) {
      const existing = await templateRepository.findOne({
        where: { campingId: camping.id, seedKey: extra.key },
      })
      if (existing) continue
      await templateRepository.save(
        templateRepository.create({
          campingId: camping.id,
          seedKey: extra.key,
          category: extra.category,
          description: extra.description,
          unitPriceMinor: extra.unitPriceMinor,
          enabled: true,
        }),
      )
    }
  })
}

async function seedStays(
  dataSource: Awaited<ReturnType<typeof createAdminDataSource>>,
): Promise<{ added: number; existing: number }> {
  return dataSource.transaction(async (manager) => {
    const camping = await manager.findOne(CampingEntity, {
      where: { stableKey: TEST_CAMPING.key },
      lock: { mode: 'pessimistic_write' },
    })
    if (!camping) inputError('Test camping was not created')
    const user = await manager.findOne(UserEntity, {
      where: { campingId: camping.id, enabled: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    })
    if (!user)
      inputError(
        'Create a user with pnpm user -- create --camping-key=valle-escondido, then run pnpm seed:test again',
      )

    const templates = await manager.find(ExtraTemplateEntity, {
      where: { campingId: camping.id, enabled: true },
    })
    const byKey = new Map(
      templates.map((template) => [template.seedKey, template]),
    )
    const today = todayInTimezone(camping.timezone)
    const service = new StayService(dataSource)
    let added = 0
    let existing = 0

    for (const seed of STAYS) {
      const id = seededUuid('stay', `${camping.id}:${seed.key}`)
      const arrivalDate = dateFrom(today, seed.arrivalOffset)
      const departureDate =
        seed.departureOffset === null
          ? null
          : dateFrom(today, seed.departureOffset)
      let stay = await manager.findOne(StayEntity, {
        where: { id, campingId: camping.id },
        relations: { extras: true, payments: true },
      })
      if (!stay) {
        const fields = checkInRequestSchema.parse({
          responsibleName: seed.responsibleName,
          document: seed.document,
          nationality: seed.nationality,
          phone: '',
          arrivalDate,
          estimatedDeparture: departureDate ?? '',
          adults: seed.adults,
          children: seed.children,
          infants: seed.infants,
          hasVehicle: seed.hasVehicle,
          vehicleDescription: seed.vehicleDescription,
          licensePlate: '',
          location: seed.location,
        })
        stay = manager.create(StayEntity, {
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
        stay.extras = []
        stay.payments = []
        await manager.save(stay)
        added++
      } else {
        existing++
        continue
      }

      const existingExtras = stay.extras ?? []
      const extrasToAdd: AppliedExtraEntity[] = []
      for (const extra of seed.extras) {
        const custom = 'templateKey' in extra ? null : extra
        const template =
          'templateKey' in extra ? byKey.get(extra.templateKey) : null
        if ('templateKey' in extra && !template)
          inputError(`Missing extra template ${extra.templateKey}`)
        const alreadyApplied = existingExtras.some(
          (value) =>
            value.templateId === (template?.id ?? null) &&
            (template !== null || value.description === custom?.description),
        )
        if (alreadyApplied) continue
        extrasToAdd.push(
          manager.create(AppliedExtraEntity, {
            stayId: stay.id,
            templateId: template?.id ?? null,
            description: template?.description ?? custom?.description ?? '',
            category: template?.category ?? custom?.category ?? '',
            quantity: extra.quantity,
            unitPriceMinor:
              template?.unitPriceMinor ?? custom?.unitPriceMinor ?? 0,
            createdAt: stay.createdAt,
          }),
        )
      }
      if (extrasToAdd.length) {
        await manager.save(extrasToAdd)
        existingExtras.push(...extrasToAdd)
        stay.extras = existingExtras
        stay.version += extrasToAdd.length
      }

      const idempotencyKey = seededUuid('payment', `${camping.id}:${seed.key}`)
      const existingPayment = await manager.findOne(PaymentEntity, {
        where: { campingId: camping.id, idempotencyKey },
      })
      if (!existingPayment) {
        const payment = manager.create(PaymentEntity, {
          campingId: camping.id,
          stayId: stay.id,
          amountMinor: seed.payment.amountMinor,
          method: seed.payment.method,
          paidOn: dateFrom(today, seed.payment.offset),
          note: seed.payment.note,
          recordedById: user.id,
          idempotencyKey,
        })
        await manager.save(payment)
        stay.payments = [...(stay.payments ?? []), payment]
        stay.version += 1
      }

      if (seed.closed && departureDate && !stay.closure) {
        stay.closedAt = new Date(`${departureDate}T18:00:00Z`)
        stay.closedById = user.id
        stay.closure = {
          ...service.calculate(stay, departureDate),
          closedAt: stay.closedAt.toISOString(),
          closedBy: user.id,
        }
      }
      await manager.save(stay)
    }
    return { added, existing }
  })
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      'config-only': { type: 'boolean' },
    },
  })
  if (values.help) {
    console.log(HELP)
    return
  }
  if (positionals.length) inputError(`Unknown argument.\n\n${HELP}`)
  const dataSource = await createAdminDataSource()
  try {
    await dataSource.initialize()
    await ensureCampingAndExtras(dataSource)
    if (values['config-only']) {
      console.log(
        'Valle Escondido configuration is ready; create a user and rerun seed:test',
      )
      return
    }
    const result = await seedStays(dataSource)
    console.log(
      `Valle Escondido seed: ${result.added} stays added; ${result.existing} existing stays preserved`,
    )
  } finally {
    await destroy(dataSource)
  }
}

void main().catch((error: unknown) => {
  reportCliFailure('Test camping seed', error)
  process.exitCode = 1
})
