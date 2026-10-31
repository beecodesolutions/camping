const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const { randomUUID } = require('node:crypto')
const argon2 = require('argon2')
const { Client } = require('pg')

process.env.NODE_ENV = 'test'
process.env.DB_SCHEMA = 'camping_private'
process.env.DB_HOST ??= 'localhost'
process.env.DB_PORT ??= '15434'
process.env.DB_USER ??= 'camping'
process.env.DB_PASSWORD ??= 'camping-local-only'
process.env.DB_NAME ??= 'camping_test'
process.env.DB_POOL_MAX = '2'
process.env.ALLOWED_ORIGIN = 'http://localhost:5173'
process.env.REQUIRE_ORIGIN = 'true'

const { createDataSource } = require('../dist/database/data-source')
const { createNestApp } = require('../dist/main')

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'correct horse battery staple'
const ids = {
  camping: randomUUID(),
  foreignCamping: randomUUID(),
  user: randomUUID(),
  individual: randomUUID(),
  individualUnitA: randomUUID(),
  individualUnitB: randomUUID(),
  individualUnitDisabled: randomUUID(),
  disabledType: randomUUID(),
  disabledUnit: randomUUID(),
  unlimited: randomUUID(),
  foreignType: randomUUID(),
  alternating: randomUUID(),
  alternatingUnitA: randomUUID(),
  alternatingUnitB: randomUUID(),
}

const ownerUsername = `availability-owner-${ids.camping.slice(0, 8)}`

let dataSource
let app
let baseUrl
let cookie

function assertTestDatabase() {
  const database = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).pathname.slice(1)
    : process.env.DB_NAME
  assert.equal(database, 'camping_test')
}

async function request(path, options = {}) {
  const headers = { ...(options.cookie ? { cookie: options.cookie } : {}) }
  if (options.origin) headers.origin = options.origin
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  return { response, value: text ? JSON.parse(text) : null }
}

async function login() {
  const result = await request('/api/auth/login', {
    method: 'POST',
    origin: ORIGIN,
    body: { username: ownerUsername, password: PASSWORD },
  })
  assert.equal(result.response.status, 201)
  return result.response.headers.get('set-cookie').split(';', 1)[0]
}

function priceSnapshot() {
  return {
    basis: 'per_unit',
    currency: 'CLP',
    baseNightlyPriceMinor: 1000,
    nights: 3,
    totalMinor: 3000,
  }
}

async function insertReservation({
  typeId,
  unitId = null,
  checkInDate,
  checkOutDate,
  status = 'confirmed',
  adults = 1,
  children = 0,
  infants = 0,
}) {
  await dataSource.query(
    `INSERT INTO camping_private.reservations
      (id, camping_id, accommodation_type_id, unit_id, responsible_name,
       check_in_date, check_out_date, adults, children, infants, status,
       price_snapshot, idempotency_key)
     VALUES ($1, $2, $3, $4, 'Availability fixture', $5, $6, $7, $8, $9,
       $10, $11, $12)`,
    [
      randomUUID(),
      ids.camping,
      typeId,
      unitId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      infants,
      status,
      priceSnapshot(),
      randomUUID(),
    ],
  )
}

