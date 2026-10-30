import {
  currencyDecimals,
  hasMoneyPrecision,
  type MoneyDecimals,
} from '@camping/contracts'

export function moneyInputFromMinor(
  amount: number | '',
  currency: string,
): string {
  if (amount === '' || !Number.isSafeInteger(amount)) return ''
  const decimals = currencyDecimals(currency)
  const factor = 10n ** BigInt(decimals)
  const value = BigInt(amount)
  const fraction = (value % factor)
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
  return `${value / factor}${fraction ? `.${fraction}` : ''}`
}

/** Text is major currency units; payload remains an exact integer in minor units. */
export function moneyInputToMinor(
  text: string,
  currency: string,
  decimals: MoneyDecimals = null,
): number | '' {
  if (text.trim() === '') return ''
  const match = /^(\d+)(?:[.,](\d*))?$/.exec(text.trim())
  const digits = currencyDecimals(currency)
  if (!match || (match[2]?.length ?? 0) > digits) return NaN
  const amount =
    BigInt(match[1]) * 10n ** BigInt(digits) +
    BigInt((match[2] ?? '').padEnd(digits, '0') || '0')
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) return NaN
  const value = Number(amount)
  return hasMoneyPrecision(value, currency, decimals) ? value : NaN
}
