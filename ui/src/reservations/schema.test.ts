import { expect, it, vi } from 'vitest'
import type { AccommodationType, AccommodationUnit } from '@camping/contracts'
import {
  reservationContact,
  reservationDefaults,
  reservationFormSchema,
  reservationQuoteInput,
  reservationValidationFields,
} from './schema'

const type = {
  id: '00000000-0000-4000-8000-000000000001',
  campingId: '00000000-0000-4000-8000-000000000002',
  name: 'Cabaña',
  inventoryMode: 'individual',
  maxOccupancy: 4,
  baseNightlyPriceMinor: 1000,
  enabled: true,
  createdAt: '2026-10-30T00:00:00Z',
  updatedAt: '2026-10-30T00:00:00Z',
} satisfies AccommodationType
const unit = {
  id: '00000000-0000-4000-8000-000000000003',
  campingId: type.campingId,
  typeId: type.id,
  name: 'Cabaña 1',
  maxOccupancy: 2,
  enabled: true,
  createdAt: type.createdAt,
  updatedAt: type.updatedAt,
} satisfies AccommodationUnit
const schema = reservationFormSchema([type], [unit])
const values = {
  ...reservationDefaults('UTC'),
  accommodationTypeId: type.id,
  unitId: unit.id,
  responsibleName: 'Ana',
}

it('initializes dates in the camping timezone across a month boundary', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-01T01:00:00Z'))
  expect(reservationDefaults('America/Santiago')).toMatchObject({
    checkInDate: '2026-10-31',
    checkOutDate: '2026-11-01',
    adults: 1,
  })
  vi.useRealTimers()
})

it('requires an enabled matching unit, dates and guests but permits exceeding capacity', () => {
  expect(schema.safeParse(values).success).toBe(true)
  for (const patch of [
    { unitId: '' },
    { checkOutDate: values.checkInDate },
    { adults: 0 },
    { adults: -1 },
    { adults: 1.5 },
    { responsibleName: ' ' },
  ])
    expect(schema.safeParse({ ...values, ...patch }).success).toBe(false)
  expect(
    schema.safeParse({ ...values, adults: 4, children: 2, infants: 1 }).success,
  ).toBe(true)
  expect(
    reservationFormSchema([type], [{ ...unit, enabled: false }]).safeParse(
      values,
    ).success,
  ).toBe(false)
})

it('omits units for unlimited camping and leaves contact optional except the responsible name', () => {
  const unlimited = {
    ...type,
    inventoryMode: 'unlimited',
    maxOccupancy: null,
  } satisfies AccommodationType
  const parsed = reservationFormSchema([unlimited], []).parse({
    ...values,
    unitId: '',
  })
  expect(reservationQuoteInput(parsed, unlimited)).not.toHaveProperty('unitId')
  expect(reservationContact(parsed)).toEqual({
    responsibleName: 'Ana',
    notes: '',
    source: 'manual',
  })
})

it('normalizes telephone with the existing country selector and validates email', () => {
  const parsed = schema.parse({
    ...values,
    phoneCountry: 'CL',
    phone: '9 1234 5678',
    email: 'ana@example.com',
  })
  expect(reservationContact(parsed)).toMatchObject({
    phone: '+56912345678',
    email: 'ana@example.com',
  })
  for (const patch of [
    { phone: '123' },
    { phone: 'hola', phoneCountry: 'CL' },
    { email: 'invalid' },
  ])
    expect(schema.safeParse({ ...values, ...patch }).success).toBe(false)
})

it('maps recognized server validation paths to fields without exposing raw messages', () => {
  expect(
    reservationValidationFields({
      status: 400,
      data: {
        fields: [
          { path: ['phone'], message: 'internal' },
          { path: ['unknown'] },
        ],
      },
    }),
  ).toEqual(['phone'])
  expect(reservationValidationFields({ status: 503 })).toEqual([])
})
