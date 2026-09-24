const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const { after, before, test } = require('node:test')
const argon2 = require('argon2')
const { Client } = require('pg')

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'correct horse battery staple'

process.env.NODE_ENV = 'test'
process.env.DB_SCHEMA = 'camping_private'
process.env.DB_HOST ??= 'localhost'
process.env.DB_PORT ??= '5434'
process.env.DB_USER ??= 'camping'
process.env.DB_PASSWORD ??= 'camping-local-only'
process.env.DB_NAME ??= 'camping_test'
process.env.DB_POOL_MAX = '2'
process.env.ALLOWED_ORIGIN = ORIGIN
process.env.REQUIRE_ORIGIN = 'true'

function assertTestDatabase() {
  const database = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).pathname.slice(1)
    : process.env.DB_NAME
  assert.equal(
    database,
    'camping_test',
    'Integration tests refuse to use any database except camping_test',
  )
}

assertTestDatabase()

const { createDataSource } = require('../dist/database/data-source')
const { createNestApp } = require('../dist/main')

const fixtures = {
  campingA: randomUUID(),
  campingB: randomUUID(),
  userA: randomUUID(),
  userB: randomUUID(),
  templateA: randomUUID(),
  templateB: randomUUID(),
}

const ageRanges = {
  infants: { min: 0, max: 5 },
  children: { min: 6, max: 17 },
  adults: { min: 18, max: null },
}
const ratesA = { adults: 1000, children: 500, infants: 100 }
const ratesB = { adults: 7000, children: 3500, infants: 0 }

let setupDataSource
let app
let baseUrl

function dateOffset(days) {
  const date = new Date()
  date.setUTCHours(12, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function cookieFrom(response) {
  const header = response.headers.get('set-cookie')
  assert.ok(header, 'login must set the session cookie')
  return header.split(';', 1)[0]
}

async function request(path, { cookie, method = 'GET', body, origin } = {}) {
  const headers = {}
  if (cookie) headers.cookie = cookie
  if (origin) headers.origin = origin
  if (body !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const value = text ? JSON.parse(text) : null
  return { response, value }
}

async function login(username) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    origin: ORIGIN,
    body: { username, password: PASSWORD },
  })
  assert.equal(result.response.status, 201)
  return cookieFrom(result.response)
}

function checkIn(overrides = {}) {
  return {
    responsibleName: 'Ada Lovelace',
    document: 'DOC-1',
    nationality: 'CL',
    phone: '+56912345678',
    arrivalDate: dateOffset(-2),
    estimatedDeparture: '',
    adults: 2,
    children: 1,
    infants: 0,
    hasVehicle: true,
    vehicleDescription: 'Camioneta',
    licensePlate: 'ABCD12',
    location: 'A-1',
    ...overrides,
  }
}

function payment(amountMinor, overrides = {}) {
  return {
    amountMinor,
    method: 'cash',
    paidOn: dateOffset(0),
    note: '',
    idempotencyKey: randomUUID(),
    ...overrides,
  }
}

async function startApp() {
  app = await createNestApp()
  app.useLogger(false)
  await app.listen(0, '127.0.0.1')
  const address = app.getHttpServer().address()
  baseUrl = `http://127.0.0.1:${address.port}`
}

before(async () => {
  const options = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
  const client = new Client(options)
  await client.connect()
  await client.query('CREATE SCHEMA IF NOT EXISTS camping_private')
  await client.end()

  setupDataSource = createDataSource()
  await setupDataSource.initialize()
  await setupDataSource.runMigrations()
  await setupDataSource.query(`
    TRUNCATE TABLE
      camping_private.payments,
      camping_private.applied_extras,
      camping_private.extra_templates,
      camping_private.sessions,
      camping_private.stays,
      camping_private.users,
      camping_private.campings
    RESTART IDENTITY CASCADE
  `)

  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id })
  await setupDataSource.query(
    `INSERT INTO camping_private.campings
      (id, stable_key, name, country, currency, timezone, age_ranges, rates)
     VALUES ($1, 'test-a', 'Camping A', 'CL', 'CLP', 'UTC', $2, $3),
            ($4, 'test-b', 'Camping B', 'CL', 'CLP', 'UTC', $2, $5)`,
    [fixtures.campingA, ageRanges, ratesA, fixtures.campingB, ratesB],
  )
  await setupDataSource.query(
    `INSERT INTO camping_private.users
      (id, camping_id, username, name, password_hash, enabled, password_changed_at)
     VALUES ($1, $2, 'owner-a', 'Owner A', $3, true, CURRENT_TIMESTAMP),
            ($4, $5, 'owner-b', 'Owner B', $3, true, CURRENT_TIMESTAMP)`,
    [
      fixtures.userA,
      fixtures.campingA,
      passwordHash,
      fixtures.userB,
      fixtures.campingB,
    ],
  )
  await setupDataSource.query(
    `INSERT INTO camping_private.extra_templates
      (id, camping_id, seed_key, description, category, unit_price_minor, enabled)
     VALUES ($1, $2, 'template-a', 'Hot shower', 'Services', 250, true),
            ($3, $4, 'template-b', 'Private extra', 'Other', 999, true)`,
    [
      fixtures.templateA,
      fixtures.campingA,
      fixtures.templateB,
      fixtures.campingB,
    ],
  )
  await startApp()
})

