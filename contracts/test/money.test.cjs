const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  roundMoneyMinor,
  moneySettingsSchema,
  hasMoneyPrecision,
} = require('../dist')

test('money settings accepts only zero or native currency precision', () => {
  assert.deepEqual(moneySettingsSchema.parse({ moneyDecimals: 0 }), {
    moneyDecimals: 0,
  })
  assert.equal(
    moneySettingsSchema.safeParse({ moneyDecimals: 2 }).success,
    false,
  )
})
test('half-up rounding is exact and never changes native-precision legacy amounts', () => {
  assert.equal(roundMoneyMinor(120049, 'MXN', 0), 120000)
  assert.equal(roundMoneyMinor(120050, 'MXN', 0), 120100)
  assert.equal(roundMoneyMinor(120050, 'MXN', null), 120050)
  assert.equal(roundMoneyMinor(120050, 'CLP', 0), 120050)
  assert.equal(roundMoneyMinor(1234500, 'KWD', 0), 1235000)
  assert.equal(hasMoneyPrecision(120050, 'MXN', 0), false)
  assert.throws(
    () => roundMoneyMinor(Number.MAX_SAFE_INTEGER, 'MXN', 0),
    /overflow/,
  )
})
