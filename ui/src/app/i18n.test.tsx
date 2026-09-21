import { afterEach, expect, it } from 'vitest'
import { ThemeProvider } from '@mui/material'
import { lightTheme } from './theme'
import { renderToStaticMarkup } from 'react-dom/server'
import OccupancyCard from '../OccupancyCard'
import HomeHeader from '../HomeHeader'
import i18n, { i18nReady } from './i18n'

await i18nReady

afterEach(async () => {
  await i18n.changeLanguage('es-CL')
})

it('muestra textos españoles y plurales en componentes con fallback de idioma', async () => {
  await i18n.changeLanguage('fr')
  const render = (count: number) =>
    renderToStaticMarkup(
      <OccupancyCard
        activeGroups={count}
        activePeople={count}
        activeVehicles={count}
      />,
    )
  const singular = render(1)
  expect(singular).toContain('Ocupación actual')
  expect(singular).toContain('>grupo alojado<')
  expect(singular).toContain('>persona<')
  expect(singular).toContain('>vehículo<')
  const plural = render(2)
  expect(plural).toContain('>grupos alojados<')
  expect(plural).toContain('>personas<')
  expect(plural).toContain('>vehículos<')
})

it('conserva nombre del usuario y traduce saludo y acción', () => {
  const markup = renderToStaticMarkup(
    <ThemeProvider theme={lightTheme}>
      <HomeHeader
        name="Camping La Izuelina"
        greeting={i18n.t('home.morning')}
        userName=" Lucía "
      />
    </ThemeProvider>,
  )
  expect(markup).toContain('Buenos días, Lucía')
  expect(markup).toContain('Registrar ingreso')
  expect(markup).toContain('Camping La Izuelina')
})
