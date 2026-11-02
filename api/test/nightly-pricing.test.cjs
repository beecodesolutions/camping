const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  nightlyPrice,
  calendarNights,
} = require('../dist/reservations/nightly-pricing')
const {
  priceSnapshotFor,
  baseFromSnapshot,
} = require('../dist/reservations/reservation-pricing')
const {
  capacitySuitability,
  humanOccupancy,
  accommodationPricingSchema,
} = require('@camping/contracts')
const guests = { adults: 2, children: 0, infants: 0, pets: 0 }
const rates = { adults: 100, children: 50, infants: 0 }
const config = (extra = {}) => ({
  basis: 'per_unit',
  baseNightlyPriceMinor: 800,
  rates,
  extraPersonRates: rates,
  includedOccupancy: { adults: 2, children: 0, infants: 0 },
  petNightlyPriceMinor: 100,
  weekdays: [],
  discounts: [],
  ...extra,
})
const quote = (
  p,
  g = guests,
  start = '2030-01-07',
  end = '2030-01-08',
  beds = 2,
) => nightlyPrice(config(p), g, start, end, beds)
const discount = (type, value, repeat = true) => ({
  blockNights: 7,
  benefit: { type, value },
  repeat,
})
test('unit includes category-specific guests without double charging; pets remain separate', () => {
  assert.equal(quote({}).totalMinor, 800)
  const q = quote(
    {},
    { ...guests, adults: 3, children: 2, infants: 1, pets: 1 },
  )
  assert.deepEqual(q.categoryCharges, {
    adults: 100,
    children: 100,
    infants: 0,
  })
  assert.equal(q.humanMinor, 200)
  assert.equal(q.petMinor, 100)
  assert.equal(q.totalMinor, 1100)
})
test('per-person actual composition and free infants', () =>
  assert.equal(
    quote({ basis: 'per_person' }, { ...guests, children: 1, infants: 2 })
      .totalMinor,
    250,
  ))
test('weekday/weekend boundary uses each actual calendar night', () => {
  const q = quote(
    {
      weekdays: [5, 6, 0].map((day) => ({
        day,
        rates: { baseNightlyPriceMinor: 950 },
      })),
    },
    guests,
    '2030-01-10',
    '2030-01-14',
  )
  assert.deepEqual(
    q.nights.map((n) => n.baseMinor),
    [800, 950, 950, 950],
  )
  assert.equal(q.totalMinor, 3650)
  assert.equal(calendarNights('2026-03-07', '2026-03-10').length, 3)
})
test('fixed price blocks repeat and incomplete trailing nights remain full price', () =>
  assert.equal(
    quote(
      {
        baseNightlyPriceMinor: 250,
        discounts: [discount('FIXED_PRICE', 1400)],
      },
      guests,
      '2030-01-01',
      '2030-01-16',
    ).totalMinor,
    3050,
  ))
