import { expect, it } from 'vitest'
import { formatMoney } from './money'

it('conserva pesos completos para CLP, sin dividir por cien', () => {
  expect(formatMoney(485000, 'CLP')).toBe('$485.000')
})

it('interpreta las unidades menores de una moneda con centavos', () => {
  expect(formatMoney(485000, 'MXN')).toBe(
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'MXN',
    }).format(4850),
  )
})

it('cambia formato regional sin cambiar moneda ni unidades menores', () => {
  expect(formatMoney(485000, 'CLP', 'en-US')).toBe(
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CLP',
    }).format(485000),
  )
})
