import { expect, it, vi, afterEach } from 'vitest'
import { checkInDefaults, checkInSchema, todayLocal } from './schema'

afterEach(() => vi.useRealTimers())

const valid = () => ({ ...checkInDefaults(), responsibleName: '  Ana Pérez  ' })

it('acepta ingreso mínimo y salida el mismo día; limpia nombre y patente sin vehículo', () => {
  expect(
    checkInSchema.parse({
      ...valid(),
      hasVehicle: false,
      vehicleDescription: 'Toyota blanco',
      licensePlate: 'ABC123',
      estimatedDeparture: todayLocal(),
    }),
  ).toMatchObject({
    responsibleName: 'Ana Pérez',
    vehicleDescription: '',
    licensePlate: '',
    adults: 1,
  })
})

it.each([
  { responsibleName: '   ' },
  { adults: NaN },
  { children: -1 },
  { infants: 1.5 },
  { adults: 0, children: 0, infants: 0 },
  { arrivalDate: '2026-02-30' },
  { arrivalDate: '' },
  { estimatedDeparture: 'not-a-date' },
  { arrivalDate: '2026-01-02', estimatedDeparture: '2026-01-01' },
])('rechaza datos inválidos %j', (override) => {
  expect(checkInSchema.safeParse({ ...valid(), ...override }).success).toBe(
    false,
  )
})

it('no permite registrar ingresos futuros y usa fecha local', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 8, 20, 23, 30))
  expect(todayLocal()).toBe('2026-09-20')
  expect(
    checkInSchema.safeParse({ ...valid(), arrivalDate: '2026-09-21' }).success,
  ).toBe(false)
})

it('conserva datos opcionales y permite vehículo sin patente', () => {
  expect(
    checkInSchema.parse({
      ...valid(),
      document: ' 123 ',
      nationality: 'CL',
      phoneCountry: 'CL',
      phone: '9 1234 5678',
      location: ' Río ',
    }),
  ).toMatchObject({
    hasVehicle: true,
    licensePlate: '',
    document: '123',
    location: 'Río',
  })
})

it('conserva modelo/color y patente cuando ingresa con vehículo', () => {
  expect(
    checkInSchema.parse({
      ...valid(),
      vehicleDescription: ' Toyota blanco ',
      licensePlate: ' ABC123 ',
    }),
  ).toMatchObject({
    hasVehicle: true,
    vehicleDescription: 'Toyota blanco',
    licensePlate: 'ABC123',
  })
})

it('permite nacionalidad y teléfono de países distintos', () => {
  expect(
    checkInSchema.parse({
      ...valid(),
      nationality: 'AR',
      phoneCountry: 'CL',
      phone: '9 1234 5678',
    }),
  ).toMatchObject({
    nationality: 'AR',
    phone: '+56912345678',
  })
})

it.each([
  { nationality: 'XX' },
  { phoneCountry: 'XX' },
  { phone: '912345678', phoneCountry: '' },
  { phone: '+56 912345678', phoneCountry: 'CL' },
])('rechaza país o teléfono inválido %j', (values) => {
  expect(checkInSchema.safeParse({ ...valid(), ...values }).success).toBe(false)
})

it('guarda teléfono unido y no conserva país telefónico como campo separado', () => {
  const result = checkInSchema.parse({
    ...valid(),
    phoneCountry: 'CL',
    phone: '9 1234 5678',
  })
  expect(result.phone).toBe('+56912345678')
  expect(result).not.toHaveProperty('phoneCountry')
  expect(result).not.toHaveProperty('phoneCountryCode')
  expect(
    checkInSchema.parse({ ...valid(), phoneCountry: 'CL', phone: '' }).phone,
  ).toBe('')
})
