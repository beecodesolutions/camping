const { test } = require('node:test')
const assert = require('node:assert/strict')
const c = require('../dist')

const typeId = 'be573584-ebcc-4a49-8f7e-664485f92565'
const unitId = '7c2c7f11-1aa4-4f1e-a58d-7e2fbcbb3a44'
const reservation = {
  accommodationTypeId: typeId,
  unitId,
  checkInDate: '2026-10-01',
  checkOutDate: '2026-10-04',
  responsibleName: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+56912345678',
  adults: 2,
  children: 1,
  infants: 0,
  source: 'website',
  notes: 'Late arrival',
  idempotencyKey: 'c7e8d719-f9e7-4a5c-899e-2b5004568d1f',
  acceptedTotalMinor: 36000,
}

test('reservation create accepts one accommodation and rejects caller scope', () => {
  assert.equal(c.reservationCreateSchema.safeParse(reservation).success, true)
  assert.equal(
    c.reservationCreateSchema.safeParse({ ...reservation, campingId: typeId })
      .success,
    false,
  )
  assert.equal(
    c.reservationCreateSchema.safeParse({
      ...reservation,
      checkOutDate: reservation.checkInDate,
    }).success,
    false,
  )
  assert.equal(
    c.reservationCreateSchema.safeParse({
      ...reservation,
      adults: 0,
      children: 0,
      infants: 0,
    }).success,
    false,
  )
})

test('reservation patch validates complete date pairs when supplied', () => {
  assert.equal(c.reservationPatchSchema.safeParse({ version: 1 }).success, true)
  assert.equal(
    c.reservationPatchSchema.safeParse({
      version: 1,
      checkInDate: '2026-10-04',
      checkOutDate: '2026-10-01',
    }).success,
    false,
  )
  assert.equal(
    c.reservationPatchSchema.safeParse({ campingId: typeId, version: 1 })
      .success,
    false,
  )
  assert.equal(
    c.reservationPatchSchema.safeParse({
      version: 1,
      adults: 0,
      children: 0,
      infants: 0,
    }).success,
    false,
  )
})

test('reservation creation and patch require a complete manual price override', () => {
  assert.equal(
    c.reservationCreateSchema.safeParse({
      ...reservation,
      agreedTotalMinor: 35000,
      priceAdjustmentReason: 'Owner discount',
    }).success,
    true,
  )
  for (const incomplete of [
    { agreedTotalMinor: 35000 },
    { priceAdjustmentReason: 'Owner discount' },
    { agreedTotalMinor: 35000, priceAdjustmentReason: '   ' },
  ]) {
    assert.equal(
      c.reservationCreateSchema.safeParse({ ...reservation, ...incomplete })
        .success,
      false,
    )
    assert.equal(
      c.reservationPatchSchema.safeParse({ version: 1, ...incomplete }).success,
      false,
    )
  }
  assert.equal(
    c.reservationPatchSchema.safeParse({
      version: 1,
      agreedTotalMinor: 35000,
      priceAdjustmentReason: 'Owner discount',
    }).success,
    true,
  )
  assert.equal(
    c.reservationQuoteUpdateSchema.safeParse({
      version: 1,
      acceptedTotalMinor: 35000,
    }).success,
    false,
  )
})

test('reservation creation quote omits contact and idempotency fields', () => {
  const quote = {
    accommodationTypeId: typeId,
    unitId,
    checkInDate: '2026-10-01',
    checkOutDate: '2026-10-04',
    adults: 2,
    children: 1,
    infants: 0,
  }
  assert.equal(c.reservationQuoteCreateSchema.safeParse(quote).success, true)
  assert.equal(
    c.reservationQuoteCreateSchema.safeParse({
      ...quote,
      responsibleName: 'Ana Pérez',
      idempotencyKey: reservation.idempotencyKey,
    }).success,
    false,
  )
  assert.equal(
    c.reservationQuoteSchema.safeParse({
      priceSnapshot: {
        basis: 'per_unit',
        currency: 'CLP',
        baseNightlyPriceMinor: 12000,
        nights: 3,
        totalMinor: 36000,
      },
    }).success,
    true,
  )
  assert.equal(
    c.reservationUpdateQuoteSchema.safeParse({
      reservationId: reservation.idempotencyKey,
      version: 1,
      priceSnapshot: {
        basis: 'per_unit',
        currency: 'CLP',
        baseNightlyPriceMinor: 12000,
        nights: 3,
        totalMinor: 36000,
      },
    }).success,
    true,
  )
})

test('reservation list query applies pagination and bounded date filters', () => {
  assert.deepEqual(c.reservationListQuerySchema.parse({}), {
    page: 1,
    pageSize: 25,
  })
  assert.deepEqual(
    c.reservationListQuerySchema.parse({ page: '2', pageSize: '50' }),
    { page: 2, pageSize: 50 },
  )
  assert.equal(
    c.reservationListQuerySchema.safeParse({ page: '2147483647' }).success,
    true,
  )
  for (const invalid of [
    { page: '0' },
    { page: '2147483648' },
    { pageSize: '101' },
    { checkInDate: '2026-10-01' },
    { checkOutDate: '2026-10-04' },
    { checkInDate: '2026-10-04', checkOutDate: '2026-10-01' },
    { checkInDate: '2026-01-01', checkOutDate: '2027-01-03' },
  ]) {
    assert.equal(c.reservationListQuerySchema.safeParse(invalid).success, false)
  }
  assert.equal(
    c.reservationStatusCommandSchema.safeParse({ version: 1 }).success,
    true,
  )
  assert.equal(
    c.reservationStatusCommandSchema.safeParse({ version: 0 }).success,
    false,
  )
})

