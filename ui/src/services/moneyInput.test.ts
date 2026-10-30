import { expect, it } from 'vitest'
import { moneyInputFromMinor, moneyInputToMinor } from './moneyInput'

it('edita pesos MXN sin exigir al operador convertir centavos', () => {
  expect(moneyInputFromMinor(120000, 'MXN')).toBe('1200')
  expect(moneyInputToMinor('1200', 'MXN', 0)).toBe(120000)
})
it('acepta punto o coma decimal al habilitar centavos, con conversión exacta', () => {
  expect(moneyInputToMinor('0.29', 'MXN', null)).toBe(29)
  expect(moneyInputToMinor('1200,50', 'MXN', null)).toBe(120050)
  expect(moneyInputFromMinor(120050, 'MXN')).toBe('1200.5')
})
it('rechaza centavos deshabilitados, negativos, exponentes y precisión excesiva sin redondear', () => {
  for (const value of ['1200.50', '-1', '1e3', '1.001'])
    expect(moneyInputToMinor(value, 'MXN', 0)).toBeNaN()
  expect(moneyInputToMinor('1.001', 'MXN', null)).toBeNaN()
})
it('conserva los pesos completos de CLP y monedas de tres decimales', () => {
  expect(moneyInputToMinor('1200', 'CLP', null)).toBe(1200)
  expect(moneyInputToMinor('1.234', 'KWD', null)).toBe(1234)
})
it('valida enteros seguros sin perder precisión con decimales binarios', () => {
  expect(moneyInputToMinor('90071992547409.91', 'MXN', null)).toBe(
    Number.MAX_SAFE_INTEGER,
  )
  expect(moneyInputToMinor('90071992547409.92', 'MXN', null)).toBeNaN()
  expect(moneyInputFromMinor(Number.MAX_SAFE_INTEGER, 'MXN')).toBe(
    '90071992547409.91',
  )
  expect(moneyInputToMinor('', 'MXN', null)).toBe('')
})
