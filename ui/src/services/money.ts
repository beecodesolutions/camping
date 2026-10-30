export function formatMoney(
  amountMinor: number,
  currency: string,
  locale = 'es-CL',
): string {
  if (!Number.isSafeInteger(amountMinor)) return '—'
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  })
  const decimals = formatter.resolvedOptions().maximumFractionDigits ?? 0
  // Whole amounts have no artificial cents; historical fractions remain exact.
  const whole = amountMinor % 10 ** decimals === 0
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : decimals,
    maximumFractionDigits: decimals,
  }).format(amountMinor / 10 ** decimals)
}
