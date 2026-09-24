export function relativeDay(
  date: string,
  today: string,
  locale: string,
): string {
  const days = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000)
  return new Intl.RelativeTimeFormat(locale, {
    numeric: days === 0 || days === -1 ? 'auto' : 'always',
  }).format(days, 'day')
}
