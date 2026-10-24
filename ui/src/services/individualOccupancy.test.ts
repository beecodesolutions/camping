import { describe, expect, it } from 'vitest'
import { summarizeIndividualOccupancy } from './individualOccupancy'
import { readAllPages } from './pagination'

const types = [
  { id: 'rooms', enabled: true, inventoryMode: 'individual' },
  { id: 'camping', enabled: true, inventoryMode: 'unlimited' },
  { id: 'disabled', enabled: false, inventoryMode: 'individual' },
] as const

describe('individual occupancy', () => {
  it('reads every page before calculating the aggregate', async () => {
    const pages: Record<
      number,
      { items: string[]; total: number; pageSize: number }
    > = {
      1: { items: ['room-1'], total: 3, pageSize: 1 },
      2: { items: ['room-2'], total: 3, pageSize: 1 },
      3: { items: ['room-3'], total: 3, pageSize: 1 },
    }

    await expect(readAllPages(async (page) => pages[page]!)).resolves.toEqual([
      'room-1',
      'room-2',
      'room-3',
    ])
  })

  it('counts only unique checked-in units with active linked stays', () => {
    const result = summarizeIndividualOccupancy(
      types,
      [
        { id: 'room-1', typeId: 'rooms', enabled: true },
        { id: 'room-2', typeId: 'rooms', enabled: true },
        { id: 'disabled-room', typeId: 'disabled', enabled: false },
      ],
      [
        {
          status: 'checked_in',
          stayId: 'stay-1',
          unitId: 'room-1',
          accommodationTypeId: 'rooms',
        },
        {
          status: 'checked_in',
          stayId: 'stay-1',
          unitId: 'room-1',
          accommodationTypeId: 'rooms',
        },
        {
          status: 'pending',
          stayId: null,
          unitId: 'room-2',
          accommodationTypeId: 'rooms',
        },
        {
          status: 'checked_out',
          stayId: 'stay-closed',
          unitId: 'room-2',
          accommodationTypeId: 'rooms',
        },
        {
          status: 'checked_in',
          stayId: 'stay-camping',
          unitId: null,
          accommodationTypeId: 'camping',
        },
        {
          status: 'checked_in',
          stayId: 'stay-2',
          unitId: 'disabled-room',
          accommodationTypeId: 'disabled',
        },
      ],
      [{ id: 'stay-1' }, { id: 'stay-2' }],
    )

    expect(result).toEqual({ occupied: 2, total: 3, unoccupied: 1 })
  })
})
