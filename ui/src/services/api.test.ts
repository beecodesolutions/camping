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
