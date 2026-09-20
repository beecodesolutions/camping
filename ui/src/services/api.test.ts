import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createAppStore } from '../app/store'
import { handlers } from '../mocks/handlers'
import { api } from './api'

const server = setupServer(...handlers)
let store = createAppStore()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
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