test('accommodation inventory mode carries its capacity invariant', () => {
  const type = {
    name: 'Cabaña familiar',
    inventoryMode: 'individual',
    maxOccupancy: 4,
    baseNightlyPriceMinor: 12000,
    enabled: true,
  }
  assert.equal(c.accommodationTypeCreateSchema.safeParse(type).success, true)
  assert.equal(
    c.accommodationTypeCreateSchema.safeParse({
      ...type,
      maxOccupancy: null,
    }).success,
    false,
  )
  assert.equal(
    c.accommodationTypeCreateSchema.safeParse({
      ...type,
      inventoryMode: 'unlimited',
      maxOccupancy: null,
    }).success,
    true,
  )
  for (const invalid of [
    { ...type, maxOccupancy: 0 },
    { ...type, inventoryMode: 'unlimited', maxOccupancy: 2 },
  ]) {
    assert.equal(
      c.accommodationTypeCreateSchema.safeParse(invalid).success,
      false,
    )
  }
})

test('blocks require one unit and valid bounded dates', () => {
  const block = {
    typeId,
    unitId,
    checkInDate: '2026-10-01',
    checkOutDate: '2026-10-03',
    reason: 'Maintenance',
  }
  assert.equal(c.reservationBlockCreateSchema.safeParse(block).success, true)
  assert.equal(
    c.reservationBlockCreateSchema.safeParse({ ...block, unitId: undefined })
      .success,
    false,
  )
  assert.equal(
    c.reservationBlockCreateSchema.safeParse({
      ...block,
      checkOutDate: block.checkInDate,
    }).success,
    false,
  )
})

test('reservation counts, nights and contact fields honor bounds', () => {
  assert.equal(
    c.reservationCreateSchema.safeParse({
      ...reservation,
      adults: 2_147_483_648,
    }).success,
    false,
  )
  assert.equal(
    c.reservationPriceSnapshotSchema.safeParse({
      basis: 'per_unit',
      currency: 'CLP',
      baseNightlyPriceMinor: 12000,
      nights: 2_147_483_648,
      totalMinor: 36000,
    }).success,
    false,
  )
  assert.equal(
    c.reservationCreateSchema.safeParse({ ...reservation, phone: '1234' })
      .success,
    false,
  )
  assert.equal(
    c.reservationCreateSchema.safeParse({ ...reservation, nationality: 'ZZ' })
      .success,
    false,
  )
})

test('price snapshots preserve per-person and per-unit discriminators', () => {
  assert.equal(
    c.reservationPriceSnapshotSchema.safeParse({
      basis: 'per_unit',
      currency: 'CLP',
      baseNightlyPriceMinor: 12000,
      nights: 3,
      totalMinor: 36000,
    }).success,
    true,
  )
  assert.equal(
    c.reservationPriceSnapshotSchema.safeParse({
      basis: 'per_person',
      currency: 'CLP',
      totalMinor: 48000,
      ageRanges: c.pilotCamping.ageRanges,
      rates: c.pilotCamping.rates,
      nights: 3,
      adjustmentMinor: -1000,
      adjustmentReason: 'Owner discount',
    }).success,
    true,
  )
  assert.equal(
    c.reservationPriceSnapshotSchema.safeParse({
      basis: 'per_unit',
      currency: 'CLP',
      baseNightlyPriceMinor: 12000,
      nights: 3,
      totalMinor: 36000,
      adjustmentMinor: -1000,
    }).success,
    false,
  )
  assert.equal(
    c.reservationPriceSnapshotSchema.safeParse({
      basis: 'per_person',
      currency: 'CLP',
      totalMinor: 48000,
      ageRanges: c.pilotCamping.ageRanges,
      rates: { ...c.pilotCamping.rates, adults: 1.5 },
      nights: 3,
    }).success,
    false,
  )
})

test('payments support manual methods and void metadata', () => {
  const payment = {
    amountMinor: 15000,
    method: 'cash',
    paidOn: '2026-10-01',
    idempotencyKey: 'be573584-ebcc-4a49-8f7e-664485f92565',
  }
  assert.equal(c.reservationPaymentInputSchema.safeParse(payment).success, true)
  for (const method of ['cash', 'transfer', 'card']) {
    assert.equal(
      c.reservationPaymentInputSchema.safeParse({ ...payment, method }).success,
      true,
    )
  }
  assert.equal(
    c.reservationPaymentVoidSchema.safeParse({
      voidReason: 'Duplicate payment',
    }).success,
    true,
  )
  assert.equal(
    c.reservationPaymentVoidSchema.safeParse({ voidReason: '   ' }).success,
    false,
  )
})
