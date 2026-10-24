import { describe, expect, it } from 'vitest'
import type { AvailabilityResponse } from '@camping/contracts'
import { availabilityForDate, monthRange, shiftMonth } from './calendar'

const individual = {
  typeId: '00000000-0000-4000-8000-000000000001',
  inventoryMode: 'individual',
  nights: [
    {
      date: '2026-10-23',
      totalUnits: 3,
      reservedUnits: 2,
      blockedUnits: 0,
      availableUnits: 1,
    },
    {
      date: '2026-10-24',
      totalUnits: 3,
      reservedUnits: 3,
      blockedUnits: 0,
      availableUnits: 0,
    },
  ],
  availableUnitIds: [],
} satisfies AvailabilityResponse['types'][number]

describe('availability calendar helpers', () => {
  it('builds a complete month grid using calendar dates', () => {
    const range = monthRange('2026-10')
    expect(range.start).toBe('2026-10-01')
    expect(range.end).toBe('2026-11-01')
    expect(range.days.filter((day) => day.inMonth)).toHaveLength(31)
    expect(range.days.length % 7).toBe(0)
  })

  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('maps individual inventory to free, partial, and none states', () => {
    expect(availabilityForDate(individual, '2026-10-23')).toMatchObject({
      tone: 'partial',
      available: 1,
      reserved: 2,
    })
    expect(availabilityForDate(individual, '2026-10-24')).toMatchObject({
      tone: 'none',
      available: 0,
    })
  })
})
