import { expect, it } from 'vitest'
import { relativeDay } from './relativeDay'

it.each([
  ['2026-09-24', '2026-09-24', 'hoy'],
  ['2026-09-23', '2026-09-24', 'ayer'],
  ['2026-09-20', '2026-09-24', 'hace 4 días'],
  ['2026-08-31', '2026-09-01', 'ayer'],
  ['2025-12-31', '2026-01-02', 'hace 2 días'],
])('formats calendar days from %s to %s', (date, today, expected) => {
  expect(relativeDay(date, today, 'es-CL')).toBe(expected)
})
