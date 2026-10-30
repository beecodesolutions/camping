import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createAppStore } from '../app/store'
import { handlers, resetDemoStays } from '../mocks/handlers'
import { checkInDefaults, checkInSchema } from '../checkIn/schema'
import { api } from './api'

const server = setupServer(...handlers)
let store = createAppStore()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  resetDemoStays()
  store.dispatch(api.util.resetApiState())
  store = createAppStore()
  server.resetHandlers()
  vi.restoreAllMocks()
})
afterAll(() => server.close())

it('consulta sesión y camping simulado con contratos compartidos', async () => {
  await expect(
    store.dispatch(api.endpoints.session.initiate()).unwrap(),
  ).resolves.toEqual({ id: 'demo-user', username: 'demo', name: 'Lucía' })
  await expect(
    store.dispatch(api.endpoints.camping.initiate()).unwrap(),
  ).resolves.toMatchObject({
    id: 'la-izuelina',
    currency: 'CLP',
    timezone: 'America/Santiago',
    rates: { adults: 12000, children: 6000, infants: 0 },
    activeGroups: 0,
  })
})

it('expone errores HTTP y permite reintentar', async () => {
  server.use(
    http.get('*/api/camping', () => new HttpResponse(null, { status: 503 })),
  )
  const request = store.dispatch(api.endpoints.camping.initiate())
  await expect(request.unwrap()).rejects.toMatchObject({ status: 503 })
  server.resetHandlers()
  await expect(request.refetch().unwrap()).resolves.toMatchObject({
    id: 'la-izuelina',
  })
  request.unsubscribe()
})

it('cotiza y confirma el check-in de una reserva con el total aceptado', async () => {
  const reservationId = '00000000-0000-4000-8000-000000000101'
  const response = {
    id: reservationId,
    campingId: '00000000-0000-4000-8000-000000000102',
    stayId: null,
    accommodationTypeId: '00000000-0000-4000-8000-000000000103',
    unitId: null,
    checkInDate: '2026-10-23',
    checkOutDate: '2026-10-25',
    responsibleName: 'Ana',
    email: null,
    phone: null,
    document: null,
    nationality: '',
    adults: 2,
    children: 0,
    infants: 0,
    status: 'confirmed',
    source: 'manual',
    notes: '',
    priceSnapshot: {
      basis: 'per_unit',
      currency: 'CLP',
      totalMinor: 30000,
      baseNightlyPriceMinor: 30000,
      nights: 1,
    },
    payments: [],
    account: { totalMinor: 30000, paidMinor: 0, balanceMinor: 30000 },
    version: 1,
    createdAt: '2026-10-22T12:00:00.000Z',
    updatedAt: '2026-10-22T12:00:00.000Z',
  }
  const quote = {
    priceSnapshot: { ...response.priceSnapshot, nights: 2, totalMinor: 60000 },
  }
  let acceptedTotalMinor = 0
  server.use(
    http.post(
      `*/api/reservations/${reservationId}/check-in/quote`,
      async ({ request }) => {
        const body = (await request.json()) as {
          version: number
          arrivalDate: string
        }
        expect(body).toEqual({ version: 1, arrivalDate: '2026-10-23' })
        return HttpResponse.json(quote)
      },
    ),
    http.post(
      `*/api/reservations/${reservationId}/check-in`,
      async ({ request }) => {
        const body = (await request.json()) as {
          acceptedTotalMinor: number
        }
        acceptedTotalMinor = body.acceptedTotalMinor
        return HttpResponse.json({
          ...response,
          status: 'checked_in',
          stayId: '00000000-0000-4000-8000-000000000104',
        })
      },
    ),
  )

  const priced = await store
    .dispatch(
      api.endpoints.reservationCheckInQuote.initiate({
        id: reservationId,
        version: 1,
        arrivalDate: '2026-10-23',
      }),
    )
    .unwrap()
  expect(priced.priceSnapshot.totalMinor).toBe(60000)
  const checkedIn = await store
    .dispatch(
      api.endpoints.reservationCheckIn.initiate({
        id: reservationId,
        version: 1,
        arrivalDate: '2026-10-23',
        acceptedTotalMinor: priced.priceSnapshot.totalMinor,
        hasVehicle: false,
        vehicleDescription: '',
        licensePlate: '',
        location: '',
      }),
    )
    .unwrap()
  expect(acceptedTotalMinor).toBe(60000)
  expect(checkedIn).toMatchObject({
    status: 'checked_in',
    stayId: expect.any(String),
  })
})

it('rechaza una respuesta que no cumple el contrato', async () => {
  server.use(
    http.get('*/api/camping', () => HttpResponse.json({ id: 1, name: null })),
  )
  const request = store.dispatch(api.endpoints.camping.initiate())
  await expect(request.unwrap()).rejects.toMatchObject({ name: 'ZodError' })
  request.unsubscribe()
})

