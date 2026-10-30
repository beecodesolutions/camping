const { test } = require('node:test')
const assert = require('node:assert/strict')
const { z } = require('zod')
const c = require('../dist')

const typeId = 'be573584-ebcc-4a49-8f7e-664485f92565'
const unitId = '7c2c7f11-1aa4-4f1e-a58d-7e2fbcbb3a44'

test('availability query validates strict exclusive date ranges', () => {
  assert.equal(
    c.availabilityQuerySchema.safeParse({
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-04',
    }).success,
    true,
  )
  assert.equal(
    c.availabilityQuerySchema.safeParse({
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-01',
      typeId,
    }).success,
    false,
  )
  assert.equal(
    c.availabilityQuerySchema.safeParse({
      checkInDate: '2026-10-04',
      checkOutDate: '2026-10-01',
    }).success,
    false,
  )
  assert.equal(
    c.availabilityQuerySchema.safeParse({
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-01',
      campingId: typeId,
    }).success,
    false,
  )
  assert.equal(
    c.availabilityQuerySchema.safeParse({
      checkInDate: '2026-10-01',
      checkOutDate: '2027-10-03',
    }).success,
    false,
  )
  assert.equal(
    c.availabilityQuerySchema.safeParse({
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-01T00:00:00Z',
    }).success,
    false,
  )
})

test('availability range uses calendar nights across leap years and DST dates', () => {
  assert.equal(
    c.availabilityQuerySchema.safeParse({
      checkInDate: '2024-01-01',
      checkOutDate: '2025-01-01',
    }).success,
    true,
  )
  assert.equal(
    c.availabilityQuerySchema.safeParse({
      checkInDate: '2024-10-26',
      checkOutDate: '2024-10-28',
    }).success,
    true,
  )
  assert.equal(
    c.availabilityQuerySchema.safeParse({
      checkInDate: '2024-01-01',
      checkOutDate: '2025-01-02',
    }).success,
    false,
  )
})

test('worker list queries keep filters strict and block dates paired', () => {
  assert.equal(c.accommodationTypeListQuerySchema.safeParse({}).success, true)
  assert.equal(
    c.accommodationTypeListQuerySchema.safeParse({ enabled: 'true' }).success,
    false,
  )
  assert.equal(
    c.accommodationUnitListQuerySchema.safeParse({ typeId }).success,
    true,
  )
  assert.equal(
    c.accommodationUnitListQuerySchema.safeParse({ typeId: 'not-a-uuid' })
      .success,
    false,
  )
  assert.equal(c.reservationBlockListQuerySchema.safeParse({}).success, true)
  assert.equal(
    c.reservationBlockListQuerySchema.safeParse({
      typeId,
      unitId,
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-03',
    }).success,
    true,
  )
  assert.equal(
    c.reservationBlockListQuerySchema.safeParse({
      checkInDate: '2026-10-01',
    }).success,
    false,
  )
  assert.equal(
    c.reservationBlockListQuerySchema.safeParse({
      checkInDate: '2026-10-03',
      checkOutDate: '2026-10-01',
    }).success,
    false,
  )
})

test('availability response discriminates individual and unlimited inventory', () => {
  const individual = {
    typeId,
    inventoryMode: 'individual',
    nights: [
      {
        date: '2026-10-01',
        totalUnits: 3,
        reservedUnits: 1,
        blockedUnits: 1,
        availableUnits: 1,
      },
    ],
    availableUnitIds: [unitId],
  }
  const unlimited = {
    typeId,
    inventoryMode: 'unlimited',
    nights: [
      {
        date: '2026-10-01',
        reservations: 2,
        adults: 3,
        children: 1,
        infants: 0,
      },
    ],
  }
  assert.equal(
    c.availabilityResponseSchema.safeParse({
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-02',
      types: [individual, unlimited],
    }).success,
    true,
  )
  assert.equal(
    c.availabilityResponseSchema.safeParse({
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-02',
      types: [
        {
          ...unlimited,
          totalUnits: 0,
        },
      ],
    }).success,
    false,
  )
  assert.equal(
    c.availabilityResponseSchema.safeParse({
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-02',
      types: [
        {
          ...individual,
          availableUnitIds: [unitId],
          reservations: 1,
        },
      ],
    }).success,
    false,
  )
})

test('availability OpenAPI schemas are generated with strict shapes', () => {
  const query = z.toJSONSchema(c.availabilityOpenApiSchemas.availabilityQuery, {
    target: 'openapi-3.0',
    io: 'input',
  })
  const response = z.toJSONSchema(
    c.availabilityOpenApiSchemas.availabilityResponse,
    { target: 'openapi-3.0', io: 'output' },
  )
  assert.equal(query.type, 'object')
  assert.equal(query.additionalProperties, false)
  assert.deepEqual(query.required.sort(), ['checkInDate', 'checkOutDate'])
  assert.equal(response.type, 'object')
  assert.equal(response.additionalProperties, false)
  assert.deepEqual(response.required.sort(), [
    'checkInDate',
    'checkOutDate',
    'types',
  ])
})
