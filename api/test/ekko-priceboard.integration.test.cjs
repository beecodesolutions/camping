const assert = require('node:assert/strict')
const { test, before, after } = require('node:test')
const { randomUUID } = require('node:crypto')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
process.env.NODE_ENV = 'test'
process.env.DB_NAME = 'camping_test'
process.env.DB_PORT ??= '15434'
assert.equal(
  process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).pathname.slice(1)
    : process.env.DB_NAME,
  'camping_test',
)
const { createDataSource } = require('../dist/database/data-source')
const { CampingEntity } = require('../dist/database/entities/camping.entity')
const {
  configureEkkoPriceboard,
  ekkoPriceboardConfigSchema,
} = require('../dist/cli/ekko-priceboard-config')
const {
  ReservationService,
} = require('../dist/reservations/reservation.service')
const {
  AvailabilityService,
} = require('../dist/accommodations/availability.service')
// Counts are isolated test-fixture values, not asserted facts about Ekko inventory.
const config = {
  mixedBeds: 4,
  femaleBeds: 3,
  humanPricing: {
    campingRates: { adults: 15000, children: 15000, infants: 0 },
    privateExtraRates: { adults: 25000, children: 25000, infants: 0 },
    includedOccupancy: { adults: 2, children: 0, infants: 0 },
  },
  kitPricesIncludeCamping: false,
}
let db, camping, foreign, service, configDirectory, configPath
before(async () => {
  configDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ekko-priceboard-test-'),
  )
  configPath = path.join(configDirectory, 'inventory.json')
  fs.writeFileSync(configPath, JSON.stringify(config))
  db = createDataSource()
  await db.initialize()
  await db.runMigrations()
  const create = (name, country, currency) =>
    db.getRepository(CampingEntity).save({
      stableKey: `board-${randomUUID()}`,
      name,
      country,
      currency,
      timezone: 'America/Mexico_City',
      ageRanges: {
        adults: { min: 18, max: null },
        children: { min: 4, max: 17 },
        infants: { min: 0, max: 3 },
      },
      rates: { adults: 24000, children: 12000, infants: 0 },
    })
  camping = await create('Ekko Hostel', 'MX', 'MXN')
  foreign = await create('Other camping', 'CL', 'CLP')
  service = new ReservationService(db, new AvailabilityService(db))
})
after(async () => {
  if (configDirectory)
    fs.rmSync(configDirectory, { recursive: true, force: true })
  if (db?.isInitialized) {
    for (const id of [camping?.id, foreign?.id].filter(Boolean)) {
      for (const table of [
        'bed_occupancy',
        'reservation_beds',
        'accommodation_beds',
        'accommodation_units',
        'accommodation_types',
        'extra_templates',
        'outbox_events',
        'audit_logs',
      ])
        await db.query(
          `DELETE FROM camping_private.${table} WHERE camping_id=$1`,
          [id],
        )
      await db.query('DELETE FROM camping_private.campings WHERE id=$1', [id])
    }
    await db.destroy()
  }
})
async function quote(name, composition = {}) {
  const [type] = await db.query(
    'SELECT id FROM camping_private.accommodation_types WHERE camping_id=$1 AND name=$2',
    [camping.id, name],
  )
  const [unit] = await db.query(
    'SELECT id FROM camping_private.accommodation_units WHERE camping_id=$1 AND accommodation_type_id=$2 ORDER BY name LIMIT 1',
    [camping.id, type.id],
  )
  return service.quote(
    { camping, user: { id: randomUUID() } },
    {
      accommodationTypeId: type.id,
      ...(unit ? { unitId: unit.id } : {}),
      checkInDate: '2030-01-07',
      checkOutDate: '2030-01-08',
      adults: 2,
      children: 0,
      infants: 0,
      pets: 0,
      ...composition,
    },
  )
}
test('preview is read-only, requires known operational facts, and targets the exact tenant', async () => {
  assert.equal(
    ekkoPriceboardConfigSchema.safeParse({ ...config, mixedBeds: -1 }).success,
    false,
  )
  const before = await db.query(
    'SELECT * FROM camping_private.campings WHERE id=$1',
    [camping.id],
  )
  const plan = await configureEkkoPriceboard(db, {
    campingKey: camping.stableKey,
    config,
    apply: false,
  })
  assert.equal(plan.applied, false)
  assert.ok(plan.changes.length > 20)
  assert.deepEqual(
    await db.query('SELECT * FROM camping_private.campings WHERE id=$1', [
      camping.id,
    ]),
    before,
  )
  assert.equal(
    (
      await db.query(
        'SELECT * FROM camping_private.accommodation_types WHERE camping_id=$1',
        [camping.id],
      )
    ).length,
    0,
  )
  await assert.rejects(
    () =>
      configureEkkoPriceboard(db, {
        campingKey: foreign.stableKey,
        config,
        apply: true,
      }),
    /requires Ekko Hostel/,
  )
  await assert.rejects(
    () =>
      configureEkkoPriceboard(db, {
        campingKey: camping.stableKey,
        expectedCampingId: foreign.id,
        config,
        apply: true,
      }),
    /does not match/,
  )
})
test('apply is atomic and idempotent, retains age policy and other tenants', async () => {
  const before = await db.query(
    'SELECT * FROM camping_private.campings WHERE id=$1',
    [camping.id],
  )
  const foreignBefore = await db.query(
    'SELECT * FROM camping_private.campings WHERE id=$1',
    [foreign.id],
  )
  const applied = spawnSync(
    process.execPath,
    [
      path.join(__dirname, '../dist/cli/configure-ekko-priceboard.js'),
      `--camping-key=${camping.stableKey}`,
      `--config=${configPath}`,
      '--apply',
    ],
    { env: process.env, encoding: 'utf8', timeout: 10000 },
  )
  assert.equal(applied.status, 0, applied.stderr)
  const first = JSON.parse(applied.stdout)
  assert.equal(first.readBackVerified, true)
  assert.ok(first.changes.length > 20)
  const second = await configureEkkoPriceboard(db, {
    campingKey: camping.stableKey,
    config,
    apply: true,
  })
  assert.equal(second.changes.length, 0)
  assert.deepEqual(
    await db.query('SELECT * FROM camping_private.campings WHERE id=$1', [
      camping.id,
    ]),
    before,
  )
  assert.deepEqual(
    await db.query('SELECT * FROM camping_private.campings WHERE id=$1', [
      foreign.id,
    ]),
    foreignBefore,
  )
  const audits = await db.query(
    "SELECT * FROM camping_private.audit_logs WHERE camping_id=$1 AND action='camping.priceboard_configured'",
    [camping.id],
  )
  assert.equal(audits.length, 1)
})
test('backend quotes match the photographed private prices, extra humans and pet charges', async () => {
  assert.equal((await quote('Jungle')).priceSnapshot.totalMinor, 80000)
  assert.equal(
    (await quote('UFO', { adults: 3 })).priceSnapshot.totalMinor,
    105000,
  )
  assert.equal(
    (
      await quote('Portal', {
        adults: 6,
        checkInDate: '2030-01-11',
        checkOutDate: '2030-01-12',
      })
    ).priceSnapshot.totalMinor,
    210000,
  )
  assert.equal(
    (
      await quote('Jungle', {
        pets: 1,
        checkInDate: '2030-01-10',
        checkOutDate: '2030-01-14',
      })
    ).priceSnapshot.totalMinor,
    405000,
  )
  const kits = await db.query(
    "SELECT name FROM camping_private.accommodation_types WHERE camping_id=$1 AND name LIKE 'Kit%'",
    [camping.id],
  )
  assert.equal(kits.length, 0)
})
test('dorm weekly rate applies per bed and camping weekly rate applies per person', async () => {
  assert.equal(
    (await quote('Dormitorio mixto', { checkOutDate: '2030-01-14' }))
      .priceSnapshot.totalMinor,
    280000,
  )
  assert.equal(
    (await quote('Dormitorio femenino', { checkOutDate: '2030-01-22' }))
      .priceSnapshot.totalMinor,
    610000,
  )
  assert.equal(
    (await quote('Camping con equipo propio', { checkOutDate: '2030-01-14' }))
      .priceSnapshot.totalMinor,
    180000,
  )
  assert.equal(
    (
      await quote('Camping con equipo propio', {
        adults: 1,
        pets: 1,
        checkOutDate: '2030-01-22',
      })
    ).priceSnapshot.totalMinor,
    270000,
  )
})
test('rental templates retain existing extras semantics and exact board amounts', async () => {
  const rows = await db.query(
    'SELECT description,unit_price_minor::int FROM camping_private.extra_templates WHERE camping_id=$1 ORDER BY unit_price_minor,description',
    [camping.id],
  )
  assert.equal(rows.length, 8)
  assert.deepEqual(
    rows.map((r) => r.unit_price_minor),
    [3000, 3000, 3000, 5000, 5000, 10000, 30000, 50000],
  )
  assert.ok(rows.every((r) => r.description.endsWith('· por noche')))
})
test('mismatched inventory causes full rollback rather than partial repricing', async () => {
  const before = await db.query(
    'SELECT id,pricing FROM camping_private.accommodation_types WHERE camping_id=$1 ORDER BY id',
    [camping.id],
  )
  await assert.rejects(
    () =>
      configureEkkoPriceboard(db, {
        campingKey: camping.stableKey,
        config: {
          ...config,
          humanPricing: {
            ...config.humanPricing,
            campingRates: { ...config.humanPricing.campingRates, children: 0 },
          },
          mixedBeds: 2,
        },
        apply: true,
      }),
    /Existing beds exceed/,
  )
  assert.deepEqual(
    await db.query(
      'SELECT id,pricing FROM camping_private.accommodation_types WHERE camping_id=$1 ORDER BY id',
      [camping.id],
    ),
    before,
  )
})
test('remote application is blocked before connecting unless deployment and target are explicit', () => {
  const result = spawnSync(
    process.execPath,
    [
      path.join(__dirname, '../dist/cli/configure-ekko-priceboard.js'),
      '--camping-key=ekko-hostel',
      '--config=missing.json',
      '--apply',
    ],
    {
      env: {
        ...process.env,
        DATABASE_ADMIN_URL: 'postgresql://example.invalid/camping',
        DATABASE_URL: '',
      },
      encoding: 'utf8',
      timeout: 5000,
    },
  )
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Remote apply requires/)
})

test('pending owner decisions stay explicit and do not apply guessed tariffs', async () => {
  const pending = {
    mixedBeds: null,
    femaleBeds: null,
    humanPricing: null,
    kitPricesIncludeCamping: null,
  }
  const plan = await configureEkkoPriceboard(db, {
    campingKey: camping.stableKey,
    config: pending,
    apply: false,
  })
  assert.equal(plan.changes.length, 0)
  assert.equal(plan.deferred.length, 4)
  assert.ok(plan.pendingQuestions.some((q) => q.includes('kits')))
  const {
    priceboardTypes,
    priceboardExtras,
  } = require('../dist/cli/ekko-priceboard-config')
  assert.equal(priceboardTypes(pending).length, 0)
  assert.equal(priceboardExtras(pending).length, 6)
  assert.deepEqual(
    priceboardExtras({ ...config, kitPricesIncludeCamping: true })
      .slice(-2)
      .map((e) => e[2]),
    [150, 200],
  )
})