it('registra ingreso, consulta detalle, cotiza y cierra con total persistido', async () => {
  const values = checkInSchema.parse({
    ...checkInDefaults(),
    responsibleName: 'Ana',
    adults: 2,
    children: 1,
    infants: 1,
  })
  const created = await store
    .dispatch(api.endpoints.createStay.initiate(values))
    .unwrap()
  expect(created.id).toMatch(/^demo-stay-/)
  const quote = await store
    .dispatch(
      api.endpoints.quote.initiate({
        id: created.id,
        departureDate: values.arrivalDate,
      }),
    )
    .unwrap()
  expect(quote).toMatchObject({
    nights: 1,
    accommodationMinor: 30000,
    extrasMinor: 0,
    totalMinor: 30000,
  })
  expect(quote.account).toMatchObject({
    totalMinor: 30000,
    paidMinor: 0,
    balanceMinor: 30000,
  })
  const payment = {
    amountMinor: 30000,
    method: 'cash' as const,
    paidOn: values.arrivalDate,
    note: '',
    idempotencyKey: '00000000-0000-4000-8000-000000000001',
  }
  const paid = await store
    .dispatch(
      api.endpoints.addPayment.initiate({ id: created.id, input: payment }),
    )
    .unwrap()
  expect(paid.account).toMatchObject({ paidMinor: 30000, balanceMinor: 0 })
  const closed = await store
    .dispatch(
      api.endpoints.closeStay.initiate({
        id: created.id,
        departureDate: values.arrivalDate,
        version: paid.version,
      }),
    )
    .unwrap()
  expect(closed.closure).toMatchObject({ totalMinor: 30000, nights: 1 })
})

it('registra pagos parciales una sola vez con la misma idempotencia', async () => {
  const values = checkInSchema.parse({
    ...checkInDefaults(),
    responsibleName: 'Ana',
  })
  const created = await store
    .dispatch(api.endpoints.createStay.initiate(values))
    .unwrap()
  const input = {
    amountMinor: 10000,
    method: 'transfer' as const,
    paidOn: values.arrivalDate,
    note: 'Seña',
    idempotencyKey: '00000000-0000-4000-8000-000000000002',
  }
  const first = await store
    .dispatch(api.endpoints.addPayment.initiate({ id: created.id, input }))
    .unwrap()
  const duplicate = await store
    .dispatch(api.endpoints.addPayment.initiate({ id: created.id, input }))
    .unwrap()
  expect(first.payments).toHaveLength(1)
  expect(duplicate.payments).toHaveLength(1)
  expect(duplicate.account).toMatchObject({
    paidMinor: 10000,
    balanceMinor: 2000,
  })
})

it('cierra de forma atómica con el pago exacto y bloquea el saldo a favor', async () => {
  const values = checkInSchema.parse({
    ...checkInDefaults(),
    responsibleName: 'Ana',
  })
  const created = await store
    .dispatch(api.endpoints.createStay.initiate(values))
    .unwrap()
  const detail = await store
    .dispatch(api.endpoints.stay.initiate(created.id))
    .unwrap()
  const quote = await store
    .dispatch(
      api.endpoints.quote.initiate({
        id: created.id,
        departureDate: values.arrivalDate,
      }),
    )
    .unwrap()
  const closed = await store
    .dispatch(
      api.endpoints.closeStay.initiate({
        id: created.id,
        departureDate: values.arrivalDate,
        version: detail.version,
        payment: {
          amountMinor: quote.account.balanceMinor,
          method: 'card',
          paidOn: values.arrivalDate,
          note: '',
          idempotencyKey: '00000000-0000-4000-8000-000000000003',
        },
      }),
    )
    .unwrap()
  expect(closed.closure).not.toBeNull()
  expect(closed.account.balanceMinor).toBe(0)

  const creditValues = checkInSchema.parse({
    ...checkInDefaults(),
    responsibleName: 'Beto',
  })
  const creditCreated = await store
    .dispatch(api.endpoints.createStay.initiate(creditValues))
    .unwrap()
  await store
    .dispatch(
      api.endpoints.addPayment.initiate({
        id: creditCreated.id,
        input: {
          amountMinor: 40000,
          method: 'cash',
          paidOn: creditValues.arrivalDate,
          note: '',
          idempotencyKey: '00000000-0000-4000-8000-000000000004',
        },
      }),
    )
    .unwrap()
  const creditDetail = await store
    .dispatch(api.endpoints.stay.initiate(creditCreated.id))
    .unwrap()
  await expect(
    store
      .dispatch(
        api.endpoints.closeStay.initiate({
          id: creditCreated.id,
          departureDate: creditValues.arrivalDate,
          version: creditDetail.version,
        }),
      )
      .unwrap(),
  ).rejects.toMatchObject({ status: 409 })
})