before(async () => {
  assertTestDatabase()
  const clientOptions = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
  const client = new Client(clientOptions)
  await client.connect()
  await client.query('CREATE SCHEMA IF NOT EXISTS camping_private')
  await client.end()
  dataSource = createDataSource()
  await dataSource.initialize()
  await dataSource.runMigrations()
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id })
  await dataSource.query(
    `INSERT INTO camping_private.campings
      (id, stable_key, name, country, currency, timezone, age_ranges, rates)
     VALUES ($1, $2, 'Availability test', 'CL', 'CLP', 'UTC', $5, $6),
       ($3, $4, 'Foreign availability test', 'CL', 'CLP', 'UTC', $5, $6)`,
    [
      ids.camping,
      `availability-${ids.camping}`,
      ids.foreignCamping,
      `availability-${ids.foreignCamping}`,
      {
        infants: { min: 0, max: 5 },
        children: { min: 6, max: 17 },
        adults: { min: 18, max: null },
      },
      { adults: 1000, children: 500, infants: 100 },
    ],
  )
  await dataSource.query(
    `INSERT INTO camping_private.users
      (id, camping_id, username, name, password_hash, enabled, password_changed_at)
     VALUES ($1, $2, $3, 'Availability owner', $4, true,
       CURRENT_TIMESTAMP)`,
    [ids.user, ids.camping, ownerUsername, passwordHash],
  )
  await dataSource.query(
    `INSERT INTO camping_private.accommodation_types
      (id, camping_id, name, inventory_mode, max_occupancy,
       base_nightly_price_minor, enabled)
     VALUES
       ($1, $2, 'Individual', 'individual', 4, 1000, true),
       ($3, $2, 'Disabled individual', 'individual', 4, 1000, false),
       ($4, $2, 'Unlimited', 'unlimited', NULL, 1000, true),
       ($5, $6, 'Foreign type', 'individual', 4, 1000, true),
       ($7, $2, 'Alternating', 'individual', 4, 1000, true)`,
    [
      ids.individual,
      ids.camping,
      ids.disabledType,
      ids.unlimited,
      ids.foreignType,
      ids.foreignCamping,
      ids.alternating,
    ],
  )
  await dataSource.query(
    `INSERT INTO camping_private.accommodation_units
      (id, camping_id, accommodation_type_id, name, enabled, max_occupancy)
     VALUES
       ($1, $2, $3, 'A', true, 4),
       ($4, $2, $3, 'B', true, 4),
       ($5, $2, $3, 'Disabled unit', false, 4),
       ($6, $2, $7, 'Disabled type unit', true, 4),
       ($8, $2, $9, 'Alternating A', true, 4),
       ($10, $2, $9, 'Alternating B', true, 4)`,
    [
      ids.individualUnitA,
      ids.camping,
      ids.individual,
      ids.individualUnitB,
      ids.individualUnitDisabled,
      ids.disabledUnit,
      ids.disabledType,
      ids.alternatingUnitA,
      ids.alternating,
      ids.alternatingUnitB,
    ],
  )
  await insertReservation({
    typeId: ids.individual,
    unitId: ids.individualUnitA,
    checkInDate: '2026-11-01',
    checkOutDate: '2026-11-03',
  })
  await insertReservation({
    typeId: ids.individual,
    unitId: ids.individualUnitA,
    checkInDate: '2026-11-02',
    checkOutDate: '2026-11-04',
  })
  await insertReservation({
    typeId: ids.individual,
    unitId: ids.individualUnitB,
    checkInDate: '2026-11-02',
    checkOutDate: '2026-11-03',
    status: 'cancelled',
  })
  await insertReservation({
    typeId: ids.individual,
    unitId: ids.individualUnitB,
    checkInDate: '2026-11-05',
    checkOutDate: '2026-11-06',
    status: 'checked_in',
  })
  await insertReservation({
    typeId: ids.unlimited,
    checkInDate: '2026-11-01',
    checkOutDate: '2026-11-03',
    adults: 2,
    children: 1,
  })
  await insertReservation({
    typeId: ids.alternating,
    unitId: ids.alternatingUnitA,
    checkInDate: '2027-01-01',
    checkOutDate: '2027-01-02',
  })
  await insertReservation({
    typeId: ids.alternating,
    unitId: ids.alternatingUnitB,
    checkInDate: '2027-01-02',
    checkOutDate: '2027-01-03',
  })
  await dataSource.query(
    `INSERT INTO camping_private.accommodation_blocks
      (id, camping_id, accommodation_type_id, unit_id,
       check_in_date, check_out_date, reason)
     VALUES ($1, $2, $3, $4, '2026-11-02', '2026-11-04', 'Fixture block')`,
    [randomUUID(), ids.camping, ids.individual, ids.individualUnitB],
  )
  app = await createNestApp()
  app.useLogger(false)
  await app.listen(0, '127.0.0.1')
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`
  cookie = await login()
})

after(async () => {
  if (app) await app.close()
  if (dataSource?.isInitialized) {
    const campingIds = [ids.camping, ids.foreignCamping]
    await dataSource.query(
      `DELETE FROM camping_private.payments WHERE camping_id = ANY($1::uuid[])`,
      [campingIds],
    )
    await dataSource.query(
      `DELETE FROM camping_private.applied_extras
       WHERE stay_id IN (SELECT id FROM camping_private.stays WHERE camping_id = ANY($1::uuid[]))`,
      [campingIds],
    )
    await dataSource.query(
      `DELETE FROM camping_private.stays WHERE camping_id = ANY($1::uuid[])`,
      [campingIds],
    )
    await dataSource.query(
      `DELETE FROM camping_private.reservations WHERE camping_id = ANY($1::uuid[])`,
      [campingIds],
    )
    await dataSource.query(
      `DELETE FROM camping_private.accommodation_blocks WHERE camping_id = ANY($1::uuid[])`,
      [campingIds],
    )
    await dataSource.query(
      `DELETE FROM camping_private.accommodation_units WHERE camping_id = ANY($1::uuid[])`,
      [campingIds],
    )
    await dataSource.query(
      `DELETE FROM camping_private.accommodation_types WHERE camping_id = ANY($1::uuid[])`,
      [campingIds],
    )
    await dataSource.query(
      `DELETE FROM camping_private.users WHERE camping_id = ANY($1::uuid[])`,
      [campingIds],
    )
    await dataSource.query(
      `DELETE FROM camping_private.campings WHERE id = ANY($1::uuid[])`,
      [campingIds],
    )
    await dataSource.destroy()
  }
})

test('availability reads individual and unlimited snapshots', async () => {
  const result = await request(
    '/api/availability?checkInDate=2026-11-01&checkOutDate=2026-11-04',
    { cookie },
  )
  assert.equal(result.response.status, 200, JSON.stringify(result.value))
  const individual = result.value.types.find(
    (type) => type.typeId === ids.individual,
  )
  assert.deepEqual(individual.nights, [
    {
      date: '2026-11-01',
      totalUnits: 2,
      reservedUnits: 1,
      blockedUnits: 0,
      availableUnits: 1,
    },
    {
      date: '2026-11-02',
      totalUnits: 2,
      reservedUnits: 1,
      blockedUnits: 1,
      availableUnits: 0,
    },
    {
      date: '2026-11-03',
      totalUnits: 2,
      reservedUnits: 1,
      blockedUnits: 1,
      availableUnits: 0,
    },
  ])
  assert.deepEqual(individual.availableUnitIds, [])
  const unlimited = result.value.types.find(
    (type) => type.typeId === ids.unlimited,
  )
  assert.deepEqual(unlimited.nights[0], {
    date: '2026-11-01',
    reservations: 1,
    adults: 2,
    children: 1,
    infants: 0,
  })
  assert.deepEqual(unlimited.nights[2], {
    date: '2026-11-03',
    reservations: 0,
    adults: 0,
    children: 0,
    infants: 0,
  })
})

test('disabled units and types remain visible without capacity', async () => {
  const result = await request(
    `/api/availability?checkInDate=2026-11-05&checkOutDate=2026-11-06&typeId=${ids.disabledType}`,
    { cookie },
  )
  assert.equal(result.response.status, 200, JSON.stringify(result.value))
  assert.deepEqual(result.value.types[0].nights[0], {
    date: '2026-11-05',
    totalUnits: 0,
    reservedUnits: 0,
    blockedUnits: 0,
    availableUnits: 0,
  })
  assert.deepEqual(result.value.types[0].availableUnitIds, [])
})

test('checked-in reservations consume their planned calendar range', async () => {
  const result = await request(
    '/api/availability?checkInDate=2026-11-05&checkOutDate=2026-11-06&typeId=' +
      ids.individual,
    { cookie },
  )
  assert.equal(result.response.status, 200, JSON.stringify(result.value))
  assert.deepEqual(result.value.types[0].nights[0], {
    date: '2026-11-05',
    totalUnits: 2,
    reservedUnits: 1,
    blockedUnits: 0,
    availableUnits: 1,
  })
})

test('nightly availability can be nonzero without one unit free for the range', async () => {
  const result = await request(
    `/api/availability?checkInDate=2027-01-01&checkOutDate=2027-01-03&typeId=${ids.alternating}`,
    { cookie },
  )
  assert.equal(result.response.status, 200, JSON.stringify(result.value))
  assert.deepEqual(result.value.types[0].nights, [
    {
      date: '2027-01-01',
      totalUnits: 2,
      reservedUnits: 1,
      blockedUnits: 0,
      availableUnits: 1,
    },
    {
      date: '2027-01-02',
      totalUnits: 2,
      reservedUnits: 1,
      blockedUnits: 0,
      availableUnits: 1,
    },
  ])
  assert.deepEqual(result.value.types[0].availableUnitIds, [])
})

test('full month responses enumerate calendar nights and half-open boundaries', async () => {
  const month = await request(
    `/api/availability?checkInDate=2027-02-01&checkOutDate=2027-03-01&typeId=${ids.individual}`,
    { cookie },
  )
  assert.equal(month.response.status, 200, JSON.stringify(month.value))
  assert.equal(month.value.types[0].nights.length, 28)

  const boundary = await request(
    `/api/availability?checkInDate=2026-11-04&checkOutDate=2026-11-05&typeId=${ids.individual}`,
    { cookie },
  )
  assert.equal(boundary.response.status, 200, JSON.stringify(boundary.value))
  assert.deepEqual(boundary.value.types[0].nights[0], {
    date: '2026-11-04',
    totalUnits: 2,
    reservedUnits: 0,
    blockedUnits: 0,
    availableUnits: 2,
  })
})

test('availability rejects malformed, overlong, foreign, and anonymous queries', async () => {
  for (const path of [
    '/api/availability?checkInDate=2026-11-04&checkOutDate=2026-11-04',
    '/api/availability?checkInDate=2026-02-30&checkOutDate=2026-03-01',
    '/api/availability?checkInDate=2026-01-01&checkOutDate=2027-01-03',
    `/api/availability?checkInDate=2026-11-01&checkOutDate=2026-11-02&typeId=${ids.foreignType}`,
  ]) {
    const result = await request(path, { cookie })
    assert.equal(result.response.status, path.includes('typeId=') ? 404 : 400)
  }
  const anonymous = await request(
    '/api/availability?checkInDate=2026-11-01&checkOutDate=2026-11-02',
  )
  assert.equal(anonymous.response.status, 401)
})
