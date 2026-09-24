const { test } = require('node:test')
const assert = require('node:assert/strict')
const c = require('../dist')
const valid = {
  responsibleName: ' Ana ',
  document: '',
  nationality: 'CL',
  phone: '',
  arrivalDate: '2026-09-01',
  estimatedDeparture: '',
  adults: 1,
  children: 0,
  infants: 0,
  hasVehicle: false,
  vehicleDescription: 'Van',
  licensePlate: 'AB12',
  location: '',
}
test('strict ingress normalizes vehicle and rejects caller ownership', () => {
  const parsed = c.checkInRequestSchema.parse(valid)
  assert.equal(parsed.responsibleName, 'Ana')
  assert.equal(parsed.vehicleDescription, '')
  assert.equal(
    c.checkInRequestSchema.safeParse({ ...valid, camping_id: 'other' }).success,
    false,
  )
  assert.equal(
    c.checkInRequestSchema.safeParse({
      ...valid,
      adults: Number.MAX_SAFE_INTEGER,
      children: 1,
    }).success,
    false,
  )
})
test('camping calendar differs from UTC and browser date', () => {
  assert.equal(
    c.todayInTimezone('America/Santiago', new Date('2026-07-01T02:00:00Z')),
    '2026-06-30',
  )
  assert.equal(
    c.todayInTimezone('America/Santiago', new Date('2026-12-01T02:00:00Z')),
    '2026-11-30',
  )
})
test('confirmed age boundaries form contiguous categories', () => {
  assert.equal(
    c.ageRangesSchema.safeParse(c.pilotCamping.ageRanges).success,
    true,
  )
  assert.equal(
    c.ageRangesSchema.safeParse({
      ...c.pilotCamping.ageRanges,
      children: { min: 5, max: 17 },
    }).success,
    false,
  )
  assert.equal(c.pilotExtras.length, 22)
  assert.equal(new Set(c.pilotExtras.map((x) => x.key)).size, 22)
})
test('extras accept only template reference or full copied values', () => {
  assert.equal(
    c.addExtraSchema.safeParse({
      templateId: 'be573584-ebcc-4a49-8f7e-664485f92565',
      quantity: 2,
    }).success,
    true,
  )
  assert.equal(
    c.addExtraSchema.safeParse({
      description: 'Lavado',
      unitPriceMinor: 5000,
      quantity: 2,
    }).success,
    true,
  )
  assert.equal(
    c.addExtraSchema.safeParse({
      description: 'Lavado',
      unitPriceMinor: 5000.1,
      quantity: 2,
    }).success,
    false,
  )
  assert.equal(
    c.addExtraSchema.safeParse({
      description: 'Lavado',
      unitPriceMinor: 5000,
      quantity: 0,
    }).success,
    false,
  )
})

test('partial edits preserve omitted category', () => {
  assert.deepEqual(c.extraTemplatePatchSchema.parse({ description: 'Nuevo' }), {
    description: 'Nuevo',
  })
  assert.equal(
    c.updateExtraSchema.parse({
      description: 'Nuevo',
      quantity: 1,
      unitPriceMinor: 100,
    }).category,
    undefined,
  )
})

test('menu categories remain free text and seed preserves image labels', () => {
  assert.deepEqual([...new Set(c.pilotExtras.map((x) => x.category))].sort(), [
    'Bebestibles',
    'Cervezas',
    'Comida',
    'Otras cosas',
    'Pizzas',
    'Servicios',
    'Vinos',
  ])
  assert.equal(
    c.extraTemplateInputSchema.parse({
      description: 'Otro servicio',
      unitPriceMinor: 1,
      category: '  Mi categoría nueva  ',
    }).category,
    'Mi categoría nueva',
  )
})

test('payment inputs require positive integer money and reject caller ownership', () => {
  const payment = {
    amountMinor: 6000,
    method: 'cash',
    paidOn: '2026-09-24',
    idempotencyKey: 'be573584-ebcc-4a49-8f7e-664485f92565',
  }
  assert.equal(c.paymentInputSchema.parse(payment).note, '')
  for (const amountMinor of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '6000']) {
    assert.equal(
      c.paymentInputSchema.safeParse({ ...payment, amountMinor }).success,
      false,
    )
  }
  assert.equal(
    c.paymentInputSchema.safeParse({ ...payment, method: 'crypto' }).success,
    false,
  )
  assert.equal(
    c.paymentInputSchema.safeParse({ ...payment, campingId: 'other' }).success,
    false,
  )
  assert.equal(
    c.paymentInputSchema.safeParse({ ...payment, paidOn: '2026-02-30' })
      .success,
    false,
  )
  assert.equal(
    c.closeRequestSchema.safeParse({
      departureDate: '2026-09-24',
      version: 1,
      payment,
    }).success,
    true,
  )
})

test('account represents advance credit without negative paid or cost amounts', () => {
  assert.equal(
    c.accountSchema.safeParse({
      totalMinor: 12000,
      paidMinor: 24000,
      balanceMinor: -12000,
      asOfDate: '2026-09-24',
    }).success,
    true,
  )
  assert.equal(
    c.accountSchema.safeParse({
      totalMinor: 12000,
      paidMinor: -1,
      balanceMinor: 12001,
      asOfDate: '2026-09-24',
    }).success,
    false,
  )
})