it('conserva ocupación tras fallo al guardar y permite reintentar', async () => {
  const values = checkInSchema.parse({
    ...checkInDefaults(),
    responsibleName: 'Ana',
  })
  server.use(
    http.post('*/api/stays', () => new HttpResponse(null, { status: 503 })),
  )
  await expect(
    store.dispatch(api.endpoints.createStay.initiate(values)).unwrap(),
  ).rejects.toMatchObject({ status: 503 })
  server.resetHandlers()
  await store.dispatch(api.endpoints.createStay.initiate(values)).unwrap()
  await expect(
    store.dispatch(api.endpoints.camping.initiate()).unwrap(),
  ).resolves.toMatchObject({
    activeGroups: 1,
    activePeople: 1,
    activeVehicles: 1,
  })
})

it('agrega un extra de plantilla, conserva categoría y permite editarlo y eliminarlo', async () => {
  const values = checkInSchema.parse({
    ...checkInDefaults(),
    responsibleName: 'Ana',
  })
  const created = await store
    .dispatch(api.endpoints.createStay.initiate(values))
    .unwrap()
  const templates = await store
    .dispatch(api.endpoints.extraTemplates.initiate())
    .unwrap()
  expect(templates).toHaveLength(22)
  const withExtra = await store
    .dispatch(
      api.endpoints.addExtra.initiate({
        id: created.id,
        input: { templateId: templates[0].id, quantity: 2 },
      }),
    )
    .unwrap()
  expect(withExtra.extras[0]).toMatchObject({
    category: templates[0].category,
    unitPriceMinor: templates[0].unitPriceMinor,
    quantity: 2,
    templateId: templates[0].id,
  })
  const extra = withExtra.extras[0]
  const edited = await store
    .dispatch(
      api.endpoints.updateExtra.initiate({
        stayId: created.id,
        extraId: extra.id,
        input: {
          category: 'Otras cosas',
          description: 'Hielo editado',
          unitPriceMinor: 2000,
          quantity: 1,
        },
      }),
    )
    .unwrap()
  expect(edited.extras[0]).toMatchObject({
    category: 'Otras cosas',
    description: 'Hielo editado',
    unitPriceMinor: 2000,
  })
  await expect(
    store
      .dispatch(
        api.endpoints.deleteExtra.initiate({
          stayId: created.id,
          extraId: extra.id,
        }),
      )
      .unwrap(),
  ).resolves.toMatchObject({ extras: [] })
})

it('rechaza ingreso inválido sin alterar ocupación', async () => {
  await expect(
    store
      .dispatch(
        api.endpoints.createStay.initiate({
          ...checkInDefaults(),
          responsibleName: '',
        }),
      )
      .unwrap(),
  ).rejects.toMatchObject({ status: 400 })
  await expect(
    store.dispatch(api.endpoints.camping.initiate()).unwrap(),
  ).resolves.toMatchObject({ activeGroups: 0 })
})

it('acumula páginas de estadías, reintenta y separa filtros y estados', async () => {
  const requests: string[] = []
  let failNextPage = true
  server.use(
    http.get('*/api/stays', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page'))
      requests.push(
        `${url.searchParams.get('status')}/${url.searchParams.get('accommodation')}/${page}`,
      )
      if (page === 2 && failNextPage) {
        failNextPage = false
        return new HttpResponse(null, { status: 503 })
      }
      return HttpResponse.json({ items: [], total: 9, page, pageSize: 8 })
    }),
  )
  const arg = { status: 'active', accommodation: 'camping' } as const
  const first = store.dispatch(api.endpoints.infiniteStays.initiate(arg))
  expect((await first.unwrap()).pageParams).toEqual([1])
  const next = () =>
    store.dispatch(
      api.endpoints.infiniteStays.initiate(arg, { direction: 'forward' }),
    )
  await expect(next().unwrap()).rejects.toMatchObject({ status: 503 })
  expect(
    api.endpoints.infiniteStays.select(arg)(store.getState()).data?.pageParams,
  ).toEqual([1])
  expect((await next().unwrap()).pageParams).toEqual([1, 2])
  await next().unwrap()
  await store
    .dispatch(
      api.endpoints.infiniteStays.initiate({
        status: 'active',
        accommodation: 'individual',
      }),
    )
    .unwrap()
  await store
    .dispatch(
      api.endpoints.infiniteStays.initiate({
        status: 'closed',
        accommodation: 'camping',
      }),
    )
    .unwrap()
  expect(requests).toEqual([
    'active/camping/1',
    'active/camping/2',
    'active/camping/2',
    'active/individual/1',
    'closed/camping/1',
  ])
  first.unsubscribe()
})
