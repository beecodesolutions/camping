import { z } from 'zod'

/** null uses the currency precision; zero charges whole currency units. */
export const moneyDecimalsSchema = z.union([z.literal(0), z.null()])
export const moneySettingsSchema = z.strictObject({
  moneyDecimals: moneyDecimalsSchema,
})
export type MoneyDecimals = z.infer<typeof moneyDecimalsSchema>

export function currencyDecimals(currency: string): number {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 0
  )
}

export function moneyIncrement(
  currency: string,
  decimals: MoneyDecimals = null,
): number {
  return decimals === 0 ? 10 ** currencyDecimals(currency) : 1
}

export function hasMoneyPrecision(
  amountMinor: number,
  currency: string,
  decimals: MoneyDecimals = null,
): boolean {
  return (
    Number.isSafeInteger(amountMinor) &&
    amountMinor >= 0 &&
    amountMinor % moneyIncrement(currency, decimals) === 0
  )
}

/** Integer arithmetic, half up. Never rounds a previously frozen total implicitly. */
export function roundMoneyMinor(
  amountMinor: number,
  currency: string,
  decimals: MoneyDecimals = null,
): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0)
    throw new Error('Invalid monetary amount')
  const increment = BigInt(moneyIncrement(currency, decimals))
  const result =
    ((BigInt(amountMinor) + increment / 2n) / increment) * increment
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Monetary overflow')
  return Number(result)
}
