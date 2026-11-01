import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeProvider } from '@mui/material/styles'
import Calendar from './Calendar'
import { darkTheme, lightTheme } from '../app/theme'
import { i18nReady } from '../app/i18n'

await i18nReady
const days = {
  '2026-10-28': { tone: 'none' as const, label: 'Sin disponibilidad' },
  '2026-10-29': { tone: 'partial' as const, label: '2 libres' },
  '2026-10-30': { tone: 'free' as const, label: 'Libre' },
  '2026-10-31': { tone: 'unlimited' as const, label: 'Sin límite' },
}

it.each([lightTheme, darkTheme])(
  'preserves occupancy colors, historical selection, today and month navigation in single mode',
  (theme) => {
    const markup = renderToStaticMarkup(
      <ThemeProvider theme={theme}>
        <Calendar
          mode="single"
          today="2026-10-31"
          month="2026-10"
          selectedDate="2026-10-29"
          days={days}
          onChange={() => {}}
          onMonthChange={() => {}}
        />
      </ThemeProvider>,
    )
    for (const tone of ['free', 'partial', 'none', 'unlimited'])
      expect(markup).toContain(`calendar-${tone}`)
    expect(markup).toContain('2026-10-29: 2 libres')
    expect(markup).toContain('2026-10-31, Hoy: Sin límite')
    expect(markup).toContain('Ir al mes anterior')
    expect(markup).toContain('Ir al mes siguiente')
    expect(markup).toContain('rdp-today')
    expect(markup).toContain('::after')
    const buttons = [
      ...markup.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g),
    ].map((match) => match[0])
    expect(
      buttons.find((button) =>
        button.includes('2026-10-28: Sin disponibilidad'),
      ),
    ).not.toContain('disabled')
    expect(
      buttons.find((button) => button.includes('2026-10-27: Sin datos')),
    ).toContain('disabled')
  },
)

it('adds occupancy context to ranges without preventing checkout on a full day and still disables the past', () => {
  const markup = renderToStaticMarkup(
    <ThemeProvider theme={lightTheme}>
      <Calendar
        mode="range"
        today="2026-10-28"
        minDate="2026-10-28"
        startDate="2026-10-28"
        endDate="2026-10-30"
        days={days}
        onChange={() => {}}
      />
    </ThemeProvider>,
  )
  expect(markup).toContain('calendar-partial')
  expect(markup).toContain('rdp-range_start')
  expect(markup).toContain('rdp-range_end')
  expect(markup).toContain('::after')
  const buttons = [
    ...markup.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g),
  ].map((match) => match[0])
  expect(
    buttons.find((button) =>
      button.includes('2026-10-28, Hoy: Sin disponibilidad'),
    ),
  ).not.toContain('disabled')
  expect(
    buttons.find((button) => button.includes('2026-10-27: Sin datos')),
  ).toContain('disabled')
})
