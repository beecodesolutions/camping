export function formatMoney(
  amountMinor: number,
  currency: string,
  locale = 'es-CL',
  options: { hideCurrency?: boolean } = {},
): string {
  if (!Number.isSafeInteger(amountMinor)) return '—'
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  })
  const decimals = formatter.resolvedOptions().maximumFractionDigits ?? 0
  // Whole amounts have no artificial cents; historical fractions remain exact.
  const whole = amountMinor % 10 ** decimals === 0
  const amountFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : decimals,
    maximumFractionDigits: decimals,
  })
  const amount = amountMinor / 10 ** decimals
  return options.hideCurrency
    ? amountFormatter
        .formatToParts(amount)
        .filter((part) => part.type !== 'currency')
        .map((part) => part.value)
        .join('')
        .trim()
    : amountFormatter.format(amount)
}