after(async () => {
  if (app) await app.close()
  if (setupDataSource?.isInitialized) await setupDataSource.destroy()
})

test('PostgreSQL API integration', async (t) => {
  let cookieA
  let cookieB
  let stayA
  let stayB
  let appliedTemplate
  let version

  await t.test('authentication and origin checks protect the API', async () => {
    const anonymous = await request('/api/camping')
    assert.equal(anonymous.response.status, 401)
    assert.equal(anonymous.value.code, 'UNAUTHORIZED')

    const missingOrigin = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'owner-a', password: PASSWORD },
    })
    assert.equal(missingOrigin.response.status, 403)
    assert.equal(missingOrigin.value.code, 'ORIGIN_REQUIRED')

    const wrongOrigin = await request('/api/auth/login', {
      method: 'POST',
      origin: 'https://attacker.invalid',
      body: { username: 'owner-a', password: PASSWORD },
    })
    assert.equal(wrongOrigin.response.status, 403)
    assert.equal(wrongOrigin.value.code, 'ORIGIN_NOT_ALLOWED')

    const malformedResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body: '{"username":',
    })
    assert.equal(malformedResponse.status, 400)
    assert.deepEqual(await malformedResponse.json(), {
      code: 'VALIDATION_ERROR',
      message: 'La solicitud no es válida',
    })

    const secretMarker = 'must-not-be-echoed'
    const oversizedResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'owner-a',
        password: secretMarker.repeat(10_000),
      }),
    })
    assert.equal(oversizedResponse.status, 413)
    const oversizedBody = await oversizedResponse.json()
    assert.deepEqual(oversizedBody, {
      code: 'INVALID_BODY',
      message: 'Cuerpo de solicitud inválido',
    })
    assert.equal(JSON.stringify(oversizedBody).includes(secretMarker), false)

    cookieA = await login('owner-a')
    cookieB = await login('owner-b')
    const session = await request('/api/auth/session', { cookie: cookieA })
    assert.equal(session.response.status, 200)
    assert.deepEqual(session.value, {
      id: fixtures.userA,
      username: 'owner-a',
      name: 'Owner A',
    })

    const expiredToken = 'expired-integration-session'
    await setupDataSource.query(
      `INSERT INTO camping_private.sessions (id, token_hash, user_id, expires_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP - INTERVAL '1 minute')`,
      [
        randomUUID(),
        createHash('sha256').update(expiredToken).digest('hex'),
        fixtures.userA,
      ],
    )
    const expired = await request('/api/auth/session', {
      cookie: `camping_session=${expiredToken}`,
    })
    assert.equal(expired.response.status, 401)

    const logout = await request('/api/auth/logout', {
      cookie: cookieB,
      method: 'POST',
      origin: ORIGIN,
    })
    assert.equal(logout.response.status, 201)
    const loggedOut = await request('/api/auth/session', { cookie: cookieB })
    assert.equal(loggedOut.response.status, 401)
    cookieB = await login('owner-b')
  })

  await t.test(
    'validation rejects tenant injection, invalid dates, counts, and UUIDs',
    async () => {
      const cases = [
        checkIn({ campingId: fixtures.campingB }),
        checkIn({ arrivalDate: '2026-02-30' }),
        checkIn({ estimatedDeparture: dateOffset(-3) }),
        checkIn({ adults: -1 }),
        checkIn({ adults: 1.5 }),
        checkIn({ adults: Number.MAX_SAFE_INTEGER, children: 1 }),
        checkIn({ adults: 9007199254740992 }),
      ]
      for (const body of cases) {
        const result = await request('/api/stays', {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body,
        })
        assert.equal(result.response.status, 400)
        assert.equal(result.value.code, 'VALIDATION_ERROR')
      }

      const malformed = await request('/api/stays/not-a-uuid', {
        cookie: cookieA,
      })
      assert.equal(malformed.response.status, 400)
    },
  )

  await t.test(
    'stays persist and occupancy is derived from active database rows',
    async () => {
      const createdA = await request('/api/stays', {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: checkIn(),
      })
      assert.equal(createdA.response.status, 201)
      stayA = createdA.value.id

      const createdB = await request('/api/stays', {
        cookie: cookieB,
        method: 'POST',
        origin: ORIGIN,
        body: checkIn({
          responsibleName: 'Other tenant',
          adults: 1,
          children: 0,
          hasVehicle: false,
        }),
      })
      assert.equal(createdB.response.status, 201)
      stayB = createdB.value.id

      const profile = await request('/api/camping', { cookie: cookieA })
      assert.equal(profile.response.status, 200)
      assert.equal(profile.value.activeGroups, 1)
      assert.equal(profile.value.activePeople, 3)
      assert.equal(profile.value.activeVehicles, 1)

      const listed = await request(
        '/api/stays?status=active&page=1&pageSize=10',
        { cookie: cookieA },
      )
      assert.equal(listed.response.status, 200)
      assert.equal(listed.value.total, 1)
      assert.equal(listed.value.items[0].id, stayA)

      await app.close()
      app = null
      await startApp()
      const persisted = await request(`/api/stays/${stayA}`, {
        cookie: cookieA,
      })
      assert.equal(persisted.response.status, 200)
      assert.equal(persisted.value.responsibleName, 'Ada Lovelace')
      assert.equal(persisted.value.version, 1)
      assert.deepEqual(persisted.value.payments, [])
      assert.deepEqual(persisted.value.account, {
        totalMinor: 5000,
        paidMinor: 0,
        balanceMinor: 5000,
        asOfDate: dateOffset(0),
      })
    },
  )

  await t.test(
    'camping identifiers cannot cross tenant boundaries',
    async () => {
      const hiddenStay = await request(`/api/stays/${stayB}`, {
        cookie: cookieA,
      })
      assert.equal(hiddenStay.response.status, 404)
      assert.equal(hiddenStay.value.code, 'NOT_FOUND')

      const hiddenTemplate = await request(
        `/api/extra-templates/${fixtures.templateB}`,
        {
          cookie: cookieA,
          method: 'PATCH',
          origin: ORIGIN,
          body: { unitPriceMinor: 1 },
        },
      )
      assert.equal(hiddenTemplate.response.status, 404)

      const hiddenExtraTarget = await request(`/api/stays/${stayB}/extras`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: {
          category: '',
          description: 'Injected',
          quantity: 1,
          unitPriceMinor: 1,
        },
      })
      assert.equal(hiddenExtraTarget.response.status, 404)

      const addedByOtherTenant = await request(`/api/stays/${stayB}/extras`, {
        cookie: cookieB,
        method: 'POST',
        origin: ORIGIN,
        body: {
          category: 'Private',
          description: 'Other tenant extra',
          quantity: 1,
          unitPriceMinor: 50,
        },
      })
      assert.equal(addedByOtherTenant.response.status, 201)
      const foreignExtraId = addedByOtherTenant.value.extras[0].id

      const hiddenExtra = await request(
        `/api/stays/${stayA}/extras/${foreignExtraId}`,
        {
          cookie: cookieA,
          method: 'PATCH',
          origin: ORIGIN,
          body: {
            category: 'Private',
            description: 'Other tenant extra',
            quantity: 2,
            unitPriceMinor: 50,
          },
        },
      )
      assert.equal(hiddenExtra.response.status, 404)

      const hiddenClose = await request(`/api/stays/${stayB}/close`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: { departureDate: dateOffset(0), version: 2 },
      })
      assert.equal(hiddenClose.response.status, 404)
    },
  )

  await t.test(
    'failed login lockout persists after five attempts',
    async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const failed = await request('/api/auth/login', {
          method: 'POST',
          origin: ORIGIN,
          body: { username: 'owner-b', password: 'wrong-password' },
        })
        assert.equal(failed.response.status, 401)
      }

      const blocked = await request('/api/auth/login', {
        method: 'POST',
        origin: ORIGIN,
        body: { username: 'owner-b', password: PASSWORD },
      })
      assert.equal(blocked.response.status, 401)
      const [persisted] = await setupDataSource.query(
        `SELECT failed_login_count, login_blocked_until
       FROM camping_private.users WHERE id = $1`,
        [fixtures.userB],
      )
      assert.equal(persisted.failed_login_count, 0)
      assert.ok(persisted.login_blocked_until > new Date())
    },
  )

  await t.test(
    'template extras snapshot category and price while free extras remain editable',
    async () => {
      const addedTemplate = await request(`/api/stays/${stayA}/extras`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: { templateId: fixtures.templateA, quantity: 2 },
      })
      assert.equal(addedTemplate.response.status, 201)
      assert.equal(addedTemplate.value.version, 2)
      appliedTemplate = addedTemplate.value.extras[0]
      assert.deepEqual(
        {
          templateId: appliedTemplate.templateId,
          category: appliedTemplate.category,
          description: appliedTemplate.description,
          quantity: appliedTemplate.quantity,
          unitPriceMinor: appliedTemplate.unitPriceMinor,
        },
        {
          templateId: fixtures.templateA,
          category: 'Services',
          description: 'Hot shower',
          quantity: 2,
          unitPriceMinor: 250,
        },
      )

      const changedTemplate = await request(
        `/api/extra-templates/${fixtures.templateA}`,
        {
          cookie: cookieA,
          method: 'PATCH',
          origin: ORIGIN,
          body: {
            category: 'Changed',
            description: 'Changed later',
            unitPriceMinor: 900,
          },
        },
      )
      assert.equal(changedTemplate.response.status, 200)

      const snapshotted = await request(`/api/stays/${stayA}`, {
        cookie: cookieA,
      })
      assert.equal(snapshotted.value.extras[0].category, 'Services')
      assert.equal(snapshotted.value.extras[0].description, 'Hot shower')
      assert.equal(snapshotted.value.extras[0].unitPriceMinor, 250)

      const disabled = await request(
        `/api/extra-templates/${fixtures.templateA}`,
        {
          cookie: cookieA,
          method: 'PATCH',
          origin: ORIGIN,
          body: { enabled: false },
        },
      )
      assert.equal(disabled.response.status, 200)
      const rejectedDisabled = await request(`/api/stays/${stayA}/extras`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: { templateId: fixtures.templateA, quantity: 1 },
      })
      assert.equal(rejectedDisabled.response.status, 404)

      const addedFree = await request(`/api/stays/${stayA}/extras`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: {
          category: 'Custom',
          description: 'Firewood',
          quantity: 2,
          unitPriceMinor: 300,
        },
      })
      assert.equal(addedFree.response.status, 201)
      assert.equal(addedFree.value.version, 3)
      const free = addedFree.value.extras.find(
        (extra) => extra.templateId === null,
      )

      const updatedFree = await request(
        `/api/stays/${stayA}/extras/${free.id}`,
        {
          cookie: cookieA,
          method: 'PATCH',
          origin: ORIGIN,
          body: {
            category: 'Wood',
            description: 'Dry firewood',
            quantity: 3,
            unitPriceMinor: 400,
          },
        },
      )
      assert.equal(updatedFree.response.status, 200)
      assert.equal(updatedFree.value.version, 4)
      assert.equal(
        updatedFree.value.extras.find((extra) => extra.id === free.id).category,
        'Wood',
      )

      const removedFree = await request(
        `/api/stays/${stayA}/extras/${free.id}`,
        {
          cookie: cookieA,
          method: 'DELETE',
          origin: ORIGIN,
        },
      )
      assert.equal(removedFree.response.status, 200)
      assert.equal(removedFree.value.version, 5)
      assert.equal(
        removedFree.value.extras.some((extra) => extra.id === free.id),
        false,
      )
      version = removedFree.value.version
    },
  )

  await t.test(
    'payments validate input, isolate tenants, and append idempotently',
    async () => {
      for (const body of [
        payment(0),
        payment(9_007_199_254_740_992),
        payment(100, { method: 'crypto' }),
        payment(100, { idempotencyKey: 'not-a-uuid' }),
      ]) {
        const invalid = await request(`/api/stays/${stayA}/payments`, {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body,
        })
        assert.equal(invalid.response.status, 400)
        assert.equal(invalid.value.code, 'VALIDATION_ERROR')
      }

      const future = await request(`/api/stays/${stayA}/payments`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: payment(100, { paidOn: dateOffset(1) }),
      })
      assert.equal(future.response.status, 400)
      assert.equal(future.value.code, 'FUTURE_PAYMENT_DATE')

      const hidden = await request(`/api/stays/${stayB}/payments`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: payment(100),
      })
      assert.equal(hidden.response.status, 404)
      assert.equal(hidden.value.code, 'NOT_FOUND')

      const key = randomUUID()
      const firstBody = payment(1000, {
        method: 'cash',
        note: 'First installment',
        idempotencyKey: key,
      })
      const first = await request(`/api/stays/${stayA}/payments`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: firstBody,
      })
      assert.equal(first.response.status, 201)
      assert.equal(first.value.version, version + 1)
      assert.equal(first.value.payments.length, 1)
      assert.deepEqual(first.value.account, {
        totalMinor: 5500,
        paidMinor: 1000,
        balanceMinor: 4500,
        asOfDate: dateOffset(0),
      })
      assert.equal(first.value.payments[0].recordedBy, fixtures.userA)
      version = first.value.version

      const replay = await request(`/api/stays/${stayA}/payments`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: firstBody,
      })
      assert.equal(replay.response.status, 201)
      assert.equal(replay.value.version, version)
      assert.equal(replay.value.payments.length, 1)
      assert.equal(replay.value.payments[0].id, first.value.payments[0].id)

      const changedPayload = await request(`/api/stays/${stayA}/payments`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: { ...firstBody, amountMinor: 1001 },
      })
      assert.equal(changedPayload.response.status, 409)
      assert.equal(changedPayload.value.code, 'IDEMPOTENCY_CONFLICT')

      const otherCamping = await request(`/api/stays/${stayB}/payments`, {
        cookie: cookieB,
        method: 'POST',
        origin: ORIGIN,
        body: firstBody,
      })
      assert.equal(otherCamping.response.status, 201)
      assert.equal(otherCamping.value.payments.length, 1)

      const created = await request('/api/stays', {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: checkIn({
          responsibleName: 'Idempotency target',
          adults: 1,
          children: 0,
          hasVehicle: false,
        }),
      })
      assert.equal(created.response.status, 201)

      const changedStay = await request(
        `/api/stays/${created.value.id}/payments`,
        {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: firstBody,
        },
      )
      assert.equal(changedStay.response.status, 409)
      assert.equal(changedStay.value.code, 'IDEMPOTENCY_CONFLICT')

      const closeBody = {
        departureDate: dateOffset(0),
        version: 1,
        payment: payment(2000, { method: 'transfer' }),
      }
      const closed = await request(`/api/stays/${created.value.id}/close`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: closeBody,
      })
      assert.equal(closed.response.status, 201)
      assert.equal(closed.value.account.balanceMinor, 0)
      assert.equal(closed.value.payments[0].method, 'transfer')

      const profile = await request('/api/camping', { cookie: cookieA })
      assert.equal(profile.response.status, 200)
      assert.equal(profile.value.pendingAmountMinor, 4500)
    },
  )

  await t.test('rate changes affect only future stays', async () => {
    const futureRates = { adults: 2000, children: 750, infants: 50 }
    const updated = await request('/api/camping/rates', {
      cookie: cookieA,
      method: 'PATCH',
      origin: ORIGIN,
      body: futureRates,
    })
    assert.equal(updated.response.status, 200)
    assert.deepEqual(updated.value.rates, futureRates)

    const existing = await request(`/api/stays/${stayA}`, { cookie: cookieA })
    assert.deepEqual(existing.value.rates, ratesA)

    const created = await request('/api/stays', {
      cookie: cookieA,
      method: 'POST',
      origin: ORIGIN,
      body: checkIn({
        responsibleName: 'New rates guest',
        adults: 1,
        children: 0,
        hasVehicle: false,
      }),
    })
    assert.equal(created.response.status, 201)
    const futureStay = await request(`/api/stays/${created.value.id}`, {
      cookie: cookieA,
    })
    assert.deepEqual(futureStay.value.rates, futureRates)

    const closed = await request(`/api/stays/${created.value.id}/close`, {
      cookie: cookieA,
      method: 'POST',
      origin: ORIGIN,
      body: {
        departureDate: dateOffset(0),
        version: 1,
        payment: payment(4000, { method: 'card' }),
      },
    })
    assert.equal(closed.response.status, 201)
    assert.equal(closed.value.closure.accommodationMinor, 4000)
    assert.equal(closed.value.account.balanceMinor, 0)
    assert.equal(closed.value.payments[0].method, 'card')
  })

  await t.test(
    'quotes use integer minor units and charge at least one night',
    async () => {
      const oneNight = await request(`/api/stays/${stayA}/quote`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: { departureDate: dateOffset(-2) },
      })
      assert.equal(oneNight.response.status, 201)
      assert.deepEqual(oneNight.value, {
        departureDate: dateOffset(-2),
        nights: 1,
        accommodationMinor: 2500,
        extrasMinor: 500,
        totalMinor: 3000,
        version,
        account: {
          totalMinor: 3000,
          paidMinor: 1000,
          balanceMinor: 2000,
          asOfDate: dateOffset(-2),
        },
      })
      for (const key of ['accommodationMinor', 'extrasMinor', 'totalMinor']) {
        assert.equal(Number.isSafeInteger(oneNight.value[key]), true)
      }

      const twoNights = await request(`/api/stays/${stayA}/quote`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: { departureDate: dateOffset(0) },
      })
      assert.equal(twoNights.value.nights, 2)
      assert.equal(twoNights.value.accommodationMinor, 5000)
      assert.equal(twoNights.value.totalMinor, 5500)
      assert.deepEqual(twoNights.value.account, {
        totalMinor: 5500,
        paidMinor: 1000,
        balanceMinor: 4500,
        asOfDate: dateOffset(0),
      })
    },
  )

  await t.test(
    'closing is versioned, idempotent, persisted, and immutable',
    async () => {
      const stale = await request(`/api/stays/${stayA}/close`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: { departureDate: dateOffset(0), version: version - 1 },
      })
      assert.equal(stale.response.status, 409)
      assert.equal(stale.value.code, 'STALE_STAY')

      const unpaid = await request(`/api/stays/${stayA}/close`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: { departureDate: dateOffset(0), version },
      })
      assert.equal(unpaid.response.status, 409)
      assert.equal(unpaid.value.code, 'BALANCE_NOT_ZERO')

      const closeBody = {
        departureDate: dateOffset(0),
        version,
        payment: payment(4500, { method: 'transfer', note: 'Final payment' }),
      }
      const closed = await request(`/api/stays/${stayA}/close`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: closeBody,
      })
      assert.equal(closed.response.status, 201)
      assert.equal(closed.value.closure.totalMinor, 5500)
      assert.equal(closed.value.account.balanceMinor, 0)
      assert.equal(closed.value.payments.length, 2)
      const closedAt = closed.value.closure.closedAt

      const repeated = await request(`/api/stays/${stayA}/close`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: closeBody,
      })
      assert.equal(repeated.response.status, 201)
      assert.equal(repeated.value.closure.closedAt, closedAt)
      assert.equal(repeated.value.payments.length, 2)

      const differentDate = await request(`/api/stays/${stayA}/close`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: { departureDate: dateOffset(-1), version },
      })
      assert.equal(differentDate.response.status, 409)
      assert.equal(differentDate.value.code, 'STAY_CLOSED')

      for (const operation of [
        request(`/api/stays/${stayA}/extras`, {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: {
            category: '',
            description: 'Late extra',
            quantity: 1,
            unitPriceMinor: 1,
          },
        }),
        request(`/api/stays/${stayA}/extras/${appliedTemplate.id}`, {
          cookie: cookieA,
          method: 'PATCH',
          origin: ORIGIN,
          body: {
            category: 'Services',
            description: 'Hot shower',
            quantity: 3,
            unitPriceMinor: 250,
          },
        }),
        request(`/api/stays/${stayA}/extras/${appliedTemplate.id}`, {
          cookie: cookieA,
          method: 'DELETE',
          origin: ORIGIN,
        }),
      ]) {
        const result = await operation
        assert.equal(result.response.status, 409)
        assert.equal(result.value.code, 'STAY_CLOSED')
      }

      await app.close()
      app = null
      await startApp()
      const persisted = await request(`/api/stays/${stayA}`, {
        cookie: cookieA,
      })
      assert.equal(persisted.response.status, 200)
      assert.equal(persisted.value.closure.closedAt, closedAt)
      assert.equal(persisted.value.closure.totalMinor, 5500)
      assert.equal(persisted.value.account.balanceMinor, 0)
      assert.equal(persisted.value.payments.length, 2)

      const profile = await request('/api/camping', { cookie: cookieA })
      assert.equal(profile.value.activeGroups, 0)
      assert.equal(profile.value.activePeople, 0)
      assert.equal(profile.value.activeVehicles, 0)
    },
  )

  await t.test(
    'open-stay advances remain credits and do not offset other pending stays',
    async () => {
      const [creditStay, debtStay] = await Promise.all([
        request('/api/stays', {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: checkIn({
            responsibleName: 'Credit guest',
            adults: 1,
            children: 0,
            hasVehicle: false,
          }),
        }),
        request('/api/stays', {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: checkIn({
            responsibleName: 'Debt guest',
            adults: 1,
            children: 0,
            hasVehicle: false,
          }),
        }),
      ])
      assert.equal(creditStay.response.status, 201)
      assert.equal(debtStay.response.status, 201)

      const advanced = await request(
        `/api/stays/${creditStay.value.id}/payments`,
        {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: payment(5000, { method: 'card' }),
        },
      )
      assert.equal(advanced.response.status, 201)
      assert.equal(advanced.value.account.totalMinor, 4000)
      assert.equal(advanced.value.account.balanceMinor, -1000)

      const rejectedClose = await request(
        `/api/stays/${creditStay.value.id}/close`,
        {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: { departureDate: dateOffset(0), version: 2 },
        },
      )
      assert.equal(rejectedClose.response.status, 409)
      assert.equal(rejectedClose.value.code, 'BALANCE_NOT_ZERO')

      const profile = await request('/api/camping', { cookie: cookieA })
      assert.equal(profile.response.status, 200)
      assert.equal(profile.value.pendingAmountMinor, 4000)
    },
  )

  await t.test(
    'a failed atomic payment-and-close rolls its payment back',
    async () => {
      const created = await request('/api/stays', {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: checkIn({
          responsibleName: 'Rollback guest',
          adults: 1,
          children: 0,
          hasVehicle: false,
        }),
      })
      assert.equal(created.response.status, 201)

      const failed = await request(`/api/stays/${created.value.id}/close`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: {
          departureDate: dateOffset(0),
          version: 1,
          payment: payment(1000),
        },
      })
      assert.equal(failed.response.status, 409)
      assert.equal(failed.value.code, 'BALANCE_NOT_ZERO')

      const persisted = await request(`/api/stays/${created.value.id}`, {
        cookie: cookieA,
      })
      assert.equal(persisted.value.version, 1)
      assert.deepEqual(persisted.value.payments, [])
      assert.equal(persisted.value.account.balanceMinor, 4000)
      assert.equal(persisted.value.closure, null)
    },
  )

  await t.test(
    'legacy closed stays can be settled but never overpaid',
    async () => {
      const created = await request('/api/stays', {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: checkIn({
          responsibleName: 'Legacy closed guest',
          adults: 1,
          children: 0,
          hasVehicle: false,
        }),
      })
      assert.equal(created.response.status, 201)

      const closedAt = new Date().toISOString()
      await setupDataSource.query(
        `UPDATE camping_private.stays
         SET closed_at = $1, closed_by_id = $2, closure = $3
         WHERE id = $4`,
        [
          closedAt,
          fixtures.userA,
          {
            departureDate: dateOffset(0),
            nights: 2,
            accommodationMinor: 4000,
            extrasMinor: 0,
            totalMinor: 4000,
            version: 1,
            closedAt,
            closedBy: 'Owner A',
          },
          created.value.id,
        ],
      )

      const partial = await request(`/api/stays/${created.value.id}/payments`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: payment(1000),
      })
      assert.equal(partial.response.status, 201)
      assert.equal(partial.value.account.balanceMinor, 3000)

      const overpayment = await request(
        `/api/stays/${created.value.id}/payments`,
        {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: payment(3001),
        },
      )
      assert.equal(overpayment.response.status, 409)
      assert.equal(overpayment.value.code, 'OVERPAYMENT')

      const settled = await request(`/api/stays/${created.value.id}/payments`, {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: payment(3000, { method: 'transfer' }),
      })
      assert.equal(settled.response.status, 201)
      assert.equal(settled.value.account.balanceMinor, 0)
      assert.equal(settled.value.payments.length, 2)

      const afterSettlement = await request(
        `/api/stays/${created.value.id}/payments`,
        {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: payment(1),
        },
      )
      assert.equal(afterSettlement.response.status, 409)
      assert.equal(afterSettlement.value.code, 'OVERPAYMENT')
    },
  )

  await t.test(
    'concurrent partial payments and close serialize to one valid state',
    async () => {
      const created = await request('/api/stays', {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: checkIn({
          responsibleName: 'Payment race guest',
          adults: 1,
          children: 0,
          hasVehicle: false,
        }),
      })
      assert.equal(created.response.status, 201)
      const racingStay = created.value.id

      const [firstPayment, secondPayment, closeResult] = await Promise.all([
        request(`/api/stays/${racingStay}/payments`, {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: payment(1000),
        }),
        request(`/api/stays/${racingStay}/payments`, {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: payment(1000, { method: 'card' }),
        }),
        request(`/api/stays/${racingStay}/close`, {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: {
            departureDate: dateOffset(0),
            version: 1,
            payment: payment(4000, { method: 'transfer' }),
          },
        }),
      ])

      const persisted = await request(`/api/stays/${racingStay}`, {
        cookie: cookieA,
      })
      if (closeResult.response.status === 201) {
        assert.equal(firstPayment.response.status, 409)
        assert.equal(secondPayment.response.status, 409)
        assert.equal(firstPayment.value.code, 'OVERPAYMENT')
        assert.equal(secondPayment.value.code, 'OVERPAYMENT')
        assert.equal(persisted.value.version, 2)
        assert.equal(persisted.value.account.balanceMinor, 0)
        assert.equal(persisted.value.payments.length, 1)
        assert.notEqual(persisted.value.closure, null)
      } else {
        assert.equal(closeResult.response.status, 409)
        assert.ok(
          ['STALE_STAY', 'BALANCE_NOT_ZERO'].includes(closeResult.value.code),
        )
        assert.equal(firstPayment.response.status, 201)
        assert.equal(secondPayment.response.status, 201)
        assert.equal(persisted.value.version, 3)
        assert.equal(persisted.value.account.balanceMinor, 2000)
        assert.equal(persisted.value.payments.length, 2)
        assert.equal(persisted.value.closure, null)
      }
    },
  )

  await t.test(
    'concurrent extra writes serialize without losing versions or rows',
    async () => {
      const created = await request('/api/stays', {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: checkIn({
          responsibleName: 'Concurrent guest',
          adults: 1,
          children: 0,
        }),
      })
      assert.equal(created.response.status, 201)
      const concurrentStay = created.value.id

      const results = await Promise.all([
        request(`/api/stays/${concurrentStay}/extras`, {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: {
            category: '',
            description: 'First',
            quantity: 1,
            unitPriceMinor: 10,
          },
        }),
        request(`/api/stays/${concurrentStay}/extras`, {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: {
            category: '',
            description: 'Second',
            quantity: 1,
            unitPriceMinor: 20,
          },
        }),
      ])
      assert.deepEqual(
        results.map((result) => result.response.status),
        [201, 201],
      )

      const persisted = await request(`/api/stays/${concurrentStay}`, {
        cookie: cookieA,
      })
      assert.equal(persisted.response.status, 200)
      assert.equal(persisted.value.version, 3)
      assert.deepEqual(
        persisted.value.extras.map((extra) => extra.description).sort(),
        ['First', 'Second'],
      )
    },
  )

  await t.test(
    'simultaneous close and extra resolve to one consistent state',
    async () => {
      const created = await request('/api/stays', {
        cookie: cookieA,
        method: 'POST',
        origin: ORIGIN,
        body: checkIn({ responsibleName: 'Racing guest' }),
      })
      assert.equal(created.response.status, 201)
      const racingStay = created.value.id

      const [closeResult, extraResult] = await Promise.all([
        request(`/api/stays/${racingStay}/close`, {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: {
            departureDate: dateOffset(0),
            version: 1,
            payment: payment(9500),
          },
        }),
        request(`/api/stays/${racingStay}/extras`, {
          cookie: cookieA,
          method: 'POST',
          origin: ORIGIN,
          body: {
            category: '',
            description: 'Racing extra',
            quantity: 1,
            unitPriceMinor: 100,
          },
        }),
      ])
      assert.deepEqual(
        [closeResult.response.status, extraResult.response.status].sort(),
        [201, 409],
      )

      const persisted = await request(`/api/stays/${racingStay}`, {
        cookie: cookieA,
      })
      if (closeResult.response.status === 201) {
        assert.equal(extraResult.value.code, 'STAY_CLOSED')
        assert.equal(persisted.value.version, 2)
        assert.deepEqual(persisted.value.extras, [])
        assert.equal(persisted.value.closure.extrasMinor, 0)
        assert.equal(persisted.value.closure.totalMinor, 9500)
        assert.equal(persisted.value.account.balanceMinor, 0)
        assert.equal(persisted.value.payments.length, 1)
      } else {
        assert.equal(closeResult.value.code, 'STALE_STAY')
        assert.equal(persisted.value.closure, null)
        assert.equal(persisted.value.version, 2)
        assert.equal(persisted.value.extras.length, 1)
        assert.equal(persisted.value.extras[0].description, 'Racing extra')
        assert.deepEqual(persisted.value.payments, [])
      }
    },
  )
})
