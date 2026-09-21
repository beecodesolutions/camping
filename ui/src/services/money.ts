export function formatMoney(
  amountMinor: number,
  currency: string,
  locale = 'es-CL',
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  })
  const decimals = formatter.resolvedOptions().maximumFractionDigits ?? 0
  return formatter.format(amountMinor / 10 ** decimals)
}
