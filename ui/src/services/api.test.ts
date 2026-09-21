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

it('consulta por HTTP el camping simulado y conserva la respuesta en caché', async () => {
  const request = store.dispatch(api.endpoints.camping.initiate())
  await expect(request.unwrap()).resolves.toEqual({
    id: 'demo',
    name: 'Camping La Izuelina',
    currency: 'CLP',
    activeGroups: 8,
    activePeople: 21,
    activeVehicles: 6,
    pendingAmountMinor: 485000,
  })
  expect(api.endpoints.camping.select()(store.getState()).isSuccess).toBe(true)
  request.unsubscribe()
})

it('expone errores HTTP y permite reintentar después', async () => {
  server.use(
    http.get('*/api/camping', () => new HttpResponse(null, { status: 503 })),
  )
  const request = store.dispatch(api.endpoints.camping.initiate())
  await expect(request.unwrap()).rejects.toMatchObject({ status: 503 })
  server.resetHandlers()
  await expect(request.refetch().unwrap()).resolves.toMatchObject({
    id: 'demo',
  })
  request.unsubscribe()
})

it('rechaza una respuesta que no cumple el contrato', async () => {
  server.use(
    http.get('*/api/camping', () => HttpResponse.json({ id: 1, name: null })),
  )
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const request = store.dispatch(api.endpoints.camping.initiate())
  await expect(request.unwrap()).rejects.toMatchObject({
    message: 'Respuesta de camping inválida',
  })
  expect(log).toHaveBeenCalled()
  request.unsubscribe()
})

it('registra ingreso simulado e invalida ocupación sin inventar cargos', async () => {
  const camping = store.dispatch(api.endpoints.camping.initiate())
  await camping.unwrap()
  await store
    .dispatch(
      api.endpoints.createStay.initiate({
        ...checkInSchema.parse({
          ...checkInDefaults(),
          responsibleName: 'Ana',
          nationality: 'AR',
          phoneCountry: 'CL',
          phone: '9 1234 5678',
        }),
        adults: 2,
        children: 1,
        infants: 1,
        hasVehicle: true,
      }),
    )
    .unwrap()
  await vi.waitFor(() => {
    expect(api.endpoints.camping.select()(store.getState()).data).toMatchObject(
      {
        activeGroups: 9,
        activePeople: 25,
        activeVehicles: 7,
        pendingAmountMinor: 485000,
      },
    )
  })
  camping.unsubscribe()
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
  const camping = store.dispatch(api.endpoints.camping.initiate())
  await expect(camping.unwrap()).resolves.toMatchObject({
    activeGroups: 9,
    activePeople: 22,
    activeVehicles: 7,
  })
  camping.unsubscribe()
})

it('rechaza ingreso inválido también en transporte simulado', async () => {
  await expect(
    store
      .dispatch(
        api.endpoints.createStay.initiate({
          ...checkInDefaults(),
        }),
      )
      .unwrap(),
  ).rejects.toMatchObject({ status: 400 })
  const camping = store.dispatch(api.endpoints.camping.initiate())
  await expect(camping.unwrap()).resolves.toMatchObject({ activeGroups: 8 })
  camping.unsubscribe()
})