test('free-night blocks repeat and consume complete blocks only', () => {
  assert.equal(
    quote(
      { baseNightlyPriceMinor: 250, discounts: [discount('FREE_NIGHTS', 1)] },
      guests,
      '2030-01-01',
      '2030-01-16',
    ).totalMinor,
    3250,
  )
  assert.equal(
    quote(
      { baseNightlyPriceMinor: 250, discounts: [discount('FREE_NIGHTS', 1)] },
      guests,
      '2030-01-01',
      '2030-01-07',
    ).discountMinor,
    0,
  )
})
test('percentage uses actual block rates and nonrepeat only discounts first block', () => {
  const p = {
    baseNightlyPriceMinor: 250,
    discounts: [discount('PERCENTAGE', 2000, false)],
  }
  assert.equal(quote(p, guests, '2030-01-01', '2030-01-16').totalMinor, 3400)
})
test('free nights select cheapest actual nights per block; pet charges excluded', () => {
  const p = {
    baseNightlyPriceMinor: 250,
    weekdays: [{ day: 2, rates: { baseNightlyPriceMinor: 100 } }],
    discounts: [discount('FREE_NIGHTS', 1)],
  }
  const q = quote(p, { ...guests, pets: 2 }, '2030-01-01', '2030-01-08')
  assert.equal(q.discountMinor, 100)
  assert.equal(q.petMinor, 1400)
  assert.equal(q.totalMinor, 2900)
})
test('nonstacking picks cheapest result and ties preserve first rule', () => {
  const q = quote(
    {
      baseNightlyPriceMinor: 250,
      discounts: [
        discount('FIXED_AMOUNT', 500),
        discount('FIXED_PRICE', 1400),
        discount('FIXED_AMOUNT', 500),
      ],
    },
    guests,
    '2030-01-01',
    '2030-01-08',
  )
  assert.equal(q.totalMinor, 1250)
  assert.equal(q.discountRuleIndex, 0)
})
test('fixed bed block price is per bed, pets charged once per pet', () => {
  const q = quote(
    {
      basis: 'per_bed',
      baseNightlyPriceMinor: 250,
      discounts: [discount('FIXED_PRICE', 1400)],
    },
    { ...guests, pets: 1 },
    '2030-01-01',
    '2030-01-08',
    2,
  )
  assert.equal(q.totalMinor, 3500)
  assert.equal(q.petMinor, 700)
})
test('discount never negative or a surcharge; half-up percentage rounding', () => {
  assert.equal(
    quote({
      discounts: [
        {
          blockNights: 1,
          repeat: true,
          benefit: { type: 'FIXED_AMOUNT', value: 99999 },
        },
      ],
    }).totalMinor,
    0,
  )
  assert.equal(
    quote({
      discounts: [
        {
          blockNights: 1,
          repeat: true,
          benefit: { type: 'FIXED_PRICE', value: 99999 },
        },
      ],
    }).totalMinor,
    800,
  )
  assert.equal(
    quote({
      baseNightlyPriceMinor: 101,
      discounts: [
        {
          blockNights: 1,
          repeat: true,
          benefit: { type: 'PERCENTAGE', value: 5000 },
        },
      ],
    }).totalMinor,
    50,
  )
  assert.throws(
    () =>
      quote(
        { baseNightlyPriceMinor: Number.MAX_SAFE_INTEGER },
        guests,
        '2030-01-01',
        '2030-01-03',
      ),
    /overflow/,
  )
})
test('snapshot recalculation retains rules and new composition including pets', () => {
  const input = {
    inventoryMode: 'individual',
    currency: 'MXN',
    moneyDecimals: null,
    pricing: config(),
    checkInDate: '2030-01-01',
    checkOutDate: '2030-01-02',
    ...guests,
  }
  const frozen = priceSnapshotFor(input)
  assert.equal(
    baseFromSnapshot(frozen, '2030-01-01', '2030-01-03', 2, 1, 1, 2).totalMinor,
    2100,
  )
  const rounded = priceSnapshotFor({
    ...input,
    moneyDecimals: 0,
    pricing: config({ baseNightlyPriceMinor: 1050 }),
  })
  assert.equal(rounded.totalMinor, 1100)
  assert.equal(rounded.roundingMinor, 50)
})
test('capacity distinguishes oversized, children overflow, infants policy, and pets', () => {
  assert.equal(capacitySuitability(guests, 6, false).capacityMatch, 'OVERSIZED')
  assert.equal(
    capacitySuitability({ ...guests, children: 2 }, 2, false).childrenOverflow,
    true,
  )
  assert.equal(
    capacitySuitability({ ...guests, adults: 3 }, 2, false).childrenOverflow,
    false,
  )
  assert.equal(humanOccupancy({ ...guests, infants: 2, pets: 8 }, false), 2)
  assert.equal(humanOccupancy({ ...guests, infants: 2, pets: 8 }, true), 4)
  assert.equal(
    accommodationPricingSchema.safeParse(
      config({ discounts: [discount('FREE_NIGHTS', 8)] }),
    ).success,
    false,
  )
})

test('pricing overflow uses the existing domain conflict code', () => {
  assert.throws(
    () =>
      priceSnapshotFor({
        inventoryMode: 'individual',
        currency: 'MXN',
        pricing: config({ baseNightlyPriceMinor: Number.MAX_SAFE_INTEGER }),
        checkInDate: '2030-01-01',
        checkOutDate: '2030-01-03',
        ...guests,
      }),
    (error) => error.getResponse().code === 'MONEY_OVERFLOW',
  )
})
