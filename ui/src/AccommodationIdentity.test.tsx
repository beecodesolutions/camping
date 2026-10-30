import { describe, expect, it } from 'vitest'
import {
  buildAccommodationIdentity,
  indexReservationsById,
} from './services/accommodationIdentity'

const labels = {
  accommodation: 'Alojamiento',
  freeCamping: 'Camping libre',
  unknownUnit: 'Unidad sin nombre',
}

describe('accommodation identity', () => {
  it('indexes by reservation id even when the linked stay id differs', () => {
    const indexed = indexReservationsById([
      {
        id: 'reservation-123',
        stayId: 'stay-456',
      },
    ])

    expect(indexed.get('reservation-123')?.id).toBe('reservation-123')
    expect(indexed.get('stay-456')).toBeUndefined()
  })

  it('resolves a linked reservation by its reservation id data', () => {
    expect(
      buildAccommodationIdentity({
        reservation: {
          accommodationTypeId: 'room-type',
          unitId: 'room-1',
        },
        typeNames: new Map([['room-type', 'Habitación privada']]),
        typeModes: new Map([['room-type', 'individual']]),
        unitNames: new Map([['room-1', 'Pino 1']]),
        labels,
      }),
    ).toEqual({
      kind: 'individual',
      label: 'Habitación privada · Pino 1',
      compactLabel: 'Pino 1',
    })
  })

  it('keeps linked camping and unlinked camping distinct from an unknown stay', () => {
    expect(
      buildAccommodationIdentity({
        reservation: {
          accommodationTypeId: 'camp-type',
          unitId: null,
        },
        typeNames: new Map([['camp-type', 'Camping libre']]),
        typeModes: new Map([['camp-type', 'unlimited']]),
        labels,
      }),
    ).toEqual({
      kind: 'camping',
      label: 'Camping libre',
      compactLabel: 'Camping libre',
    })
    expect(
      buildAccommodationIdentity({
        location: 'Pino 1',
        labels,
      }),
    ).toEqual({
      kind: 'camping',
      label: 'Camping libre · Pino 1',
      compactLabel: 'Pino 1',
    })
    expect(
      buildAccommodationIdentity({ hasReservation: true, labels }),
    ).toEqual({
      kind: 'neutral',
      label: 'Alojamiento',
      compactLabel: 'Unidad sin nombre',
    })
    expect(buildAccommodationIdentity({ labels })).toEqual({
      kind: 'camping',
      label: 'Camping libre',
      compactLabel: 'Camping libre',
    })
  })
})
