const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createOfflineOpenApiDocument } = require('../dist/openapi/document')
const { openApiEnabled } = require('../dist/main')

const expectedRoutes = [
  'POST /api/auth/login',
  'GET /api/auth/session',
  'POST /api/auth/logout',
  'GET /api/camping',
  'PATCH /api/camping/rates',
  'POST /api/stays',
  'GET /api/stays',
  'GET /api/stays/{id}',
  'POST /api/stays/{id}/quote',
  'POST /api/stays/{id}/payments',
  'POST /api/stays/{id}/close',
  'GET /api/extra-templates',
  'POST /api/extra-templates',
  'PATCH /api/extra-templates/{id}',
  'POST /api/stays/{id}/extras',
  'PATCH /api/stays/{id}/extras/{extraId}',
  'DELETE /api/stays/{id}/extras/{extraId}',
]

function operations(document) {
  return Object.entries(document.paths).flatMap(([path, item]) =>
    Object.entries(item)
      .filter(([method]) => ['get', 'post', 'patch', 'delete'].includes(method))
      .map(([method, operation]) => ({
        key: `${method.toUpperCase()} ${path}`,
        operation,
      })),
  )
}

test('offline OpenAPI document describes only implemented pilot routes', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL
  delete process.env.DATABASE_URL
  try {
    const document = await createOfflineOpenApiDocument()
    const routeKeys = operations(document)
      .map(({ key }) => key)
      .sort()
    assert.deepEqual(routeKeys, [...expectedRoutes].sort())

    const ops = operations(document)
    const operationIds = ops.map(({ operation }) => operation.operationId)
    assert.equal(new Set(operationIds).size, operationIds.length)
    assert.ok(operationIds.every(Boolean))

    const stayList = document.paths['/api/stays'].get
    assert.equal(
      stayList.responses[200].content['application/json'].schema.$ref,
      '#/components/schemas/StayPage',
    )
    assert.deepEqual(
      stayList.parameters.map((parameter) => parameter.name).sort(),
      ['page', 'pageSize', 'status'],
    )
    assert.equal(
      stayList.parameters.find((parameter) => parameter.name === 'pageSize')
        .schema.maximum,
      undefined,
    )
    assert.ok(document.paths['/api/stays/{id}'].get.responses[400])
    assert.ok(
      document.paths['/api/stays/{id}/extras/{extraId}'].delete.responses[400],
    )
    assert.equal(document.paths['/api/stays/{id}'].get.parameters[0].name, 'id')
    assert.equal(
      document.paths['/api/extra-templates'].get.responses[200].content[
        'application/json'
      ].schema.type,
      'array',
    )

    const protectedOperation = document.paths['/api/camping'].get
    assert.deepEqual(protectedOperation.security, [{ camping_session: [] }])
    assert.equal(document.paths['/api/auth/login'].post.security, undefined)
    assert.equal(
      document.components.securitySchemes.camping_session.type,
      'apiKey',
    )
    assert.equal(
      document.components.securitySchemes.camping_session.in,
      'cookie',
    )
    assert.ok(document.components.schemas.Reservation)
    assert.ok(document.components.schemas.ReservationPayment)
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDatabaseUrl
  }
})

test('production OpenAPI exposure is opt-in', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousOpenApiEnabled = process.env.OPENAPI_ENABLED
  try {
    process.env.NODE_ENV = 'production'
    delete process.env.OPENAPI_ENABLED
    assert.equal(openApiEnabled(), false)
    process.env.OPENAPI_ENABLED = 'true'
    assert.equal(openApiEnabled(), true)
    process.env.NODE_ENV = 'development'
    delete process.env.OPENAPI_ENABLED
    assert.equal(openApiEnabled(), true)
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousOpenApiEnabled === undefined) delete process.env.OPENAPI_ENABLED
    else process.env.OPENAPI_ENABLED = previousOpenApiEnabled
  }
})
