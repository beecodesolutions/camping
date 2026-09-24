import assert from 'node:assert/strict'
import test from 'node:test'
import { daysBetween, ensureSafeMoney, validateDeparture } from './date'

test('billing uses calendar nights and charges same-day stay as one night', () => {
  assert.equal(daysBetween('2026-09-23', '2026-09-23'), 1)
  assert.equal(daysBetween('2026-09-23', '2026-09-24'), 1)
  assert.equal(daysBetween('2026-09-30', '2026-10-02'), 2)
})

test('departure validation rejects before-arrival and future dates', () => {
  assert.throws(
    () => validateDeparture('2026-09-23', '2026-09-22', 'America/Santiago'),
    /anterior/,
  )
  assert.throws(
    () => validateDeparture('2026-09-23', '2999-01-01', 'America/Santiago'),
    /futura/,
  )
})

test('money guard rejects unsafe totals', () => {
  assert.equal(ensureSafeMoney(0), 0)
  assert.throws(
    () => ensureSafeMoney(Number.MAX_SAFE_INTEGER + 1),
    /Importe inválido/,
  )
})
